"""Operator recovery tests for the stale package worker."""

from __future__ import annotations

import io
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, mock

from django.core.management import call_command
from django.test import TestCase as DjangoTestCase
from django.test import override_settings
from django.utils import timezone

from features.common.choices import VideoStatus
from features.videohosting import ingest
from features.videohosting.management.commands import package_pending
from features.videohosting.models import VideoAsset, VideoProvider
from features.videohosting.playback_plan import Plan
from features.videohosting.providers import ensure_defaults, google_drive, telegram


class _DownloadResponse:
    def __init__(self, payload: bytes):
        self.payload = io.BytesIO(payload)

    def read(self, size: int = -1):
        return self.payload.read(size)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class ProviderDownloadHookTests(TestCase):
    def test_drive_download_hook_writes_source_bytes_without_returning_uri(self):
        asset = SimpleNamespace(source_file_id="DRIVE-FILE")
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "source.mp4"
            with (
                mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "")),
                mock.patch.object(
                    google_drive.urllib.request,
                    "urlopen",
                    return_value=_DownloadResponse(b"drive-bytes"),
                ) as urlopen,
            ):
                result = google_drive.download_source(asset, str(destination))

            self.assertEqual(destination.read_bytes(), b"drive-bytes")
            self.assertIsNone(result)
            urlopen.assert_called_once()

    def test_telegram_download_hook_uses_mocked_provider_service(self):
        asset = SimpleNamespace(source_message_id=42)
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "source.mp4"
            service = mock.AsyncMock()
            service.download_source.side_effect = lambda _message_id, path: destination.write_bytes(b"telegram-bytes")
            with mock.patch.object(telegram, "TelegramMediaService", return_value=service):
                telegram.download_source(asset, str(destination))

            self.assertEqual(destination.read_bytes(), b"telegram-bytes")
            service.download_source.assert_awaited_once_with(42, str(destination))
            service._drop_client.assert_awaited_once()


class PackagePendingCommandTests(DjangoTestCase):
    def setUp(self) -> None:
        ensure_defaults()
        self.provider = VideoProvider.objects.get(code="telegram")
        self.fake_spec = SimpleNamespace(upload=SimpleNamespace(download_source=None))

    def _asset(self, slug: str, status: str, *, source: bool = True, age_minutes: int = 30) -> VideoAsset:
        asset = VideoAsset.objects.create(
            slug=slug,
            title=slug,
            provider=self.provider,
            status=status,
            source_message_id=42 if source else None,
            source_file_name="lesson.mp4",
        )
        old = timezone.now() - package_pending.timedelta(minutes=age_minutes)
        VideoAsset.objects.filter(pk=asset.pk).update(updated_at=old)
        return VideoAsset.objects.get(pk=asset.pk)

    def _run(self, spool: str, *args, **kwargs) -> str:
        output = io.StringIO()
        with override_settings(VIDEO_SPOOL_DIR=spool):
            call_command("package_pending", *args, stdout=output, **kwargs)
        return output.getvalue()

    def test_stale_processing_and_legacy_staged_are_recovered_but_fresh_ready_and_source_less_skip(self):
        processing = self._asset("pending-processing", VideoStatus.PROCESSING)
        staged = self._asset("pending-staged", VideoStatus.STAGED)
        fresh = self._asset("pending-fresh", VideoStatus.PROCESSING, age_minutes=1)
        ready = self._asset("pending-ready", VideoStatus.READY)
        source_less = self._asset("pending-source-less", VideoStatus.STAGED, source=False)
        downloaded: list[Path] = []

        def downloader(_asset, destination):
            path = Path(destination)
            downloaded.append(path)
            path.write_bytes(b"source-bytes")

        def ingest_success(path, slug, **kwargs):
            self.assertEqual(kwargs["package"], "force")
            VideoAsset.objects.filter(slug=slug).update(status=VideoStatus.READY, stage="")
            return VideoAsset.objects.get(slug=slug)

        with tempfile.TemporaryDirectory() as spool:
            with mock.patch.object(package_pending, "spec_for", return_value=self.fake_spec):
                with mock.patch.object(ingest, "_resolve_plan", return_value=Plan("hls", True, "ffmpeg")):
                    with mock.patch.object(ingest, "ingest_file", side_effect=ingest_success) as ingest_mock:
                        self.fake_spec.upload.download_source = downloader
                        output = self._run(spool)

        self.assertIn("recovered: 2", output)
        self.assertEqual(VideoAsset.objects.get(pk=processing.pk).status, VideoStatus.READY)
        self.assertEqual(VideoAsset.objects.get(pk=staged.pk).status, VideoStatus.READY)
        self.assertEqual(VideoAsset.objects.get(pk=fresh.pk).status, VideoStatus.PROCESSING)
        self.assertEqual(VideoAsset.objects.get(pk=ready.pk).status, VideoStatus.READY)
        self.assertEqual(VideoAsset.objects.get(pk=source_less.pk).status, VideoStatus.STAGED)
        self.assertEqual(ingest_mock.call_count, 2)
        self.assertTrue(downloaded)
        self.assertTrue(all(not path.exists() for path in downloaded))

    def test_asset_without_package_capable_target_is_left_unchanged(self):
        asset = self._asset("pending-no-target", VideoStatus.STAGED)
        downloader = mock.Mock()
        self.fake_spec.upload.download_source = downloader
        with tempfile.TemporaryDirectory() as spool:
            with mock.patch.object(package_pending, "spec_for", return_value=self.fake_spec):
                with mock.patch.object(
                    ingest,
                    "_resolve_plan",
                    return_value=Plan("refused", False, "provider_requires_packaging"),
                ):
                    self._run(spool)
        asset.refresh_from_db()
        self.assertEqual(asset.status, VideoStatus.STAGED)
        downloader.assert_not_called()

    def test_provider_download_failure_marks_claimed_asset_error_without_uri(self):
        asset = self._asset("pending-download-failure", VideoStatus.PROCESSING)

        def downloader(_asset, _destination):
            raise RuntimeError("https://provider.example/private-upload-uri")

        self.fake_spec.upload.download_source = downloader
        with tempfile.TemporaryDirectory() as spool:
            with mock.patch.object(package_pending, "spec_for", return_value=self.fake_spec):
                with mock.patch.object(ingest, "_resolve_plan", return_value=Plan("hls", True, "ffmpeg")):
                    with mock.patch.object(ingest, "ingest_file") as ingest_mock:
                        self._run(spool)

        asset.refresh_from_db()
        self.assertEqual(asset.status, VideoStatus.ERROR)
        self.assertNotIn("https://", asset.error_message)
        ingest_mock.assert_not_called()

    def test_second_run_skips_when_spool_lock_is_held(self):
        with tempfile.TemporaryDirectory() as spool:
            with package_pending._spool_lock(Path(spool)) as acquired:
                self.assertTrue(acquired)
                output = self._run(spool)
        self.assertIn("skipped", output)
        self.assertIn("already running", output)
