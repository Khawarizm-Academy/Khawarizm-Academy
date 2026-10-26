# Video ingest <- Management command
# Upload → (package → store | stage): pushes the source into the Telegram
# channel, then builds the AES-128 HLS ladder with FFmpeg when the host can —
# or stages the source only, so "no FFmpeg" never blocks putting a video away.
# Errors land on the asset row (status=error) so the admin can see what happened.
from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
from typing import Any

from django.conf import settings

from features.common.choices import VideoStatus
from features.videohosting import packaging
from features.videohosting.models import VideoAsset, VideoRendition, VideoSegment
from features.videohosting.providers.telegram import TelegramMediaService


# The ingest shapes: "auto" packages when the host can, "force" requires the
# packaging host, "never" stages the source so it can be packaged from an FFmpeg host.
PACKAGE_MODES = ("auto", "force", "never")


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
) -> VideoAsset:
    """Run one ingest and return the asset row; raises on failure except as noted."""
    source = Path(file_path)
    asset, _ = VideoAsset.objects.get_or_create(
        slug=slug, defaults={"created_by": created_by, "title": title or slug}
    )
    asset.status = VideoStatus.PROCESSING
    asset.error_message = ""
    asset.save(update_fields=["status", "error_message", "updated_at"])

    try:
        service = TelegramMediaService()
        if not _should_package(package):
            # Stage the source only: retrieves fine later, no HLS outputs yet.
            source_fields = asyncio.run(_upload_source(service, asset, source))
            asset.renditions.all().delete()  # a re-staged asset has no HLS outputs anymore
            asset.master_playlist = ""
            for field, value in {**source_fields, "master_playlist": "", "status": VideoStatus.STAGED}.items():
                setattr(asset, field, value)
            asset.save(update_fields=[*source_fields, "master_playlist", "status", "updated_at"])
        else:
            packaging.require_packaging_host()

            source_fields = asyncio.run(_upload_source(service, asset, source))
            result = packaging.package_video(str(source))
            try:
                renditions = asyncio.run(_upload_package(service, asset.slug, result))
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
    except Exception as exc:  # surface every failure on the row, then re-raise for the operator
        asset.status = VideoStatus.ERROR
        asset.error_message = str(exc)[:2000]
        asset.save(update_fields=["status", "error_message", "updated_at"])
        raise
    finally:
        if remove_source:
            source.unlink(missing_ok=True)

    return asset


async def _upload_source(service: TelegramMediaService, asset: VideoAsset, source: Path) -> dict[str, Any]:
    """Store the original file so the video can be re-packaged without a re-upload.

    Network only — the row write happens back in the sync caller, since ORM
    calls are forbidden inside a running event loop.
    """
    uploaded = await service.upload_file(str(source), caption=f"source · {asset.slug}")
    parts = uploaded["parts"]
    # Re-packaging reads the parts in order; the first id is the durable handle.
    return {
        "source_message_id": parts[0]["message_id"],
        "source_size_bytes": sum(part["size_bytes"] for part in parts),
        "source_file_name": source.name,
    }


async def _upload_package(
    service: TelegramMediaService, slug: str, result: packaging.PackagingResult
) -> list[dict[str, Any]]:
    """Upload every segment and return the rendition payloads to persist.

    Network only — rows are created back in the sync caller.
    """
    renditions = []
    for packaged in result.renditions:
        segments = []
        for index, segment_path in enumerate(packaged.segments):
            uploaded = await service.upload_file(str(segment_path), caption=f"{slug} · {packaged.quality} · {index}")
            part = uploaded["parts"][0]
            segments.append((index, part))

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
