# Video ingest <- Management command
# Upload → (package → store | stage): pushes the source into the Telegram
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
from features.videohosting.providers import default_code
from features.videohosting.providers.google_drive import GoogleDriveService
from features.videohosting.providers.telegram import TelegramMediaService


# The ingest shapes: "auto" packages when the host can, "force" requires the
# packaging host, "never" stages the source so it can be packaged from an FFmpeg host.
PACKAGE_MODES = ("auto", "force", "never")

# The admin progress bar's weighted timeline: source upload → packaging →
# segment publishing, so one percent scale covers the whole ingest.
SOURCE_SPAN = (0, 50)
PACKAGING_SPAN = (50, 75)
SEGMENTS_SPAN = (75, 99)
# A source-only store (Drive) has no later legs — its bytes carry the full bar.
FULL_SPAN = (0, 99)
SECONDS_BETWEEN_FLUSHES = 1.0


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
        """Map one provider byte tick into the given span of the timeline."""
        if total <= 0:
            return
        low, high = span
        self.tick(int(low + (high - low) * min(done / total, 1.0)), "uploading")

    def publish_segment(self, index: int, total: int) -> None:
        """The segment ladder: one tick per uploaded segment."""
        low, high = SEGMENTS_SPAN
        if total <= 0:
            self.tick(high, "publishing")
            return
        self.tick(int(low + (high - low) * index / total), "publishing")

    def finish(self) -> None:
        """Stop the flusher and land the final 100% write on this thread."""
        self.tick(100, "")
        self._stopping.set()
        if self._thread.is_alive():
            self._thread.join(timeout=SECONDS_BETWEEN_FLUSHES * 2)
        VideoAsset.objects.filter(pk=self.asset_id).exclude(status=VideoStatus.ERROR).update(progress=100, stage="")

    def abandon(self) -> None:
        """Stop flushing without the final write — the error handler owns the row."""
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
            connection.close()  # the thread owned this connection for its lifetime

    def _write(self, state: tuple[int, str]) -> None:
        percent, stage = state
        VideoAsset.objects.filter(pk=self.asset_id).update(progress=percent, stage=stage)


def _should_package(package: str) -> bool:
    """The packaging decision: force always, never skips, auto follows the host."""
    if package == "force":
        return True
    if package == "never":
        return False
    return packaging.ffmpeg_available() and not settings.IS_VERCEL


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
    """Run one ingest and return the asset row; raises on failure except as noted.

    With `track_progress`, a ProgressTracker runs beside the upload and the
    admin's progress bar follows the source bytes, packaging, and segments.
    """
    source = Path(file_path)
    asset, _ = VideoAsset.objects.get_or_create(
        slug=slug, defaults={"created_by": created_by, "title": title or slug}
    )
    # The chosen provider decides the flow; an unset provider takes the configured default.
    provider_code = asset.provider.code if asset.provider else default_code()
    asset.status = VideoStatus.PROCESSING
    asset.error_message = ""
    asset.save(update_fields=["status", "error_message", "updated_at"])

    tracker = ProgressTracker(asset.id) if track_progress else None
    if tracker is not None:
        tracker.start()
    try:
        client_name = asset.source_file_name  # set by the admin upload endpoint, empty otherwise
        if provider_code == "google_drive":
            # Drive stores the source for a later packaging run — no HLS here.
            service = GoogleDriveService()
            uploaded = service.upload_file(str(source), caption=f"source · {asset.slug}", **_bytes_report_arg(service, tracker, FULL_SPAN))
            part = uploaded["parts"][0]
            asset.renditions.all().delete()  # a re-uploaded asset has no HLS outputs anymore
            drive_fields = {
                "source_file_id": str(part["file_id"]),
                "source_size_bytes": part["size_bytes"],
                "source_file_name": client_name or source.name,
                "master_playlist": "",
                "status": VideoStatus.STAGED,
            }
            for field, value in drive_fields.items():
                setattr(asset, field, value)
            asset.save(update_fields=[*drive_fields, "updated_at"])
        elif provider_code == "telegram":
            service = TelegramMediaService()
            bytes_arg = _bytes_report_arg(service, tracker, SOURCE_SPAN)  # empty for every stand-in service
            if not _should_package(package):
                # Stage the source only: retrieves fine later, no HLS outputs yet.
                source_fields = asyncio.run(_upload_source(service, asset, source, bytes_arg, keep_name=client_name))
                asset.renditions.all().delete()  # a re-staged asset has no HLS outputs anymore
                asset.master_playlist = ""
                for field, value in {**source_fields, "master_playlist": "", "status": VideoStatus.STAGED}.items():
                    setattr(asset, field, value)
                asset.save(update_fields=[*source_fields, "master_playlist", "status", "updated_at"])
            else:
                packaging.require_packaging_host()
                if tracker is not None:
                    tracker.tick(PACKAGING_SPAN[0], "packaging")

                source_fields = asyncio.run(_upload_source(service, asset, source, bytes_arg, keep_name=client_name))
                result = packaging.package_video(str(source))
                try:
                    if tracker is not None:
                        tracker.tick(PACKAGING_SPAN[1], "packaging")
                    renditions = asyncio.run(_upload_package(service, asset.slug, result, tracker))
                finally:
                    shutil.rmtree(result.work_dir, ignore_errors=True)  # segments are in Telegram now

                for field, value in {
                    **source_fields,
                    "master_playlist": result.master_playlist,
                    "duration_seconds": result.duration_seconds,
                    "status": VideoStatus.READY,
                }.items():
                    setattr(asset, field, value)
                asset.save(update_fields=[*source_fields, "master_playlist", "duration_seconds", "status", "updated_at"])
                _store_renditions(asset, renditions)
        else:
            raise ValueError(f"لا يوجد مسار رفع للمزود: {provider_code}")
    except Exception as exc:  # surface every failure on the row, then re-raise for the operator
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


