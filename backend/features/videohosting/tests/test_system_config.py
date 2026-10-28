"""The video system config endpoint, raw-mode ingest, and the raw watch route."""

from __future__ import annotations

from typing import Any
from unittest import mock

from django.test import TestCase

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase, authenticate, make_admin, make_user
from features.videohosting import diagnostics, ingest, packaging, providers
from features.videohosting.models import VideoAsset, VideoProvider, VideoSystemConfig


class FakeDriveService:
    """A GoogleDriveService stand-in: no network, one Drive-style file id."""

    def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict:
        if on_bytes is not None:
            on_bytes(2048, 2048)
        return {"is_split": False, "parts": [{"file_id": "DRIVE123", "size_bytes": 2048}]}


def _drive_asset(slug: str) -> None:
    providers.ensure_defaults()
    VideoAsset.objects.create(slug=slug, provider=VideoProvider.objects.get(code="google_drive"))


class VideoSystemConfigTests(ApiTestCase):
    """GET / POST /api/admin/video-system-config — admin-gated FFmpeg toggle."""

    def setUp(self):
        super().setUp()
        authenticate(self.client, make_admin())

    def test_get_returns_the_singleton_state(self):
        response = self.client.get("/api/admin/video-system-config")
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["useFfmpeg"], True)

    def test_post_persists_the_toggle(self):
        response = self.client.post("/api/admin/video-system-config", {"useFfmpeg": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["useFfmpeg"], False)
        self.assertFalse(VideoSystemConfig.get_instance().use_ffmpeg)

    def test_post_rejects_a_non_boolean(self):
        response = self.client.post("/api/admin/video-system-config", {"useFfmpeg": "sure"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("useFfmpeg", response.json()["detail"])

    def test_requires_the_admin_role(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/video-system-config").status_code, 403)


class DiagnosticsToggleTests(ApiTestCase):
    """With packaging off, missing FFmpeg is informational, not blocking."""

    def test_pipeline_stays_ok_with_ffmpeg_absent_when_packaging_off(self):
        authenticate(self.client, make_admin())
        config = VideoSystemConfig.get_instance()
        config.use_ffmpeg = False
        config.save(update_fields=["use_ffmpeg"])
        with mock.patch.object(packaging, "ffmpeg_available", return_value=False):
            groups = diagnostics.run(deep=False)["groups"]
        pipeline = next(g for g in groups if g["id"] == "pipeline")
        self.assertTrue(pipeline["ok"])
        self.assertIn("mode", {c["id"] for c in pipeline["checks"]})
        config.use_ffmpeg = True
        config.save(update_fields=["use_ffmpeg"])


class RawModeIngestTests(TestCase):
    """Packaging off makes Drive's raw source immediately watchable; Telegram waits."""

    def test_toggle_off_marks_drive_raw_ready(self):
        _drive_asset("raw-ready")
        config = VideoSystemConfig.get_instance()
        config.use_ffmpeg = False
        config.save(update_fields=["use_ffmpeg"])
        with mock.patch.object(ingest, "GoogleDriveService", FakeDriveService):
            asset = ingest.ingest_file("missing.mp4", "raw-ready", package="auto")
        self.assertEqual(asset.status, VideoStatus.READY)
        self.assertFalse(asset.master_playlist)
        self.assertEqual(asset.source_file_id, "DRIVE123")

    def test_staged_drive_package_run_ignores_the_toggle(self):
        """A packaging run packages regardless of the toggle — force means force."""
        _drive_asset("force-pack")
        with mock.patch.object(ingest, "GoogleDriveService", FakeDriveService):
            asset = ingest.ingest_file("missing.mp4", "force-pack", package="never")
        self.assertEqual(asset.status, VideoStatus.STAGED)

    def test_toggle_on_without_ffmpeg_keeps_drive_staged(self):
        """The old behavior: touched packaging later, from a FFmpeg host."""
        _drive_asset("staged-move")
        config = VideoSystemConfig.get_instance()
        with (
            mock.patch.object(ingest, "GoogleDriveService", FakeDriveService),
            mock.patch.object(packaging, "ffmpeg_available", return_value=False),
        ):
            asset = ingest.ingest_file("missing.mp4", "staged-move", package="auto")
        self.assertEqual(asset.status, VideoStatus.STAGED)
        config.use_ffmpeg = True
        config.save(update_fields=["use_ffmpeg"])


class RawWatchRouteTests(ApiTestCase):
    """The gated raw watch endpoint — token in the query, range passthrough."""

    def setUp(self):
        super().setUp()
        providers.ensure_defaults()
        self.asset = VideoAsset.objects.create(
            slug="raw-watch",
            status=VideoStatus.READY,
            provider=VideoProvider.objects.get(code="google_drive"),
            source_file_id="DRV42",
            source_file_name="lesson.mp4",
        )
        self.canned: tuple[int, Any, dict] = (
            206,
            iter([b"part1", b"part2"]),
            {"Content-Type": "video/mp4", "Content-Range": "bytes 0-2/10", "Accept-Ranges": "bytes"},
        )

    def _fake_raw(self):
        """A ProviderSpec stub whose raw_stream returns the canned payload."""

        class FakeSpec:
            code = "google_drive"
            raw_stream = staticmethod(lambda file_id, range_header: self.canned)

        return FakeSpec()

    def test_meta_lists_no_qualities_but_is_ready(self):
        body = self.client.get("/api/videos/raw-watch").json()
        self.assertEqual(body["status"], "ready")
        self.assertEqual(body["qualities"], [])

    def test_token_carrying_client_mints_a_raw_play_url(self):
        authenticate(self.client, make_user())
        response = self.client.post("/api/videos/raw-watch/token")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["mode"], "raw")
        # compact() drops empty keys — with raw mode there is no master URL at all.
        self.assertNotIn("masterUrl", body)
        self.assertIn("/raw?token=", body["playUrl"])

    def test_raw_stream_requires_a_valid_token(self):
        self.assertEqual(self.client.get("/api/videos/raw-watch/raw").status_code, 403)

    def test_raw_stream_serves_the_provider_bytes(self):
        authenticate(self.client, make_user())
        with mock.patch("features.videohosting.providers.spec_for", return_value=self._fake_raw()):
            token = self.client.post("/api/videos/raw-watch/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()["token"]
            response = self.client.get(f"/api/videos/raw-watch/raw?token={token}", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 206)
        self.assertEqual(b"".join(response.streaming_content), b"part1part2")
        self.assertEqual(response["Content-Range"], "bytes 0-2/10")

    def test_raw_stream_rejects_a_packaged_asset(self):
        self.asset.master_playlist = "#EXTM3U"
        self.asset.save(update_fields=["master_playlist"])
        authenticate(self.client, make_user())
        token = self.client.post("/api/videos/raw-watch/token").json()["token"]
        response = self.client.get(f"/api/videos/raw-watch/raw?token={token}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("غير متاحة", response.json()["detail"])
