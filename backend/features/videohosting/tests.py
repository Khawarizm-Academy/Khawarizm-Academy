"""Video hosting tests — models, tokens, serializers, and the streaming routes.

Telegram is never contacted: segment rows carry a cached `file_path`, and the
key endpoint serves the stored AES key directly.
"""

from __future__ import annotations

import hashlib
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.utils import timezone

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase, authenticate
from features.videohosting import packaging, providers, tokens
from features.videohosting.models import StreamToken, VideoAsset, VideoProvider, VideoRendition, VideoSegment
from features.videohosting.serializers import asset_meta
from features.videohosting.providers import google_drive

MASTER = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n/api/stream/__TOKEN__/360p/index.m3u8\n"
MEDIA = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"/api/stream/__TOKEN__/key/360p\"\nseg_00000.ts\n"
KEY_HEX = "00112233445566778899aabbccddeeff"


def make_asset(**overrides) -> VideoAsset:
    """A ready asset with one packaged rendition and one cached segment."""
    fields = {
        "slug": "course-1--lesson-1",
        "title": "Lesson 1",
        "status": VideoStatus.READY,
        "duration_seconds": 120,
        "master_playlist": MASTER,
    }
    fields.update(overrides)
    asset = VideoAsset.objects.create(**fields)
    rendition = VideoRendition.objects.create(
        asset=asset,
        quality="360p",
        width=640,
        height=360,
        bandwidth_bps=800_000,
        playlist=MEDIA,
        aes_key_hex=KEY_HEX,
        segment_count=1,
    )
    VideoSegment.objects.create(
        rendition=rendition, index=0, message_id=11, file_id="FILEID", file_path="documents/file_1.ts", size_bytes=1024
    )
    return asset


class AssetModelTests(ApiTestCase):
    def test_status_default_is_uploading(self):
        asset = VideoAsset.objects.create(slug="draft")
        self.assertEqual(asset.status, VideoStatus.UPLOADING)

    def test_rendition_quality_is_unique_per_asset(self):
        asset = make_asset()
        with self.assertRaises(Exception):
            VideoRendition.objects.create(asset=asset, quality="360p", aes_key_hex=KEY_HEX)


class PackagingHostTests(ApiTestCase):
    def test_guard_blocks_vercel_with_instructions(self):
        with mock.patch.object(packaging.settings, "IS_VERCEL", True):
            with self.assertRaises(packaging.PackagingError) as ctx:
                packaging.require_packaging_host()
        self.assertIn("cannot run on Vercel", str(ctx.exception))

    def test_guard_reports_missing_ffmpeg_off_vercel(self):
        with mock.patch.object(packaging.settings, "IS_VERCEL", False):
            with mock.patch.object(packaging, "ffmpeg_available", return_value=False):
                with self.assertRaises(packaging.PackagingError) as ctx:
                    packaging.require_packaging_host()
        self.assertIn("Install FFmpeg", str(ctx.exception))

    def test_guard_passes_when_ffmpeg_present(self):
        with mock.patch.object(packaging, "ffmpeg_available", return_value=True):
            packaging.require_packaging_host()  # must not raise


class AssetMetaTests(ApiTestCase):
    def test_meta_shape_is_camel_case(self):
        payload = asset_meta(make_asset())
        self.assertEqual(payload["id"], "course-1--lesson-1")
        self.assertEqual(payload["durationSeconds"], 120)
        self.assertEqual(payload["qualities"][0]["bandwidthBps"], 800_000)