def _bytes_report_arg(
    service: object, tracker: ProgressTracker | None, span: tuple[int, int]
) -> dict[str, Callable[[int, int], None]]:
    """Byte ticks go only to a service that accepts them (every real one does)."""
    if tracker is None:
        return {}
    parameter = inspect.signature(service.upload_file).parameters.get("on_bytes")
    return {"on_bytes": lambda done, total: tracker.bump_bytes(done, total, span)} if parameter else {}


async def _upload_source(
    service: TelegramMediaService,
    asset: VideoAsset,
    source: Path,
    upload_args: dict[str, Callable[[int, int], None]] | None = None,
    keep_name: str = "",
) -> dict[str, Any]:
    """Store the original file so the video can be re-packaged without a re-upload.

    Network only — the row write happens back in the sync caller, since ORM
    calls are forbidden inside a running event loop.
    """
    uploaded = await service.upload_file(str(source), caption=f"source · {asset.slug}", **(upload_args or {}))
    parts = uploaded["parts"]
    # Re-packaging reads the parts in order; the first id is the durable handle.
    # The temp worker file's name loses to any client-stamped one (admin uploads).
    return {
        "source_message_id": parts[0]["message_id"],
        "source_size_bytes": sum(part["size_bytes"] for part in parts),
        "source_file_name": keep_name or source.name,
    }


async def _upload_package(
    service: TelegramMediaService,
    slug: str,
    result: packaging.PackagingResult,
    tracker: ProgressTracker | None = None,
) -> list[dict[str, Any]]:
    """Upload every segment and return the rendition payloads to persist.

    Network only — rows are created back in the sync caller.
    """
    total_segments = sum(len(packaged.segments) for packaged in result.renditions)
    renditions = []
    for packaged in result.renditions:
        segments = []
        for index, segment_path in enumerate(packaged.segments):
            uploaded = await service.upload_file(str(segment_path), caption=f"{slug} · {packaged.quality} · {index}")
            part = uploaded["parts"][0]
            segments.append((index, part))
            if tracker is not None:
                published += 1
                tracker.publish_segment(published, total_segments)

        renditions.append({
            "quality": packaged.quality,
            "width": packaged.width,
            "height": packaged.height,
            "bandwidth_bps": packaged.bandwidth_bps,
            "playlist": packaged.playlist_text,
            "aes_key_hex": packaged.aes_key_hex,
            "segment_count": len(packaged.segments),
            "segments": segments,
        })
    return renditions


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
