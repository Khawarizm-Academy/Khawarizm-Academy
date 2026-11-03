"""Phase 13 hardening tests — upload caps, spool quota, provider-credential hygiene."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from features.common.testing import make_admin
from features.videohosting import services, studio_uploads
from features.videohosting.models import UploadSession, VideoAsset, VideoProvider
from features.videohosting.providers import ensure_defaults


class UploadAbuseTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        # Admin bypasses the `videos.upload` permission check; the cap applies
        # to every role equally, so the assertion is on the count, not the
        # permission path.
        self.user = make_admin("instructor13@example.com")
        ensure_defaults()
        self.drive = VideoProvider.objects.get(code="google_drive")
        self.asset = VideoAsset.objects.create(
            slug="abuse-test",
            title="Abuse test",
            provider=self.drive,
            created_by=self.user,
            status="uploading",
            stage="packaging:auto",
        )

    def _init_request(self):
        request = self.factory.post(
            f"/api/studio/videos/{self.asset.pk}/uploads",
            data={"fileName": "x.mp4", "sizeBytes": 1024, "mimeType": "video/mp4"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        return request

    def _make_session(self, key: str, status: str) -> UploadSession:
        return UploadSession.objects.create(
            asset=self.asset,
            provider=self.drive,
            user=self.user,
            session_key=key,
            status=status,
            file_name="x.mp4",
            mime_type="video/mp4",
            upload_uri="https://only/server",
            total_bytes=1024,
            chunk_size=1024,
        )

    def test_the_init_endpoint_refuses_when_over_the_parallel_limit(self):
        """Phase 13 §13.1.6: `VIDEO_MAX_OPEN_UPLOADS` caps the pending rows per user."""
        for index in range(3):
            self._make_session(f"sess-{index}", "pending")
        with override_settings(VIDEO_MAX_OPEN_UPLOADS=3):
            response = studio_uploads.studio_upload_init(self._init_request(), str(self.asset.pk))
        # The view checks the cap before reaching the provider, so no stub is
        # needed for the refusal path — the count short-circuits it.
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "too_many_open_uploads")

    def test_raising_the_limit_lets_the_request_through_to_the_provider_stage(self):
        """Cross-check: at cap=10 the same 3 pending rows do not trip the refusal."""
        for index in range(3):
            self._make_session(f"sess-{index}", "pending")
        with override_settings(VIDEO_MAX_OPEN_UPLOADS=10):
            response = studio_uploads.studio_upload_init(self._init_request(), str(self.asset.pk))
        # We do not assert a specific success code here — the provider will
        # fail next without a stub — only that the cap did not refuse us.
        self.assertNotEqual(getattr(response, "data", {}).get("code"), "too_many_open_uploads")

    def test_a_full_spool_refuses_a_new_session(self):
        """Phase 13 §13.1.6: `VIDEO_SPOOL_MAX_BYTES` bounds the spool directory."""
        with tempfile.TemporaryDirectory() as spool:
            (Path(spool) / "part-1.tmp").write_bytes(b"x" * 4096)
            with override_settings(VIDEO_SPOOL_DIR=spool, VIDEO_SPOOL_MAX_BYTES=1024, VIDEO_MAX_OPEN_UPLOADS=10):
                response = studio_uploads.studio_upload_init(self._init_request(), str(self.asset.pk))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "spool_full")

    def test_the_spool_quota_is_ignored_when_no_spool_is_configured(self):
        """The Drive path never writes a spool, so an unconfigured quota cannot
        block an upload — only a configured spool that is actually full does."""
        with tempfile.TemporaryDirectory() as spool:
            (Path(spool) / "part-1.tmp").write_bytes(b"x" * 4096)
            with override_settings(VIDEO_SPOOL_DIR="", VIDEO_SPOOL_MAX_BYTES=1024, VIDEO_MAX_OPEN_UPLOADS=10):
                response = studio_uploads.studio_upload_init(self._init_request(), str(self.asset.pk))
        self.assertNotEqual(getattr(response, "data", {}).get("code"), "spool_full")

    def test_spool_bytes_used_counts_every_part_file(self):
        with tempfile.TemporaryDirectory() as spool:
            (Path(spool) / "a.tmp").write_bytes(b"x" * 100)
            (Path(spool) / "nested").mkdir()
            (Path(spool) / "nested" / "b.tmp").write_bytes(b"y" * 23)
            with override_settings(VIDEO_SPOOL_DIR=spool):
                self.assertEqual(services.spool_bytes_used(), 123)
            with override_settings(VIDEO_SPOOL_DIR=""):
                self.assertEqual(services.spool_bytes_used(), 0)


class ProviderCredentialHygieneTests(TestCase):
    """Phase 13 §13.1.8 — no serializer payload may carry a provider secret.

    The `_asset_row` helper (studio_uploads) is what every video response
    eventually serializes through, so calling it directly against an asset
    with a real `aes_key_hex` and asserting the JSON dump does not contain
    any forbidden key is enough to keep the credential out of the client.
    """

    FORBIDDEN = (
        "refresh_token",
        "refreshToken",
        "upload_uri",
        "uploadUri",
        "aes_key_hex",
        "aesKeyHex",
        "bot_token",
        "botToken",
    )

    def setUp(self):
        self.user = make_admin(email="credential-hygiene@example.com")
        ensure_defaults()

    def test_studio_asset_row_omits_provider_secrets(self):
        provider = VideoProvider.objects.get(code="google_drive")
        asset = VideoAsset.objects.create(
            slug="credential-scan",
            title="Credential scan",
            provider=provider,
            created_by=self.user,
            status="ready",
            source_file_id="abc",
        )
        row = studio_uploads._asset_row(asset, viewer=self.user)
        blob = json.dumps(row, default=str)
        for forbidden in self.FORBIDDEN:
            self.assertNotIn(forbidden, blob, f"_asset_row leaked {forbidden!r}")
        # source_file_id is deliberately exposed to the player, but no other
        # credential-shaped key may ride alongside it.
        self.assertNotIn("aes_key_hex", blob)
