# Video ingest <- Management command / admin console upload handler.
# Upload → (package → store | raw): resolves playback before pushing the source
# into the provider, then builds the AES-128 HLS ladder when the plan requires it.
# Errors land on the asset row (status=error) so the admin can see what happened.
from __future__ import annotations

import asyncio
import inspect
import shutil
import threading
import time
from collections.abc import Callable
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from django.db import connection
from django.db.utils import OperationalError

from features.common.choices import VideoStatus
from features.videohosting import packaging, services
from features.videohosting.models import VideoAsset, VideoRendition, VideoSegment, VideoSystemConfig
from features.videohosting.playback_plan import PROVIDER_REQUIRES_PACKAGING, resolve_playback_plan
from features.videohosting.providers import default_code, spec_for

# The legacy CLI choices are normalized by playback_plan (``force`` aliases
# ``always``); unsupported plans fail before any provider bytes are uploaded.
PACKAGE_MODES = ("auto", "force", "never")

# The admin progress bar's weighted timeline: source upload → packaging →
# segment publishing, so one percent scale covers the whole ingest.
SOURCE_SPAN = (0, 50)
PACKAGING_SPAN = (50, 75)
SEGMENTS_SPAN = (75, 99)
# A source-only store (Drive) has no later legs — its bytes carry the full bar.
FULL_SPAN = (0, 99)
SECONDS_BETWEEN_FLUSHES = 1.0


