# Video ingest <- Management command
# Upload → package → store: pushes the source into the Telegram channel, builds
# the AES-128 HLS ladder with FFmpeg, and uploads every encrypted segment as a
# document message. Errors land on the asset row (status=error) so the admin can
# see what happened; a clean run marks the asset ready.
from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
from typing import Any

from features.common.choices import VideoStatus
from features.videohosting import packaging
from features.videohosting.models import VideoAsset, VideoRendition, VideoSegment
from features.videohosting.telegram import TelegramMediaService


def ingest_file(
    file_path: str | Path,
    slug: str,
    title: str = "",
    created_by: Any = None,
    *,
    remove_source: bool = False,
) -> VideoAsset:
    """Run one full ingest and return the asset row; raises on failure."""
    source = Path(file_path)
    asset, _ = VideoAsset.objects.get_or_create(
        slug=slug, defaults={"created_by": created_by, "title": title or slug}
    )
    asset.status = VideoStatus.PROCESSING
    asset.error_message = ""
    asset.save(update_fields=["status", "error_message", "updated_at"])

    try:
        packaging.require_packaging_host()

        service = TelegramMediaService()        
        asyncio.run(_upload_source(service, asset, source))
        result = packaging.package_video(str(source))
        try:
            asyncio.run(_upload_package(service, asset, result))
        finally:
            shutil.rmtree(result.work_dir, ignore_errors=True)  # segments are in Telegram now

        asset.master_playlist = result.master_playlist
        asset.duration_seconds = result.duration_seconds
        asset.status = VideoStatus.READY
        asset.save(update_fields=["master_playlist", "duration_seconds", "status", "updated_at"])
    except Exception as exc:  # surface every failure on the row, then re-raise for the operator
        asset.status = VideoStatus.ERROR
        asset.error_message = str(exc)[:2000]
        asset.save(update_fields=["status", "error_message", "updated_at"])
        raise
    finally:
        if remove_source:
            source.unlink(missing_ok=True)

    return asset


async def _upload_source(service: TelegramMediaService, asset: VideoAsset, source: Path) -> None:
    """Store the original file so the video can be re-packaged without a re-upload."""
    uploaded = await service.upload_file(str(source), caption=f"source · {asset.slug}")
    parts = uploaded["parts"]
    # Re-packaging reads the parts in order; the first id is the durable handle.
    asset.source_message_id = parts[0]["message_id"]
    asset.source_size_bytes = sum(part["size_bytes"] for part in parts)
    asset.source_file_name = source.name
    asset.save(update_fields=["source_message_id", "source_size_bytes", "source_file_name", "updated_at"])


async def _upload_package(service: TelegramMediaService, asset: VideoAsset, result: packaging.PackagingResult) -> None:
    """Upload every segment, then persist the renditions whose keys it carries."""
    for packaged in result.renditions:
        segments = []
        for index, segment_path in enumerate(packaged.segments):
            uploaded = await service.upload_file(str(segment_path), caption=f"{asset.slug} · {packaged.quality} · {index}")
            part = uploaded["parts"][0]
            segments.append((index, part))

        rendition = VideoRendition.objects.create(
            asset=asset,
            quality=packaged.quality,
            width=packaged.width,
            height=packaged.height,
            bandwidth_bps=packaged.bandwidth_bps,
            segment_seconds=packaging.SEGMENT_SECONDS,
            playlist=packaged.playlist_text,
            aes_key_hex=packaged.aes_key_hex,
            segment_count=len(packaged.segments),
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
                for index, part in segments
            ]
        )
