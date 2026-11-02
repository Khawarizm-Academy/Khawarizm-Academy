"""Bounded raw proxy contract tests; all provider streams are fully fake."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from django.test import override_settings

from features.common.choices import PlaybackMode, Protection
from features.common.errors import RangeNotSatisfiable
from features.common.testing import ApiTestCase, authenticate, make_admin
from features.videohosting.models import VideoProvider
from features.videohosting.tests.helpers import make_asset
from features.videohosting.views import _range_window


class RangeWindowTests(ApiTestCase):
    def test_open_and_explicit_ranges_are_capped(self):
        self.assertEqual(_range_window("bytes=100-", 1000, 16), ("bytes=100-115", 100, 115))
        self.assertEqual(_range_window("bytes=100-999", 1000, 16), ("bytes=100-115", 100, 115))
        self.assertEqual(_range_window("bytes=-100", 1000, 16), ("bytes=984-999", 984, 999))
        self.assertEqual(_range_window("", 10, 16), ("bytes=0-9", 0, 9))

    def test_invalid_and_unsatisfiable_ranges_are_416(self):
        for value, total in (("bytes=1-2,5-8", 100), ("bytes=-4", 0), ("bytes=100-", 100)):
            with self.subTest(value=value):
                with self.assertRaises(RangeNotSatisfiable):
                    _range_window(value, total, 16)


class RawProxyTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin, _session = authenticate(self.client, make_admin())
        self.provider = VideoProvider.objects.create(
            code="google_drive",
            name="Google Drive",
            is_enabled=True,
            capabilities={"rawPlayback": True},
        )
        self.asset = make_asset(
            slug="raw-asset",
            provider=self.provider,
            playback_mode=PlaybackMode.RAW,
            protection=Protection.GATED,
            master_playlist="",
            source_file_id="drive-file-1",
            source_size_bytes=100,
            mime_type="video/mp4",
        )

    def _token(self):
        response = self.client.post("/api/videos/raw-asset/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["token"]

    @override_settings(VIDEO_RAW_RANGE_CAP_BYTES=16)
    def test_open_range_is_rewritten_and_provider_headers_are_not_forwarded(self):
        token = self._token()
        received = []

        def fake_stream(file_id, range_header):
            received.append((file_id, range_header))
            return (
                206,
                iter((b"1234567890",)),
                {
                    "Content-Range": "bytes 10-19/100",
                    "Set-Cookie": "secret=never-forward",
                    "WWW-Authenticate": "Bearer upstream-secret",
                    "Content-Length": "10",
                },
            )

        with patch("features.videohosting.views.spec_for", return_value=SimpleNamespace(raw_stream=fake_stream)):
            response = self.client.get(
                f"/api/videos/raw-asset/raw?token={token}",
                HTTP_RANGE="bytes=10-",
                HTTP_X_FORWARDED_FOR="10.0.0.1",
            )
        self.assertEqual(response.status_code, 206)
        self.assertEqual(received, [("drive-file-1", "bytes=10-25")])
        self.assertEqual(b"".join(response.streaming_content), b"1234567890")
        self.assertEqual(response["Content-Range"], "bytes 10-19/100")
        self.assertEqual(response["Accept-Ranges"], "bytes")
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(response["Referrer-Policy"], "no-referrer")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertNotIn("Set-Cookie", response)
        self.assertNotIn("WWW-Authenticate", response)

    def test_busy_proxy_returns_retry_after(self):
        token = self._token()

        class BusySemaphore:
            def acquire(self, blocking=False):
                return False

        with (
            patch("features.videohosting.views.spec_for", return_value=SimpleNamespace(raw_stream=lambda *_: None)),
            patch("features.videohosting.views._RAW_SEMAPHORE", BusySemaphore()),
        ):
            response = self.client.get(
                f"/api/videos/raw-asset/raw?token={token}",
                HTTP_RANGE="bytes=0-10",
                HTTP_X_FORWARDED_FOR="10.0.0.1",
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response["Retry-After"], "2")
        self.assertEqual(response.json()["code"], "raw_busy")

    def test_invalid_range_returns_416_with_total_size(self):
        token = self._token()
        response = self.client.get(
            f"/api/videos/raw-asset/raw?token={token}",
            HTTP_RANGE="bytes=-0",
            HTTP_X_FORWARDED_FOR="10.0.0.1",
        )
        self.assertEqual(response.status_code, 416)
        self.assertEqual(response["Content-Range"], "bytes */100")

    def test_raw_route_rejects_hls_mode_even_when_source_file_exists(self):
        token = self._token()
        self.asset.playback_mode = PlaybackMode.HLS
        self.asset.save(update_fields=["playback_mode"])
        response = self.client.get(
            f"/api/videos/raw-asset/raw?token={token}",
            HTTP_RANGE="bytes=0-10",
            HTTP_X_FORWARDED_FOR="10.0.0.1",
        )
        self.assertEqual(response.status_code, 404)