# The tracker: merges provider byte ticks into the asset's one progress bar.
class ProgressTracker:
    """Merges provider byte ticks into the asset's one progress bar.

    Ticks arrive inside the provider's event loop (sync ORM is forbidden
    there), so they only mutate state; a small flusher thread writes the row
    on its own connection — throttled, and closed when the thread stops.
    The tracker owns ONLY progress+stage: asset.status belongs to the ingest
    saves (processing → ready/error), so the two never race.
    """

    def __init__(self, asset_id: str) -> None:
        self.asset_id = asset_id
        self._lock = threading.Lock()
        self._state: tuple[int, str] = (0, "uploading")
        self._flushed: tuple[int, str] | None = None
        self._stopping = threading.Event()
        self._thread = threading.Thread(target=self._flush_loop, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def tick(self, percent: int, stage: str) -> None:
        with self._lock:
            self._state = (max(percent, self._state[0]), stage)

    def bump_bytes(self, done: int, total: int, span: tuple[int, int]) -> None:
        if total <= 0:
            return
        low, high = span
        self.tick(int(low + (high - low) * min(done / total, 1.0)), "uploading")

    def publish_segment(self, index: int, total: int) -> None:
        low, high = SEGMENTS_SPAN
        if total <= 0:
            self.tick(high, "publishing")
            return
        self.tick(int(low + (high - low) * index / total), "publishing")

    def finish(self) -> None:
        self.tick(100, "")
        self._stopping.set()
        if self._thread.is_alive():
            self._thread.join(timeout=SECONDS_BETWEEN_FLUSHES * 2)
        VideoAsset.objects.filter(pk=self.asset_id).exclude(status=VideoStatus.ERROR).update(progress=100, stage="")

    def abandon(self) -> None:
        self._stopping.set()
        if self._thread.is_alive():
            self._thread.join(timeout=SECONDS_BETWEEN_FLUSHES * 2)

    def _flush_loop(self) -> None:
        try:
            last_written: tuple[int, str] | None = None
            while not self._stopping.is_set():
                with self._lock:
                    state = self._state
                if state != last_written:
                    try:
                        self._write(state)
                        # Mark written only on success — a failed tick is
                        # retried with fresh state on the next one.
                        last_written = state
                    except OperationalError:
                        # Progress writes are best-effort: a busy database
                        # (the parallel test suite, a loaded dev server) can
                        # hold the lock past the busy timeout. The terminal
                        # state comes from the ingest path itself, so the
                        # flusher only ever falls a little behind.
                        pass
                time.sleep(SECONDS_BETWEEN_FLUSHES)
        finally:
            with self._lock:
                state = self._state
            if state != last_written:
                self._write(state)
            connection.close()

    def _write(self, state: tuple[int, str]) -> None:
        percent, stage = state
        VideoAsset.objects.filter(pk=self.asset_id).update(progress=percent, stage=stage)


# A compatibility shape for callers that used to ask only whether packaging
# was possible. The ingest path always passes the real provider spec and row.
_COMPAT_PACKAGING_SPEC = SimpleNamespace(
    kind="storage",
    capabilities={"playback": "hls_token"},
    needs=frozenset(),
    ingest=SimpleNamespace(store_package=lambda *_args, **_kwargs: None),
)


def _resolve_plan(spec, package: str, provider_row=None):
    """Resolve one upload's plan from stored policy, global config, and host facts."""
    return resolve_playback_plan(
        spec,
        package,
        services.host_capabilities(),
        VideoSystemConfig.get_instance(),
        provider_row,
    )


def _should_package(package: str, spec=None, provider_row=None) -> bool:
    """Compatibility helper backed by the canonical playback-plan resolver."""
    return _resolve_plan(spec or _COMPAT_PACKAGING_SPEC, package, provider_row).package


def raw_mode_is_playable(spec, package: str, provider_row=None) -> bool:
    """Compatibility helper backed by the canonical playback-plan resolver."""
    return _resolve_plan(spec, package, provider_row).mode == "raw"


def _playback_fields(mode: str) -> dict[str, str]:
    """Return the stored playback contract for a resolved playable mode."""
    return {
        "hls": {"playback_mode": "hls", "protection": "encrypted"},
        "raw": {"playback_mode": "raw", "protection": "gated"},
    }[mode]


# The public track: one ingest, one asset row; raises on failure except as noted.
def ingest_file(
    file_path: str | Path,
    slug: str,
    title: str = "",
    created_by: Any = None,
    *,
    remove_source: bool = False,
    package: str = "auto",
    track_progress: bool = False,
) -> VideoAsset:
    """Run one ingest and return the asset row; raises on failure except as noted."""
    source = Path(file_path)
    asset, _ = VideoAsset.objects.get_or_create(slug=slug, defaults={"created_by": created_by, "title": title or slug})

    # Resolve the provider spec once — the rest delegates entirely to it.
    provider_code = asset.provider.code if asset.provider else default_code()
    spec = spec_for(provider_code)
    if spec is None:
        raise ValueError(f"لا يوجد مسار رفع للمزود: {provider_code}")

    asset.status = VideoStatus.PROCESSING
    asset.error_message = ""
    asset.save(update_fields=["status", "error_message", "updated_at"])

    tracker = ProgressTracker(asset.id) if track_progress else None
    if tracker is not None:
        tracker.start()
    try:
        plan = _resolve_plan(spec, package, asset.provider)
        if plan.mode in {"embed", "external", "refused"}:
            raise ValueError(PROVIDER_REQUIRES_PACKAGING)
        if spec.ingest is None:
            raise ValueError(PROVIDER_REQUIRES_PACKAGING)

        store_package = getattr(spec.ingest, "store_package", None)
        svc = _make_service(spec)
        bytes_arg = _report_arg(svc, tracker, FULL_SPAN if plan.mode == "raw" else SOURCE_SPAN)
        stored = _await_if_needed(spec.ingest.store_source(svc, asset, source, bytes_arg))

        fields = {"master_playlist": "", **_playback_fields(plan.mode)}
        renditions = []
        status = VideoStatus.READY
        if plan.package:
            if store_package is None:
                raise ValueError(PROVIDER_REQUIRES_PACKAGING)
            packaging.require_packaging_host()
            if tracker is not None:
                tracker.tick(PACKAGING_SPAN[0], "packaging")

            result = packaging.package_video(str(source))
            try:
                pkg = _await_if_needed(store_package(svc, slug, result, tracker))
            finally:
                shutil.rmtree(result.work_dir, ignore_errors=True)

            fields.update(
                {
                    "master_playlist": result.master_playlist,
                    "duration_seconds": result.duration_seconds,
                }
            )
            renditions = pkg

        # Persist fields onto the row.
        for k, v in stored.items():
            setattr(asset, k, v)
        for k, v in fields.items():
            setattr(asset, k, v)
        asset.renditions.all().delete()  # re-uploaded assets need a fresh ladder
        asset.status = status
        save_keys = [*stored.keys(), *fields.keys(), "status", "updated_at"]
        asset.save(update_fields=save_keys)

        # Create ORM rows for each published rendition.
        if renditions:
            _store_renditions(asset, renditions)

    except Exception as exc:
        if tracker is not None:
            tracker.abandon()
        asset.status = VideoStatus.ERROR
        asset.error_message = str(exc)[:2000]
        asset.save(update_fields=["status", "error_message", "updated_at"])
        raise
    else:
        if tracker is not None:
            tracker.finish()
            asset.progress, asset.stage = 100, ""
    finally:
        if remove_source:
            source.unlink(missing_ok=True)
    return asset


# The service re-exports are the ingest test seam — tests patch ingest.TelegramMediaService.
from features.videohosting.providers.google_drive import GoogleDriveService  # noqa: E402, F401
from features.videohosting.providers.telegram import TelegramMediaService  # noqa: E402, F401


def _await_if_needed(coro_or_val):
    """Return the value now, or await a coroutine in the running context."""
    if asyncio.iscoroutine(coro_or_val):
        return asyncio.run(coro_or_val)
    return coro_or_val


def _report_arg(
    service: object, tracker: ProgressTracker | None, span: tuple[int, int]
) -> dict[str, Callable[[int, int], None]]:
    """Byte ticks go only to a service that accepts them."""
    if tracker is None:
        return {}
    param = inspect.signature(service.upload_file).parameters.get("on_bytes")
    return {"on_bytes": lambda d, t: tracker.bump_bytes(d, t, span)} if param else {}


def _make_service(spec) -> object:
    """Instantiate the hosting provider's network client."""
    hook = spec.ingest.store_source
    hook_globals = getattr(hook, "__globals__", {})
    service_type = next(
        (
            value
            for value in hook_globals.values()
            if isinstance(value, type) and callable(getattr(value, "upload_file", None))
        ),
        None,
    )
    if service_type is None:
        raise ValueError("Provider ingest hook does not expose a media service")
    # Keep the historical ingest-module test seam while deriving the type from
    # the provider hook, so new providers need no code branch here.
    return globals().get(service_type.__name__, service_type)()


def _store_renditions(asset: VideoAsset, renditions: list[dict[str, Any]]) -> None:
    """Persist one row per rendition, with its segment uploads beside it."""
    for payload in renditions:
        rendition = VideoRendition.objects.create(
            asset=asset,
            quality=payload["quality"],
            width=payload["width"],
            height=payload["height"],
            bandwidth_bps=payload["bandwidth_bps"],
            segment_seconds=packaging.SEGMENT_SECONDS,
            playlist=payload["playlist"],
            aes_key_hex=payload["aes_key_hex"],
            segment_count=payload["segment_count"],
        )
        VideoSegment.objects.bulk_create(
            [
                VideoSegment(
                    rendition=rendition,
                    index=index,
                    message_id=part["message_id"],
                    file_id=part["file_id"],
                    size_bytes=part["size_bytes"],
                )
                for index, part in payload["segments"]
            ]
        )
