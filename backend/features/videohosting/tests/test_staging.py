"""Staging (--package never / auto-without-ffmpeg) and the staged token gate."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest import mock

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase, authenticate
from features.videohosting import ingest, packaging, providers
from features.videohosting.models import VideoAsset, VideoProvider
from features.videohosting.playback_plan import PROVIDER_REQUIRES_PACKAGING
from features.videohosting.tests.helpers import MASTER, FakeTelegramService, make_asset

HOST_READY = {"serverless": False, "ffmpeg": True, "persistentHost": True}
HOST_NO_PACKAGING = {"serverless": True, "ffmpeg": False, "persistentHost": False}


class StagingTests(ApiTestCase):
    """--package never / auto-without-ffmpeg stores the source with no FFmpeg."""

    def _telegram_asset(self, slug: str) -> None:
        """These tests study the Telegram ladder, so the row must name it."""
        providers.ensure_defaults()
        VideoAsset.objects.create(slug=slug, provider=VideoProvider.objects.get(code="telegram"))

    def test_never_is_refused_before_storing_an_unplayable_telegram_source(self):
        self._telegram_asset("staged-1")
        with (
            mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_READY),
            mock.patch.object(ingest, "TelegramMediaService") as service,
        ):
            with self.assertRaisesRegex(ValueError, f"^{PROVIDER_REQUIRES_PACKAGING}$"):
                ingest.ingest_file("missing.mp4", "staged-1", package="never")
        service.assert_not_called()
        asset = VideoAsset.objects.get(slug="staged-1")
        self.assertEqual(asset.status, VideoStatus.ERROR)
        self.assertEqual(asset.error_message, PROVIDER_REQUIRES_PACKAGING)
        self.assertIsNone(asset.source_message_id)

    def test_auto_is_refused_when_ffmpeg_is_missing(self):
        self._telegram_asset("staged-2")
        with (
            mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_NO_PACKAGING),
            mock.patch.object(ingest, "TelegramMediaService") as service,
        ):
            with self.assertRaisesRegex(ValueError, f"^{PROVIDER_REQUIRES_PACKAGING}$"):
                ingest.ingest_file("missing.mp4", "staged-2", package="auto")
        service.assert_not_called()
        asset = VideoAsset.objects.get(slug="staged-2")
        self.assertEqual(asset.status, VideoStatus.ERROR)
        self.assertEqual(asset.error_message, PROVIDER_REQUIRES_PACKAGING)

    def test_force_without_ffmpeg_marks_the_asset_errored(self):
        self._telegram_asset("staged-3")
        with (
            mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_NO_PACKAGING),
            mock.patch.object(ingest, "TelegramMediaService") as service,
        ):
            with self.assertRaisesRegex(ValueError, f"^{PROVIDER_REQUIRES_PACKAGING}$"):
                ingest.ingest_file("missing.mp4", "staged-3", package="force")
        service.assert_not_called()
        asset = VideoAsset.objects.get(slug="staged-3")
        self.assertEqual(asset.status, VideoStatus.ERROR)
        self.assertEqual(asset.error_message, PROVIDER_REQUIRES_PACKAGING)

    def test_auto_packages_when_ffmpeg_exists(self):
        self._telegram_asset("staged-4")
        with tempfile.TemporaryDirectory() as work:
            fake_result = packaging.PackagingResult(
                master_playlist=MASTER, duration_seconds=90, renditions=[], work_dir=Path(work)
            )
            with (
                mock.patch.object(ingest, "TelegramMediaService", FakeTelegramService),
                mock.patch.object(ingest.services, "host_capabilities", return_value=HOST_READY),
                mock.patch.object(packaging, "package_video", return_value=fake_result),
            ):
                asset = ingest.ingest_file("missing.mp4", "staged-4", package="auto")
        self.assertEqual(asset.status, VideoStatus.READY)
        self.assertEqual(asset.master_playlist, MASTER)


class StagedTokenGateTests(ApiTestCase):
    def test_staged_asset_explains_what_it_is_waiting_for(self):
        owner = authenticate(self.client)[0]
        make_asset(status=VideoStatus.STAGED, created_by=owner)
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 409)
        self.assertIn("التغليف", response.json()["detail"])
