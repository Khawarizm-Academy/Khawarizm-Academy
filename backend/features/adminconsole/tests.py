"""Tests for the admin console analytics API."""

from __future__ import annotations

import base64
import hashlib
import io
import json
import time
import urllib.error
from datetime import timedelta
from unittest import mock

from django.conf import settings as django_settings
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone

from features.auth import services
from features.auth.models import User
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.common.testing import ApiTestCase, FakeRequest, api_client, authenticate, make_admin, make_user
from features.videohosting import diagnostics, ingest, oauthdrive as oauthdrive_module, packaging


class FakeTelegramService:
    """A TelegramMediaService stand-in that never touches the network."""

    async def upload_file(self, file_path: str, caption: str = "", on_bytes=None) -> dict:
        if on_bytes is not None:
            on_bytes(2048, 2048)  # the real service calls this from its event loop
        return {"is_split": False, "parts": [{"message_id": 11, "file_id": "F", "size_bytes": 2048}]}


def _scripted_http(steps):
    """A urlopen stand-in for the OAuth exchange — (status, headers, body) steps."""

    def call(request, timeout=0):
        status, headers, body = steps.pop(0)
        if status >= 400:
            raise urllib.error.HTTPError(request.full_url, status, "http error", headers, io.BytesIO(body))
        return io.BytesIO(body)

    return call


class AdminConsoleUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("admin-overview"), "/api/admin/overview")
        self.assertEqual(reverse("admin-users"), "/api/admin/users")
        self.assertEqual(reverse("admin-sessions"), "/api/admin/sessions")


