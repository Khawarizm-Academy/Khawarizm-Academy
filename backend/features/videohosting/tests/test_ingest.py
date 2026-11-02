"""Ingest integration regressions for resolved playback plans."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest import TestCase, mock

from django.test import TestCase as DjangoTestCase

from features.common.choices import VideoStatus
from features.videohosting import ingest, packaging, providers
from features.videohosting.models import VideoAsset, VideoProvider, VideoSystemConfig
from features.videohosting.playback_plan import PROVIDER_REQUIRES_PACKAGING, Plan
from features.videohosting.tests.helpers import MASTER, FakeTelegramService

HOST_READY = {"serverless": False, "ffmpeg": True, "persistentHost": True}
HOST_NO_PACKAGING = {"serverless": True, "ffmpeg": False, "persistentHost": False}


class CompatibilityHelperTests(TestCase):
    """Legacy helpers remain thin views over the canonical plan resolver."""

    def test_packaging_and_raw_compatibility_table(self):
        rows = (
            (Plan("hls", True, "ffmpeg"), True, False),
            (Plan("refused", False, PROVIDER_REQUIRES_PACKAGING), False, False),
            (Plan("raw", False, "no_package_target"), False, True),
        )
        for plan, packages, raw in rows:
            with self.subTest(plan=plan):
                with mock.patch.object(ingest, "_resolve_plan", return_value=plan):
                    self.assertEqual(ingest._should_package("auto"), packages)
                    self.assertEqual(ingest.raw_mode_is_playable(object(), "auto"), raw)


class FakeDriveService:
    """A Drive-shaped service that records no network calls."""

    def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict:
        if on_bytes is not None:
            on_bytes(2048, 2048)
        return {"is_split": False, "parts": [{"file_id": "DRIVE123", "size_bytes": 2048}]}


class IngestPlaybackPlanTests(DjangoTestCase):
    def _asset(self, slug: str, provider_code: str) -> VideoAsset:
        providers.ensure_defaults()
        return VideoAsset.objects.create(
            slug=slug,
            provider=VideoProvider.objects.get(code=provider_code),
        )

    def _config(self, enabled: bool = True) -> None:
        config = VideoSystemConfig.get_instance()
        config.use_ffmpeg = enabled
        config.save(update_fields=["use_ffmpeg"])

    def test_drive_without_package_target_is_ready_raw_and_gated(self):
        asset = self._asset("ingest-drive-raw", "google_drive")
        with (
            mock.patch.object(ingest, "GoogleDriveService", FakeDriveService),
            mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_READY),
        ):
            result = ingest.ingest_file("missing.mp4", asset.slug, package="auto")

        self.assertEqual(result.status, VideoStatus.READY)
        self.assertEqual(result.playback_mode, "raw")
        self.assertEqual(result.protection, "gated")
        self.assertEqual(result.source_file_id, "DRIVE123")
        self.assertFalse(result.master_playlist)

    def test_telegram_packaging_persists_hls_and_encrypted(self):
        asset = self._asset("ingest-telegram-hls", "telegram")
        with tempfile.TemporaryDirectory() as work:
            fake_result = packaging.PackagingResult(
                master_playlist=MASTER,
                duration_seconds=90,
                renditions=[],
                work_dir=Path(work),
            )
            with (
                mock.patch.object(ingest, "TelegramMediaService", FakeTelegramService),
                mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_READY),
                mock.patch.object(packaging, "package_video", return_value=fake_result),
            ):
                result = ingest.ingest_file("missing.mp4", asset.slug, package="auto")

        self.assertEqual(result.status, VideoStatus.READY)
        self.assertEqual(result.playback_mode, "hls")
        self.assertEqual(result.protection, "encrypted")
        self.assertEqual(result.master_playlist, MASTER)

    def test_telegram_refusal_is_stable_and_happens_before_provider_work(self):
        asset = self._asset("ingest-telegram-refused", "telegram")
        self._config(enabled=True)
        with (
            mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_NO_PACKAGING),
            mock.patch.object(ingest, "TelegramMediaService") as service,
        ):
            with self.assertRaisesRegex(ValueError, f"^{PROVIDER_REQUIRES_PACKAGING}$"):
                ingest.ingest_file("missing.mp4", asset.slug, package="auto")

        service.assert_not_called()
        result = VideoAsset.objects.get(pk=asset.pk)
        self.assertEqual(result.status, VideoStatus.ERROR)
        self.assertEqual(result.error_message, PROVIDER_REQUIRES_PACKAGING)
        self.assertFalse(result.source_message_id)

    def test_link_provider_refusal_uses_the_same_stable_error(self):
        asset = self._asset("ingest-youtube-refused", "youtube")
        with mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_READY):
            with self.assertRaisesRegex(ValueError, f"^{PROVIDER_REQUIRES_PACKAGING}$"):
                ingest.ingest_file("missing.mp4", asset.slug, package="auto")

        result = VideoAsset.objects.get(pk=asset.pk)
        self.assertEqual(result.status, VideoStatus.ERROR)
        self.assertEqual(result.error_message, PROVIDER_REQUIRES_PACKAGING)