class TokenTests(ApiTestCase):
    def test_mint_stores_only_a_hash(self):
        asset = make_asset()
        raw, row = tokens.mint(asset, None, "10.0.0.1")
        self.assertEqual(row.token_hash, hashlib.sha256(raw.encode()).hexdigest())
        self.assertNotIn(raw, row.token_hash)

    def test_resolve_rejects_other_ip(self):
        asset = make_asset()
        raw, _ = tokens.mint(asset, None, "10.0.0.1")
        self.assertIsNone(tokens.resolve(raw, "10.0.0.2"))

    def test_resolve_rejects_expired_and_deletes_it(self):
        asset = make_asset()
        raw, row = tokens.mint(asset, None, "10.0.0.1")
        StreamToken.objects.filter(pk=row.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertIsNone(tokens.resolve(raw, "10.0.0.1"))
        self.assertFalse(StreamToken.objects.filter(pk=row.pk).exists())

    def test_resolve_accepts_bound_ip(self):
        asset = make_asset()
        raw, _ = tokens.mint(asset, None, "10.0.0.1")
        self.assertIsNotNone(tokens.resolve(raw, "10.0.0.1"))


class RegistryTests(ApiTestCase):
    def test_specs_upsert_every_provider_row(self):
        providers.ensure_defaults()
        codes = set(VideoProvider.objects.values_list("code", flat=True))
        self.assertEqual(codes, {"google_drive", "telegram"})
        # Enablement matches the specs: Drive is live, Telegram waits on its infra.
        self.assertTrue(VideoProvider.objects.get(code="google_drive").is_enabled)
        self.assertFalse(VideoProvider.objects.get(code="telegram").is_enabled)

    def test_a_hand_toggled_row_is_resynced_to_its_spec(self):
        providers.ensure_defaults()
        VideoProvider.objects.filter(code="telegram").update(is_enabled=True)
        providers.ensure_defaults()  # specs, not hand-edited rows, are the source of truth
        self.assertFalse(VideoProvider.objects.get(code="telegram").is_enabled)

    def test_spec_for_is_a_record_lookup(self):
        self.assertEqual(providers.spec_for("google_drive").code, "google_drive")
        self.assertIsNone(providers.spec_for("nope"))

    def test_default_provider_matches_settings(self):
        providers.ensure_defaults()
        self.assertEqual(providers.default_code(), settings.VIDEO_HOSTING_DEFAULT_PROVIDER)


class GoogleDriveCredentialsTests(ApiTestCase):
    def test_missing_keys_fail_loudly_naming_them(self):
        # One auth mode present so the auth sweep passes and the missing keys list.
        with mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON", '{"type":"service_account"}'):
            with self.assertRaises(ValueError) as ctx:
                google_drive.credentials()
        self.assertIn("GOOGLE_DRIVE_CLIENT_ID", str(ctx.exception))

    def test_no_auth_mode_fails_with_the_instruction(self):
        with mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_REFRESH_TOKEN", ""):
            with self.assertRaises(ValueError) as ctx:
                google_drive.credentials()
        self.assertIn("REFRESH_TOKEN", str(ctx.exception))


class ProviderRouteTests(ApiTestCase):
    def test_providers_route_requires_authentication(self):
        response = self.client.get("/api/videos/providers")
        self.assertEqual(response.status_code, 401)

    def test_providers_route_lists_the_registry(self):
        authenticate(self.client)
        response = self.client.get("/api/videos/providers")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["results"]
        self.assertEqual([row["code"] for row in payload], ["google_drive", "telegram"])
        self.assertEqual(payload[0]["capabilities"]["resumableUpload"], True)


class RouteTests(ApiTestCase):
    def test_meta_route_returns_asset(self):
        make_asset()
        response = self.client.get("/api/videos/course-1--lesson-1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], "course-1--lesson-1")

    def test_meta_route_404s_on_missing(self):
        response = self.client.get("/api/videos/nope")
        self.assertEqual(response.status_code, 404)

    def test_token_route_requires_authentication(self):
        make_asset()
        # Matching X-Forwarded-For keeps the minted binding consistent with the grant call.
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 401)

    def test_token_route_refuses_unready_asset(self):
        authenticate(self.client)
        make_asset(status=VideoStatus.PROCESSING)
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 409)

    def test_full_playback_flow_from_token_to_segment(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        token = minted["token"]

        master = self.client.get(f"/api/stream/{token}/master.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(master.status_code, 200)
        self.assertIn(f"/api/stream/{token}/360p/index.m3u8", master.content.decode())
        self.assertEqual(master["Cache-Control"], "no-store")

        media = self.client.get(f"/api/stream/{token}/360p/index.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertIn(f"/api/stream/{token}/key/360p", media.content.decode())

        key = self.client.get(f"/api/stream/{token}/key/360p", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(bytes.fromhex(KEY_HEX), key.content)

        # The segment redirects to Telegram; only Location is asserted (no network call).
        segment = self.client.get(f"/api/stream/{token}/360p/0.ts", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(segment.status_code, 302)
        self.assertIn("api.telegram.org/file/", segment["Location"])

    def test_playback_routes_reject_a_foreign_ip(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        response = self.client.get(f"/api/stream/{minted['token']}/master.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.9")
        self.assertEqual(response.status_code, 403)

    def test_playback_routes_reject_an_unknown_token(self):
        response = self.client.get("/api/stream/not-a-real-token/master.m3u8")
        self.assertEqual(response.status_code, 403)

    def test_segment_route_404s_on_missing_index(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        response = self.client.get(f"/api/stream/{minted['token']}/360p/99.ts", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 404)