class AdminConsolePermissionTests(ApiTestCase):
    def test_anonymous_is_rejected(self):
        self.assertIn(self.client.get("/api/admin/overview").status_code, (401, 403))

    def test_student_is_rejected(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/overview").status_code, 403)

    def test_staff_flag_is_enough_without_admin_role(self):
        authenticate(self.client, make_user(is_staff=True))
        self.assertEqual(self.client.get("/api/admin/overview").status_code, 200)


class AdminConsoleOverviewTests(ApiTestCase):
    def test_overview_reports_counts_and_activity(self):
        admin = make_admin()
        student = make_user(email="count@example.com")
        services.open_session(student, FakeRequest(), "password")
        authenticate(self.client, admin)
        body = self.client.get("/api/admin/overview").json()
        self.assertGreaterEqual(body["users"]["total"], 2)
        self.assertGreaterEqual(body["sessions"]["active"], 1)
        self.assertGreaterEqual(body["activity"]["loginsLast7d"], 1)


class AdminConsoleUserTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()
        authenticate(self.client, self.admin)

    def test_user_list_pages_and_filters(self):
        make_user(email="someone@example.com", full_name="Someone")
        body = self.client.get("/api/admin/users").json()
        self.assertIn("results", body)
        self.assertIn("total", body)

    def test_user_detail_includes_sessions_and_events(self):
        target = make_user(email="detail@example.com")
        services.open_session(target, FakeRequest(), "password")
        body = self.client.get(f"/api/admin/users/{target.id}").json()
        self.assertEqual(body["profile"]["email"], "detail@example.com")
        self.assertEqual(len(body["sessions"]), 1)
        self.assertEqual(len(body["events"]), 1)

    def test_user_detail_flags_the_session_you_are_browsing_from(self):
        body = self.client.get(f"/api/admin/users/{self.admin.id}").json()
        self.assertTrue(body["sessions"])
        self.assertTrue(all(row["isCurrent"] for row in body["sessions"]))

    def test_user_detail_never_flags_someone_elses_session(self):
        target = make_user(email="elsewhere@example.com")
        services.open_session(target, FakeRequest(), "password")
        body = self.client.get(f"/api/admin/users/{target.id}").json()
        self.assertFalse(any(row["isCurrent"] for row in body["sessions"]))

    def test_user_detail_events_omit_the_email_the_user_list_already_carries(self):
        target = make_user(email="noemail@example.com")
        services.open_session(target, FakeRequest(), "password")
        body = self.client.get(f"/api/admin/users/{target.id}").json()
        self.assertNotIn("email", body["events"][0])

    def test_user_list_filters_by_role(self):
        make_user(email="teacher@example.com", role=Role.INSTRUCTOR)
        body = self.client.get("/api/admin/users?role=instructor").json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["results"][0]["email"], "teacher@example.com")

    def test_user_list_search_matches_the_name_as_well_as_the_mail(self):
        make_user(email="findme@example.com", full_name="Find Me")
        body = self.client.get("/api/admin/users?q=Find").json()
        self.assertEqual(body["total"], 1)

    def test_an_unknown_role_filter_returns_everyone(self):
        make_user(email="other@example.com", role=Role.INSTRUCTOR)
        body = self.client.get("/api/admin/users?role=wizard").json()
        self.assertEqual(body["total"], 2)

    def test_a_non_numeric_page_is_a_bad_request_not_a_crash(self):
        self.assertEqual(self.client.get("/api/admin/users?page=abc").status_code, 400)

    def test_missing_user_returns_404(self):
        response = self.client.get("/api/admin/users/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)

    def test_invalid_role_is_rejected(self):
        target = make_user(email="badrole@example.com")
        response = self.client.post(f"/api/admin/users/{target.id}/role", {"role": "wizard"}, format="json")
        self.assertEqual(response.status_code, 400)


class AdminConsoleSessionTests(ApiTestCase):
    def test_session_list_includes_the_owner(self):
        admin = make_admin()
        target = make_user(email="owner@example.com")
        services.open_session(target, FakeRequest(), "password")
        authenticate(self.client, admin)
        body = self.client.get("/api/admin/sessions").json()
        owners = {row["user"]["email"] for row in body["results"]}
        self.assertIn("owner@example.com", owners)

    def test_revoke_ends_the_session(self):
        admin = make_admin()
        target = make_user(email="revoke@example.com")
        session, _, _ = services.open_session(target, FakeRequest(), "password")
        authenticate(self.client, admin)
        self.client.post(f"/api/admin/sessions/{session.id}/revoke", {}, format="json")
        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_revoke_records_the_reason_and_an_audit_row(self):
        admin = make_admin()
        target = make_user(email="audited@example.com")
        session, _, _ = services.open_session(target, FakeRequest(), "password")
        authenticate(self.client, admin)
        body = self.client.post(f"/api/admin/sessions/{session.id}/revoke", {}, format="json").json()
        self.assertEqual(body["revokedReason"], SessionRevokeReason.REVOKED_BY_ADMIN)
        self.assertTrue(session.user.auth_events.filter(kind=AuthEventKind.REVOKED).exists())

    def test_revoke_of_an_unknown_session_is_a_404(self):
        authenticate(self.client, make_admin())
        response = self.client.post("/api/admin/sessions/00000000-0000-0000-0000-000000000000/revoke", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_the_active_flag_splits_open_and_closed_sessions(self):
        admin = make_admin()
        open_session, _, _ = services.open_session(make_user(email="open@example.com"), FakeRequest(), "password")
        closed_session, _, _ = services.open_session(make_user(email="closed@example.com"), FakeRequest(), "password")
        closed_session.revoke(SessionRevokeReason.SIGNED_IN_ELSEWHERE)
        authenticate(self.client, admin)

        active = self.client.get("/api/admin/sessions?active=true").json()
        closed = self.client.get("/api/admin/sessions?active=false").json()

        self.assertIn(str(open_session.id), [row["id"] for row in active["results"]])
        self.assertNotIn(str(open_session.id), [row["id"] for row in closed["results"]])
        self.assertIn(str(closed_session.id), [row["id"] for row in closed["results"]])

    def test_the_session_search_matches_an_ip_as_well_as_an_mail(self):
        admin = make_admin()
        services.open_session(make_user(email="ip@example.com"), FakeRequest(ip="10.9.8.7"), "password")
        authenticate(self.client, admin)
        body = self.client.get("/api/admin/sessions?q=10.9").json()
        self.assertEqual(body["total"], 1)

    def test_a_non_numeric_page_is_a_bad_request_not_a_crash(self):
        authenticate(self.client, make_admin())
        self.assertEqual(self.client.get("/api/admin/sessions?page=abc").status_code, 400)


class AdminConsoleAnalyticsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        authenticate(self.client, make_admin())

    def test_login_series_returns_points(self):
        services.open_session(make_user(email="series@example.com"), FakeRequest(), "password")
        body = self.client.get("/api/admin/analytics/logins?days=14").json()
        self.assertEqual(body["days"], 14)
        self.assertTrue(body["points"])

    def test_login_series_clamps_the_window_into_1_and_90_days(self):
        self.assertEqual(self.client.get("/api/admin/analytics/logins?days=500").json()["days"], 90)
        self.assertEqual(self.client.get("/api/admin/analytics/logins?days=0").json()["days"], 1)

    def test_a_non_numeric_window_is_a_bad_request_not_a_crash(self):
        self.assertEqual(self.client.get("/api/admin/analytics/logins?days=two weeks").status_code, 400)

    def test_login_series_defaults_to_the_last_two_weeks(self):
        body = self.client.get("/api/admin/analytics/logins").json()
        self.assertEqual(body["days"], 14)

    def test_device_breakdown_has_all_groupings(self):
        services.open_session(make_user(email="dev@example.com"), FakeRequest(), "password")
        body = self.client.get("/api/admin/analytics/devices").json()
        self.assertIn("os", body)
        self.assertIn("browser", body)
        self.assertIn("deviceType", body)

    def test_events_stream_is_returned(self):
        services.open_session(make_user(email="stream@example.com"), FakeRequest(), "password")
        body = self.client.get("/api/admin/events?kind=login").json()
        self.assertTrue(body["results"])
        self.assertEqual(body["results"][0]["kind"], "login")
        # The global stream names who acted; the per-user trail deliberately does not.
        self.assertEqual(body["results"][0]["email"], "stream@example.com")

    def test_an_unknown_event_kind_returns_the_whole_stream(self):
        services.open_session(make_user(email="everything@example.com"), FakeRequest(), "password")
        body = self.client.get("/api/admin/events?kind=celebration").json()
        self.assertTrue(body["results"])


class AdminConsoleUserMutationTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()
        authenticate(self.client, self.admin)

    def test_create_user_fills_the_row(self):
        response = self.client.post(
            "/api/admin/users",
            {"email": "new@example.com", "fullName": "New Learner", "role": Role.STUDENT, "password": "secret-123"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email="new@example.com").exists())
        # A student profile is created for the new account.
        self.assertTrue(User.objects.get(email="new@example.com").student_profile)

    def test_create_admin_gets_staff_rights(self):
        self.client.post("/api/admin/users", {"email": "boss@example.com", "role": Role.ADMIN}, format="json")
        self.assertTrue(User.objects.get(email="boss@example.com").is_staff)

    def test_create_without_email_is_a_bad_request(self):
        self.assertEqual(self.client.post("/api/admin/users", {"role": Role.STUDENT}, format="json").status_code, 400)

    def test_create_duplicate_email_is_a_bad_request(self):
        make_user(email="taken@example.com")
        response = self.client.post("/api/admin/users", {"email": "taken@example.com"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_patch_edits_the_account(self):
        target = make_user(email="edit@example.com", full_name="Before")
        response = self.client.patch(
            f"/api/admin/users/{target.id}",
            {"fullName": "After", "phone": "+966500000000", "isActive": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        self.assertEqual(target.full_name, "After")
        self.assertEqual(target.phone, "+966500000000")
        self.assertFalse(target.is_active)

    def test_patch_role_keeps_django_staff_in_sync(self):
        target = make_user(email="promote@example.com")
        self.client.patch(f"/api/admin/users/{target.id}", {"role": Role.ADMIN}, format="json")
        target.refresh_from_db()
        self.assertEqual(target.role, Role.ADMIN)
        self.assertTrue(target.is_staff)

    def test_patch_cannot_demote_your_own_account(self):
        response = self.client.patch(f"/api/admin/users/{self.admin.id}", {"role": Role.STUDENT}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_patch_never_changes_the_email_identity(self):
        target = make_user(email="identity@example.com")
        response = self.client.patch(
            f"/api/admin/users/{target.id}",
            {"email": "hijacked@example.com", "fullName": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        self.assertEqual(target.email, "identity@example.com")
        self.assertEqual(target.full_name, "Renamed")

    def test_delete_removes_the_account(self):
        target = make_user(email="remove@example.com")
        response = self.client.delete(f"/api/admin/users/{target.id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=target.id).exists())

    def test_delete_cannot_target_your_own_account(self):
        self.assertEqual(self.client.delete(f"/api/admin/users/{self.admin.id}").status_code, 400)

    def test_a_student_cannot_create_users(self):
        self.client.credentials()
        authenticate(self.client, make_user(email="plain@example.com"))
        self.assertEqual(self.client.post("/api/admin/users", {"email": "x@example.com"}, format="json").status_code, 403)


class AdminConsoleContentTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        authenticate(self.client, make_admin())

    def test_schema_lists_the_managed_types_and_fields(self):
        body = self.client.get("/api/admin/content/schema").json()
        keys = [item["key"] for item in body["types"]]
        self.assertEqual(keys, ["courses", "scholarships", "events", "competitions"])
        self.assertTrue(body["types"][0]["fields"])
        self.assertTrue(body["userFields"])
        # Email is the account identity: exposed to the form but read-only.
        email_field = next(field for field in body["userFields"] if field["name"] == "email")
        self.assertTrue(email_field["readonly"])

    def test_events_can_be_listed_created_updated_and_deleted(self):
        created = self.client.post(
            "/api/admin/content/events",
            {"eventId": "e1", "title": "Annual Conference", "format": "بث مباشر"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        row_id = created.json()["id"]

        listing = self.client.get("/api/admin/content/events?q=Conference").json()
        self.assertEqual(listing["total"], 1)
        self.assertEqual(listing["results"][0]["key"], "e1")

        updated = self.client.patch(f"/api/admin/content/events/{row_id}", {"title": "Renamed"}, format="json")
        self.assertEqual(updated.json()["values"]["title"], "Renamed")

        self.assertEqual(self.client.delete(f"/api/admin/content/events/{row_id}").status_code, 200)

    def test_missing_required_field_is_a_bad_request(self):
        response = self.client.post("/api/admin/content/events", {"title": "No id"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_a_duplicate_key_is_a_bad_request(self):
        self.client.post("/api/admin/content/events", {"eventId": "dup", "title": "One"}, format="json")
        response = self.client.post("/api/admin/content/events", {"eventId": "dup", "title": "Two"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_an_unknown_type_is_a_bad_request(self):
        self.assertEqual(self.client.get("/api/admin/content/unknown").status_code, 400)

    def test_missing_row_is_a_404(self):
        response = self.client.patch("/api/admin/content/events/00000000-0000-0000-0000-000000000000", {"title": "x"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_overview_reports_content_counts(self):
        body = self.client.get("/api/admin/overview").json()
        self.assertIn("content", body)
        self.assertEqual(set(body["content"]), {"courses", "scholarships", "events", "competitions"})


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
        from features.videohosting import diagnostics

        with mock.patch.object(diagnostics, "provider_available", return_value=False):
            response = self.client.post("/api/admin/video-assets", {"slug": "video-tg", "provider": "telegram"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("TELEGRAM_API_ID", response.json()["detail"])

    def test_telegram_asset_is_selectable_when_env_checks_pass(self):
        from features.videohosting import diagnostics

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
        from features.videohosting.models import VideoAsset

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
            from features.videohosting.models import VideoAsset
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
            from features.videohosting.models import VideoAsset
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
        from features.videohosting.models import DriveAuthState
        self.assertEqual(DriveAuthState.objects.count(), 1)

    def test_callback_is_public_but_rejects_a_forged_state(self):
        response = self.client.get("/api/admin/video-drive/oauth/callback", {"state": "forged", "code": "4/0x"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])
        self.assertIn("فشل", response.content.decode("utf-8"))

    def test_callback_survives_the_origin_gate_like_a_real_google_redirect(self):
        # A top-level consent redirect carries no Origin header — the bare
        # client must reach the view instead of the middleware's 403.
        from django.test import Client
        response = Client().get(
            "/api/admin/video-drive/oauth/callback", {"state": "forged", "code": "4/0x"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("فشل", response.content.decode("utf-8"))

    def test_callback_lands_a_page_without_secrets_every_credential_free(self):
        from features.videohosting.models import DriveAuthState
        from features.videohosting import oauthdrive
        raw_state = "state-abc"
        DriveAuthState.objects.create(
            state_hash=hashlib.sha256(raw_state.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        token_reply = b'{"access_token": "AT", "refresh_token": "RT", "id_token": "%s", "expires_in": 3600}' % \
            base64.urlsafe_b64encode(json.dumps({"email": "owner@example.com"}).encode()).rstrip(b"=")
        scripted = _scripted_http([(200, {}, token_reply)])
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
        from features.videohosting.models import DriveGrant
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
        from features.videohosting.models import DriveGrant
        DriveGrant.objects.create(
            account_email="owner@example.com", refresh_token="rt",
            access_token="at", access_token_expires_at=timezone.now() + timedelta(hours=1),
        )
        authenticate(self.client, make_admin())
        with mock.patch.object(oauthdrive_module.urllib.request, "urlopen",
                               side_effect=AssertionError("disconnect must not hang on Google")):
            response = self.client.post("/api/admin/video-drive/oauth/disconnect", {})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(DriveGrant.objects.count(), 0)
