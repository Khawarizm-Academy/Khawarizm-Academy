"""The admin console's video endpoints — routes, gating, uploads, and OAuth."""

from __future__ import annotations

import base64
import hashlib
import json
import time
from datetime import timedelta
from unittest import mock

from django.conf import settings as django_settings
from django.test import Client, TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone

from features.common.testing import ApiTestCase, api_client, authenticate, make_admin, make_user
from features.videohosting import diagnostics, ingest, oauthdrive, packaging
from features.videohosting.models import DriveAuthState, DriveGrant, VideoAsset

from features.videohosting.tests.helpers import FakeTelegramService, ScriptedDriveHTTP


class AdminConsoleVideoRouteTests(TestCase):
    def test_video_routes_resolve(self):
        self.assertEqual(reverse("admin-video-diagnostics"), "/api/admin/video-diagnostics")
        self.assertEqual(reverse("admin-video-providers"), "/api/admin/video-providers")
        self.assertEqual(reverse("admin-video-assets"), "/api/admin/video-assets")


class AdminConsoleVideoTests(ApiTestCase):
    """The video hosting endpoints — providers, asset gating, and diagnostics."""

    def setUp(self):
        super().setUp()
        authenticate(self.client, make_admin())

    def test_diagnostics_payload_names_every_group(self):
        body = self.client.get("/api/admin/video-diagnostics").json()
        self.assertEqual([g["id"] for g in body["groups"]], ["pipeline", "telegram", "google_drive"])
        self.assertEqual([p["code"] for p in body["providers"]], ["google_drive", "telegram"])
        self.assertIsInstance(body["okOverall"], bool)
        self.assertIn("problems", body)

    def test_deep_param_is_accepted(self):
        self.assertEqual(self.client.get("/api/admin/video-diagnostics?deep=true").status_code, 200)

    def test_provider_rows_carry_availability(self):
        body = self.client.get("/api/admin/video-providers").json()
        for row in body["results"]:
            self.assertIn("available", row)
            self.assertIn("reason", row)

    def test_telegram_asset_is_blocked_with_its_reason(self):
        with mock.patch.object(diagnostics, "provider_available", return_value=False):
            response = self.client.post("/api/admin/video-assets", {"slug": "video-tg", "provider": "telegram"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("TELEGRAM_API_ID", response.json()["detail"])

    def test_telegram_asset_is_selectable_when_env_checks_pass(self):
        with mock.patch.object(diagnostics, "provider_available", return_value=True):
            response = self.client.post("/api/admin/video-assets", {"slug": "video-tg", "provider": "telegram"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["provider"], "telegram")

    def test_assets_listing_carries_health_columns(self):
        self.client.post("/api/admin/video-assets", {"slug": "video-ls"}, format="json")
        row = self.client.get("/api/admin/video-assets").json()["results"][0]
        self.assertEqual(row["slug"], "video-ls")
        for key in ("error", "qualities", "createdAt"):
            self.assertIn(key, row)

    def test_asset_detail_carries_the_tracker_fields(self):
        minted = self.client.post("/api/admin/video-assets", {"slug": "video-detail"}, format="json").json()
        body = self.client.get(f"/api/admin/video-assets/{minted['id']}").json()
        self.assertEqual(body["slug"], "video-detail")
        self.assertIn("progress", body)
        self.assertIn("stage", body)


class AdminConsoleVideoUploadTests(TransactionTestCase):
    """The file upload: gating, the worker thread, and the tracker fields.

    TransactionTestCase on purpose: the ingest worker runs on its own
    connection, so its committed writes are invisible from a TestCase's open
    transaction — the polling loop here must read them.
    """

    def setUp(self):
        self.client = api_client()
        authenticate(self.client, make_admin())
        self._telegram = mock.patch.object(ingest, "TelegramMediaService", FakeTelegramService)
        self._telegram.start()

    def tearDown(self):
        self._telegram.stop()
        super().tearDown()

    def _upload(self, slug="clip-1", provider="telegram"):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return self.client.post(
            "/api/admin/video-assets/upload",
            {"slug": slug, "title": "درس تجريبي", "provider": provider, "file": SimpleUploadedFile("clip.mp4", b"0" * 2048)},
            format="multipart",
        )

    def _asset(self, slug="clip-1"):
        return VideoAsset.objects.get(slug=slug)

    def test_upload_kicks_off_a_worker_that_stages_the_file(self):
        # The patches must outlive the 202: the worker reads them from its own
        # thread, seconds after the request has already returned.
        with mock.patch.object(diagnostics, "provider_available", return_value=True), \
             mock.patch.object(packaging, "ffmpeg_available", return_value=False):
            response = self._upload()
            self.assertEqual(response.status_code, 202)
            self.assertEqual(response.json()["status"], "uploading")
            # Terminal state pair: the staged save alone can land a tick before
            # the tracker's final 100% flush — wait for both to settle.
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                asset = self._asset()
                if asset.status == "staged" and asset.progress == 100:
                    break
                time.sleep(0.05)
        self.assertEqual(asset.status, "staged", f"row error: {asset.error_message}")
        self.assertEqual(asset.progress, 100)
        self.assertEqual(asset.stage, "")
        self.assertEqual(asset.source_file_name, "clip.mp4")
        self.assertFalse(asset.master_playlist)

    def test_upload_refuses_a_second_upload_for_a_busy_slug(self):
        with mock.patch.object(diagnostics, "provider_available", return_value=True):
            VideoAsset.objects.create(slug="clip-1", status="uploading", stage="uploading")
            response = self._upload()
        self.assertEqual(response.status_code, 409)

    def test_upload_still_gates_the_telegram_provider(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        with mock.patch.object(diagnostics, "provider_available", return_value=False):
            response = self.client.post(
                "/api/admin/video-assets/upload",
                {"slug": "clip-tg", "provider": "telegram", "file": SimpleUploadedFile("clip.mp4", b"0")},
                format="multipart",
            )
        self.assertEqual(response.status_code, 400)
        # The refusal names the provider and the exact env key that is missing.
        self.assertIn("Telegram غير جاهز", response.json()["detail"])
        self.assertIn("TELEGRAM_API_ID", response.json()["detail"])

    def test_an_unknown_provider_code_is_refused_not_silently_defaulted(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        response = self.client.post(
            "/api/admin/video-assets/upload",
            {"slug": "clip-x", "provider": "space_bucket", "file": SimpleUploadedFile("clip.mp4", b"0")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("space_bucket", response.json()["detail"])


class FakeDriveService:
    """A GoogleDriveService stand-in: no network, one Drive-style file id."""

    def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict:
        if on_bytes is not None:
            on_bytes(2048, 2048)
        return {"is_split": False, "parts": [{"file_id": "DRIVE123", "size_bytes": 2048}]}


class AdminConsoleDriveUploadTests(TransactionTestCase):
    """Selecting Drive must ride the Drive pipeline and never touch Telegram."""

    def setUp(self):
        self.client = api_client()
        authenticate(self.client, make_admin())

    def test_upload_routes_the_drive_provider_through_the_drive_service(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        with mock.patch.object(diagnostics, "provider_available", return_value=True), \
             mock.patch.object(ingest, "GoogleDriveService", FakeDriveService), \
             mock.patch.object(ingest, "TelegramMediaService",
                               side_effect=AssertionError("Drive upload must not construct the Telegram service")):
            response = self.client.post(
                "/api/admin/video-assets/upload",
                {"slug": "drive-clip", "provider": "google_drive",
                 "file": SimpleUploadedFile("lesson.mp4", b"0" * 2048)},
                format="multipart",
            )
            self.assertEqual(response.status_code, 202)
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                asset = VideoAsset.objects.get(slug="drive-clip")
                if asset.status == "staged" and asset.progress == 100:
                    break
                time.sleep(0.05)
        self.assertEqual(asset.status, "staged", f"row error: {asset.error_message}")
        self.assertEqual(asset.source_file_id, "DRIVE123")
        self.assertEqual(asset.source_file_name, "lesson.mp4")
        self.assertEqual(asset.progress, 100)
        self.assertFalse(asset.master_playlist)

    def test_upload_requires_the_file_and_slug(self):
        response = self.client.post("/api/admin/video-assets/upload", {"slug": "clip-x"}, format="multipart")
        self.assertEqual(response.status_code, 400)


class AdminConsoleVideoPermissionTests(ApiTestCase):
    def test_anonymous_is_rejected_from_video_diagnostics(self):
        self.assertIn(self.client.get("/api/admin/video-diagnostics").status_code, (401, 403))

    def test_student_is_rejected_from_video_diagnostics(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/video-diagnostics").status_code, 403)


class AdminConsoleDriveOAuthTests(ApiTestCase):
    """The consent endpoints — admin-gated, token-free, and public-callback."""

    def test_start_requires_authentication(self):
        self.assertIn(self.client.get("/api/admin/video-drive/oauth/start").status_code, (401, 403))

    def test_start_is_rejected_for_students(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/video-drive/oauth/start").status_code, 403)

    def test_start_hands_the_admin_only_the_url(self):
        authenticate(self.client, make_admin())
        with mock.patch.object(django_settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(django_settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(django_settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"):
            response = self.client.get("/api/admin/video-drive/oauth/start")
        self.assertEqual(response.status_code, 200)
        self.assertIn("accounts.google.com/o/oauth2/v2/auth", response.json()["authUrl"])
        # A state was banked for the CSRF check — one row per consent click.
        self.assertEqual(DriveAuthState.objects.count(), 1)

    def test_callback_is_public_but_rejects_a_forged_state(self):
        response = self.client.get("/api/admin/video-drive/oauth/callback", {"state": "forged", "code": "4/0x"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])
        self.assertIn("فشل", response.content.decode("utf-8"))

    def test_callback_survives_the_origin_gate_like_a_real_google_redirect(self):
        # A top-level consent redirect carries no Origin header — the bare
        # client must reach the view instead of the middleware's 403.
        response = Client().get(
            "/api/admin/video-drive/oauth/callback", {"state": "forged", "code": "4/0x"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("فشل", response.content.decode("utf-8"))

    def test_callback_lands_a_page_without_secrets_every_credential_free(self):
        raw_state = "state-abc"
        DriveAuthState.objects.create(
            state_hash=hashlib.sha256(raw_state.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        token_reply = b'{"access_token": "AT", "refresh_token": "RT", "id_token": "%s", "expires_in": 3600}' % \
            base64.urlsafe_b64encode(json.dumps({"email": "owner@example.com"}).encode()).rstrip(b"=")
        scripted = ScriptedDriveHTTP([(200, {}, token_reply)])
        with mock.patch.object(django_settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(django_settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(django_settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            response = self.client.get("/api/admin/video-drive/oauth/callback", {"state": raw_state, "code": "4/0x"})
        page = response.content.decode("utf-8")
        self.assertIn("تم ربط", page)
        self.assertNotIn("RT", page)
        self.assertNotIn("AT", page)

    def test_status_reports_connection_without_tokens(self):
        DriveGrant.objects.create(
            account_email="owner@example.com", refresh_token="rt-super-secret",
            access_token="at-super-secret", access_token_expires_at=timezone.now() + timedelta(hours=1),
        )
        authenticate(self.client, make_admin())
        response = self.client.get("/api/admin/video-drive/oauth/status")
        self.assertEqual(response.status_code, 200)
        text = json.dumps(response.json())
        self.assertIn("owner@example.com", text)
        self.assertNotIn("rt-super-secret", text)
        self.assertNotIn("at-super-secret", text)
        self.assertEqual(
            response.json(),
            {"connected": True, "accountEmail": "owner@example.com", "status": "active", "error": ""},
        )

    def test_disconnect_requires_authentication(self):
        self.assertIn(self.client.post("/api/admin/video-drive/oauth/disconnect", {}).status_code, (401, 403))

    def test_disconnect_drops_the_stored_grant(self):
        DriveGrant.objects.create(
            account_email="owner@example.com", refresh_token="rt",
            access_token="at", access_token_expires_at=timezone.now() + timedelta(hours=1),
        )
        authenticate(self.client, make_admin())
        with mock.patch.object(oauthdrive.urllib.request, "urlopen",
                               side_effect=AssertionError("disconnect must not hang on Google")):
            response = self.client.post("/api/admin/video-drive/oauth/disconnect", {})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(DriveGrant.objects.count(), 0)
