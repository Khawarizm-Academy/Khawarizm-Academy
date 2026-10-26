# Video ingest <- Management command / admin console upload handler.
# Upload → (package → store | stage): pushes the source into the provider
# channel, then builds the AES-128 HLS ladder with FFmpeg when the host can —
# or stages the source only, so "no FFmpeg" never blocks putting a video away.
# Errors land on the asset row (status=error) so the admin can see what happened.
from __future__ import annotations

import asyncio
import inspect
import shutil
import threading
import time
from pathlib import Path
from typing import Any, Callable

from django.conf import settings
from django.db import connection

from features.common.choices import VideoStatus
from features.videohosting import packaging
from features.videohosting.models import VideoAsset, VideoRendition, VideoSegment
from features.videohosting.providers import default_code, spec_for


# The ingest shapes: "auto" packages when the host can, "force" requires the
# packaging host, "never" stages the source so it can be packaged later.
PACKAGE_MODES = ("auto", "force", "never")

# The admin progress bar's weighted timeline: source upload → packaging →
# segment publishing, so one percent scale covers the whole ingest.
SOURCE_SPAN = (0, 50)
PACKAGING_SPAN = (50, 75)
SEGMENTS_SPAN = (75, 99)
# A source-only store (Drive) has no later legs — its bytes carry the full bar.
FULL_SPAN = (0, 99)
SECONDS_BETWEEN_FLUSHES = 1.0


# ── ProgressTracker ────────────────────────────────────────────────────
class ProgressTracker:
    """Merges provider byte ticks into the asset's one progress bar.

    Ticks arrive inside the provider's event loop (sync ORM is forbidden
    there), so they only mutate state; a small flusher thread writes the row
    on its own connection — throttled, and closed when the thread stops.
    The tracker owns ONLY progress+stage: asset.status belongs to the ingest
    saves (processing → ready/staged/error), so the two never race.
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
                    self._write(state)
                    last_written = state
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


# ── packaging decision ────────────────────────────────────────────────
def _should_package(package: str) -> bool:
    if package == "force":
        return True
    if package == "never":
        return False
    return packaging.ffmpeg_available() and not settings.IS_VERCEL


# ── public API ─────────────────────────────────────────────────────────
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
    asset, _ = VideoAsset.objects.get_or_create(
        slug=slug, defaults={"created_by": created_by, "title": title or slug}
    )

    # Resolve the provider spec once — the rest delegates entirely to it.
    provider_code = asset.provider.code if asset.provider else default_code()
    spec = spec_for(provider_code)
    if spec is None:
        raise ValueError(f"لا يوجد مسار رفع للمزود: {provider_code}")
    if spec.ingest is None:
        raise ValueError(f"المزود {spec.name} لا يدعم الرفع.")

    asset.status = VideoStatus.PROCESSING
    asset.error_message = ""
    asset.save(update_fields=["status", "error_message", "updated_at"])

    tracker = ProgressTracker(asset.id) if track_progress else None
    if tracker is not None:
        tracker.start()
    try:
        client_name = getattr(asset, "source_file_name", "") or ""

        if not hasattr(spec.ingest, "store_package"):
            # Staged-only path (Google Drive): one upload leg.
            svc = _make_service(spec)
            bytes_arg = _report_arg(svc, tracker, FULL_SPAN)
            stored = _await_if_needed(spec.ingest.store_source(svc, asset, source, bytes_arg))
            fields = {"master_playlist": ""}
            status = VideoStatus.STAGED
            renditions = []
        else:
            # Full path (Telegram): source, optionally package.
            svc = _make_service(spec)
            bytes_arg = _report_arg(svc, tracker, SOURCE_SPAN)
            stored = _await_if_needed(spec.ingest.store_source(svc, asset, source, bytes_arg))

            if not _should_package(package):
                # Stage only — retrieve fine later, no HLS outputs yet.
                fields = {"master_playlist": ""}
                status = VideoStatus.STAGED
                renditions = []
            else:
                packaging.require_packaging_host()
                if tracker is not None:
                    tracker.tick(PACKAGING_SPAN[0], "packaging")

                result = packaging.package_video(str(source))
                try:
                    pkg = _await_if_needed(spec.ingest.store_package(svc, slug, result, tracker))
                finally:
                    shutil.rmtree(result.work_dir, ignore_errors=True)

                fields = {
                    "master_playlist": result.master_playlist,
                    "duration_seconds": result.duration_seconds,
                }
                status = VideoStatus.READY
                renditions = pkg

        # Persist fields onto the row.
        for k, v in stored.items():
            setattr(asset, k, v)
        for k, v in fields.items():
            setattr(asset, k, v)
        asset.renditions.all().delete()  # re-uploaded assets need a fresh ladder
        asset.status = status
        save_keys = [*stored.keys(), *fields.keys(), "status", "updated_at"]
        if "duration_seconds" in fields:
            save_keys.append("duration_seconds")
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


# Re-exports kept at module level so tests can mock via ingest.TelegramMediaService.
from features.videohosting.providers.telegram import TelegramMediaService  # noqa: E402,F401
from features.videohosting.providers.google_drive import GoogleDriveService  # noqa: E402,F401


# ── utility ────────────────────────────────────────────────────────────
def _await_if_needed(coro_or_val):
    """Return the value now, or await a coroutine in the running context."""
    if asyncio.iscoroutine(coro_or_val):
        return asyncio.run(coro_or_val)
    return coro_or_val


def _report_arg(service: object, tracker: "ProgressTracker | None", span: tuple[int, int]) -> dict[str, Callable[[int, int], None]]:
    """Byte ticks go only to a service that accepts them."""
    if tracker is None:
        return {}
    param = inspect.signature(service.upload_file).parameters.get("on_bytes")
    return {"on_bytes": lambda d, t: tracker.bump_bytes(d, t, span)} if param else {}


def _make_service(spec) -> object:
    """Instantiate the hosting provider's network client."""
    if spec.code == "telegram":
        return TelegramMediaService()
    if spec.code == "google_drive":
        return GoogleDriveService()
    raise ValueError(f"Unknown provider service: {spec.code}")


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
        VideoSegment.objects.bulk_create([
            VideoSegment(
                rendition=rendition,
                index=index,
                message_id=part["message_id"],
                file_id=part["file_id"],
                size_bytes=part["size_bytes"],
            )
            for index, part in payload["segments"]
        ])
