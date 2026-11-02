"""Recover stale video packages from retained provider sources."""

from __future__ import annotations

import fcntl
import re
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from features.common.choices import VideoStatus
from features.videohosting import ingest
from features.videohosting.models import VideoAsset
from features.videohosting.providers import default_code, spec_for

DEFAULT_AGE_MINUTES = 15
MAX_AGE_MINUTES = 7 * 24 * 60
DEFAULT_LIMIT = 50
MAX_LIMIT = 500
LOCK_NAME = ".package_pending.lock"


def _safe_error(error: Exception) -> str:
    """Keep operator state useful without persisting provider URLs."""
    detail = re.sub(r"https?://[^\s]+", "[provider uri redacted]", str(error))
    detail = detail.replace("upload_uri", "provider upload reference")
    return f"package recovery failed: {detail[:1800]}"


def _spool_directory() -> Path | None:
    configured = str(getattr(settings, "VIDEO_SPOOL_DIR", "") or "").strip()
    if not configured:
        return None
    path = Path(configured)
    if not path.is_absolute() or not path.is_dir():
        return None
    return path


@contextmanager
def _spool_lock(spool: Path) -> Iterator[bool]:
    """Hold a non-blocking process lock for the lifetime of one command run."""
    try:
        handle = (spool / LOCK_NAME).open("a+")
    except OSError:
        yield False
        return
    try:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError, OSError:
            yield False
            return
        try:
            yield True
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    finally:
        handle.close()


def _source_handle(asset, spec):
    """Return a provider-owned downloader only when the asset has source data."""
    upload = getattr(spec, "upload", None)
    downloader = getattr(upload, "download_source", None)
    if not callable(downloader):
        return None
    if not any(getattr(asset, field, None) for field in ("source_file_id", "source_message_id")):
        return None
    return downloader


def _package_downloader(asset):
    """Resolve both source recovery and package capability from provider data."""
    provider_code = asset.provider.code if asset.provider_id and asset.provider else default_code()
    spec = spec_for(provider_code)
    if spec is None:
        return None
    downloader = _source_handle(asset, spec)
    if downloader is None:
        return None
    plan = ingest._resolve_plan(spec, "force", asset.provider)
    if not plan.package:
        return None
    return downloader


def _claim(asset_id, cutoff):
    """Claim one row only if its status and stale timestamp are still unchanged."""
    with transaction.atomic():
        asset = VideoAsset.objects.select_for_update().select_related("provider").get(pk=asset_id)
        if asset.status not in (VideoStatus.PROCESSING, VideoStatus.STAGED) or asset.updated_at >= cutoff:
            return None
        downloader = _package_downloader(asset)
        if downloader is None:
            return None
        old_status = asset.status
        updated = VideoAsset.objects.filter(
            pk=asset.pk,
            status=old_status,
            updated_at=asset.updated_at,
        ).update(
            status=VideoStatus.PROCESSING,
            stage="packaging",
            error_message="",
            updated_at=timezone.now(),
        )
        if updated != 1:
            return None
        asset.status = VideoStatus.PROCESSING
        asset.stage = "packaging"
        asset.error_message = ""
        return asset, downloader


def _source_suffix(asset) -> str:
    suffix = Path(str(getattr(asset, "source_file_name", "") or "")).suffix
    return suffix if suffix and len(suffix) <= 12 else ".source"


class Command(BaseCommand):
    help = "Re-drive stale processing/staged video assets through the canonical HLS packaging ingest."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--age-minutes",
            "--older-than-minutes",
            "--age",
            "--older-than",
            dest="age_minutes",
            type=int,
            default=DEFAULT_AGE_MINUTES,
            help=f"Only assets older than this many minutes (0-{MAX_AGE_MINUTES}; default {DEFAULT_AGE_MINUTES}).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_LIMIT,
            help=f"Maximum rows to inspect (1-{MAX_LIMIT}; default {DEFAULT_LIMIT}).",
        )

    def handle(self, *args, **options) -> None:
        age_minutes = options["age_minutes"]
        limit = options["limit"]
        if not 0 <= age_minutes <= MAX_AGE_MINUTES:
            raise CommandError(f"age-minutes must be between 0 and {MAX_AGE_MINUTES}")
        if not 1 <= limit <= MAX_LIMIT:
            raise CommandError(f"limit must be between 1 and {MAX_LIMIT}")

        spool = _spool_directory()
        if spool is None:
            self.stdout.write("skipped, persistent video spool is unavailable")
            return
        with _spool_lock(spool) as acquired:
            if not acquired:
                self.stdout.write("skipped, package_pending is already running")
                return
            self._run(spool, age_minutes, limit)

    def _run(self, spool: Path, age_minutes: int, limit: int) -> None:
        cutoff = timezone.now() - timedelta(minutes=age_minutes)
        asset_ids = list(
            VideoAsset.objects.filter(
                status__in=(VideoStatus.PROCESSING, VideoStatus.STAGED),
                updated_at__lt=cutoff,
            )
            .order_by("updated_at")
            .values_list("pk", flat=True)[:limit]
        )
        recovered = skipped = failed = 0
        for asset_id in asset_ids:
            claimed = _claim(asset_id, cutoff)
            if claimed is None:
                skipped += 1
                continue
            asset, downloader = claimed
            destination = None
            try:
                with tempfile.NamedTemporaryFile(
                    dir=spool,
                    prefix="package-pending-",
                    suffix=_source_suffix(asset),
                    delete=False,
                ) as temporary:
                    destination = Path(temporary.name)
                downloader(asset, str(destination))
                if not destination.is_file() or destination.stat().st_size <= 0:
                    raise RuntimeError("provider returned no source bytes")
                ingest.ingest_file(
                    destination,
                    asset.slug,
                    title=asset.title,
                    created_by=asset.created_by,
                    remove_source=True,
                    package="force",
                    track_progress=True,
                )
                recovered += 1
            except Exception as error:
                failed += 1
                VideoAsset.objects.filter(
                    pk=asset.pk,
                    status__in=(VideoStatus.PROCESSING, VideoStatus.ERROR),
                ).update(
                    status=VideoStatus.ERROR,
                    stage="",
                    error_message=_safe_error(error),
                    updated_at=timezone.now(),
                )
            finally:
                if destination is not None:
                    destination.unlink(missing_ok=True)
        self.stdout.write(f"recovered: {recovered}; failed: {failed}; skipped: {skipped}")
