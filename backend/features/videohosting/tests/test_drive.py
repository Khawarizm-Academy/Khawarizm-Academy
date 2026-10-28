"""Google Drive pipeline tests — credentials, resumable upload, probe, OAuth dance."""

from __future__ import annotations

import json
import tempfile
import urllib.parse
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.utils import timezone

from features.common.testing import ApiTestCase
from features.videohosting import drive_oauth
from features.videohosting.models import DriveAuthState, DriveGrant
from features.videohosting.providers import google_drive
from features.videohosting.tests.helpers import ScriptedDriveHTTP, banked_state, drive_grant, google_id_token


class GoogleDriveCredentialsTests(ApiTestCase):
    def test_missing_keys_fail_loudly_naming_them(self):
        with mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_ID", ""):
            with self.assertRaises(ValueError) as ctx:
                google_drive.credentials()
        self.assertIn("GOOGLE_DRIVE_CLIENT_ID", str(ctx.exception))

    def test_uploads_without_a_stored_grant_require_authorization_first(self):
        # The grant lives in DriveGrant now — no row means the admin must
        # authorize a Google account before any upload attempt.
        DriveGrant.objects.all().delete()
        with (
            mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
        ):
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file("/tmp/x.mp4")
        self.assertIn("تخويل", str(ctx.exception))


class GoogleDriveUploadServiceTests(ApiTestCase):
    def test_resumable_upload_sessions_chunks_and_reports_progress(self):
        scripted = ScriptedDriveHTTP(
            [
                (200, {"Location": "https://upload.session/1"}, b""),  # session open
                (308, {}, b""),  # chunk 1 accepted
                (308, {}, b""),  # chunk 2 accepted
                (200, {}, b'{"id": "FILE123"}'),  # final chunk creates the file
            ]
        )
        ticks = []

        drive_grant()
        with (
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
            mock.patch.object(google_drive, "CHUNK_BYTES", 256),
            mock.patch.object(google_drive.urllib.request, "urlopen", scripted),
        ):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            uploaded = google_drive.GoogleDriveService().upload_file(
                str(fake_bin), caption="source · x", on_bytes=lambda done, total: ticks.append((done, total))
            )

        parts = uploaded["parts"]
        self.assertEqual(parts[0]["file_id"], "FILE123")
        self.assertEqual(parts[0]["size_bytes"], 600)
        ranges = [call.headers.get("Content-range") for call in scripted.calls if call.get_method() == "PUT"]
        self.assertEqual(ranges, ["bytes 0-255/*", "bytes 256-511/*", "bytes 512-599/600"])
        session_open = next(call for call in scripted.calls if "resumable" in call.full_url)
        self.assertIn("FOLDER1", session_open.data.decode("utf-8"))
        self.assertEqual(ticks, [(256, 600), (512, 600), (600, 600)])

    def test_a_308_on_the_final_chunk_fails_loudly(self):
        # An intermediate 308 is the protocol's keep-going; a 308 after the
        # last chunk means Drive did not finish — name it, never mask it.
        scripted = ScriptedDriveHTTP(
            [
                (200, {"Location": "https://upload.session/2"}, b""),
                (308, {}, b""),
                (308, {}, b""),
            ]
        )
        drive_grant()
        with (
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
            mock.patch.object(google_drive.urllib.request, "urlopen", scripted),
        ):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file(str(fake_bin))
        self.assertIn("آخر مقطع", str(ctx.exception))

    def test_a_permissions_refusal_names_the_share_fix(self):
        # A grant cannot touch a folder it is not Editor on: Google refuses the
        # session open and the error must route the operator to the share.
        quota_body = json.dumps(
            {"error": {"message": "The user does not have sufficient permissions with respect to this file."}}
        ).encode("utf-8")
        scripted = ScriptedDriveHTTP(
            [
                (403, {}, quota_body),
            ]
        )
        drive_grant()
        with (
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
            mock.patch.object(google_drive.urllib.request, "urlopen", scripted),
        ):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file(str(fake_bin))
        self.assertIn("Editor", str(ctx.exception))


class DriveUploadProbeTests(ApiTestCase):
    """The deep check's 1-byte write — the only test that proves the folder works."""

    def test_probe_writes_one_byte_and_cleans_up(self):
        scripted = ScriptedDriveHTTP(
            [
                (200, {"Location": "https://upload.session/9"}, b""),
                (200, {}, b'{"id": "PROBE1"}'),
                (204, {}, b""),
            ]
        )
        drive_grant()
        with (
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
            mock.patch.object(google_drive.urllib.request, "urlopen", scripted),
        ):
            okay, detail = google_drive.upload_probe()
        self.assertTrue(okay)
        self.assertIn("1 بايت", detail)
        self.assertIn("حذف", detail)
        self.assertEqual(scripted.calls[-1].get_method(), "DELETE")

    def test_probe_surfaces_the_refusal_with_its_fix(self):
        quota_body = json.dumps(
            {"error": {"message": "The user does not have sufficient permissions with respect to this file."}}
        ).encode("utf-8")
        scripted = ScriptedDriveHTTP(
            [
                (403, {}, quota_body),
            ]
        )
        drive_grant()
        with (
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"),
            mock.patch.object(google_drive.urllib.request, "urlopen", scripted),
        ):
            okay, detail = google_drive.upload_probe()
        self.assertFalse(okay)
        self.assertIn("Editor", detail)


class DriveOAuthTests(ApiTestCase):
    """The consent dance — state CSRF, exchange, persistence, and the refresh."""

    def test_consent_url_banks_a_single_use_state(self):
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"),
        ):
            url = drive_oauth.consent_url()
        self.assertIn("accounts.google.com/o/oauth2/v2/auth", url)
        query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        self.assertEqual(query["access_type"], ["offline"])
        self.assertEqual(query["prompt"], ["consent"])
        self.assertIn("drive.file", query["scope"][0])
        self.assertIn("redirect_uri=http%3A%2F%2Fcb", url)
        # Only the state's hash is stored — the raw value rides the URL alone.
        self.assertTrue(DriveAuthState.objects.filter(state_hash=drive_oauth._hash(query["state"][0])).exists())
        self.assertFalse(DriveAuthState.objects.filter(state_hash=query["state"][0]).exists())

    def test_complete_rejects_an_unknown_state_without_touching_the_network(self):
        def boom(*args, **kwargs):
            raise AssertionError("a bad state must die before any Google call")

        DriveGrant.objects.all().delete()
        with mock.patch.object(drive_oauth.urllib.request, "urlopen", boom):
            okay, _email, detail = drive_oauth.complete("forged", "4/0CODE")
        self.assertFalse(okay)
        self.assertIn("state", detail)
        self.assertEqual(DriveGrant.objects.count(), 0)

    def test_complete_rejects_an_expired_state(self):
        raw = "expired-state"
        DriveAuthState.objects.create(
            state_hash=drive_oauth._hash(raw), expires_at=timezone.now() - timedelta(seconds=1)
        )
        okay, _email, detail = drive_oauth.complete(raw, "4/0CODE")
        self.assertFalse(okay)
        self.assertIn("state", detail)

    def test_complete_stores_a_single_use_state_only_once(self):
        # A replayed callback (same state twice) loses the second time.
        scripted = ScriptedDriveHTTP(
            [
                (
                    200,
                    {},
                    json.dumps(
                        {
                            "access_token": "AT-1",
                            "refresh_token": "RT-1",
                            "expires_in": 3600,
                            "scope": "https://www.googleapis.com/auth/drive.file",
                            "id_token": google_id_token("owner@example.com"),
                        }
                    ).encode("utf-8"),
                ),
            ]
        )
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"),
            mock.patch.object(drive_oauth.urllib.request, "urlopen", scripted),
        ):
            state = banked_state()
            okay, email, detail = drive_oauth.complete(state, "4/0CODE")
        self.assertTrue(okay)
        self.assertEqual(email, "owner@example.com")
        grant = DriveGrant.objects.get()
        self.assertEqual(grant.refresh_token, "RT-1")
        self.assertEqual(grant.access_token, "AT-1")
        # The verdict never carries a credential — no token, nothing reusable.
        self.assertNotIn("RT-1", detail)
        self.assertNotIn("AT-1", detail)
        self.assertEqual(DriveAuthState.objects.count(), 0)
        # The state is spent: a replayed callback fails without a new exchange.
        self.assertEqual(len(scripted.calls), 1)
        replay_okay, _email, replayed_detail = drive_oauth.complete(state, "4/0CODE")
        self.assertFalse(replay_okay)
        self.assertIn("state", replayed_detail)

    def test_a_regrant_without_a_refresh_token_keeps_the_old_one(self):
        # Google omits refresh_token on re-consent — the stored grant survives.
        drive_grant()
        scripted = ScriptedDriveHTTP(
            [
                (
                    200,
                    {},
                    json.dumps(
                        {
                            "access_token": "AT-2",
                            "expires_in": 3600,
                            "scope": "https://www.googleapis.com/auth/drive.file",
                            "id_token": google_id_token("owner@example.com"),
                        }
                    ).encode("utf-8"),
                ),
            ]
        )
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"),
            mock.patch.object(drive_oauth.urllib.request, "urlopen", scripted),
        ):
            state = banked_state()
            okay, _email, _detail = drive_oauth.complete(state, "4/0CODE")
        self.assertTrue(okay)
        grant = DriveGrant.objects.get()
        self.assertEqual(grant.refresh_token, "rt-fixed")
        self.assertEqual(grant.access_token, "AT-2")

    def test_a_refused_code_reports_google_s_own_words(self):
        scripted = ScriptedDriveHTTP(
            [
                (
                    400,
                    {},
                    json.dumps({"error": "invalid_grant", "error_description": "Code was already redeemed."}).encode(
                        "utf-8"
                    ),
                )
            ]
        )
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"),
            mock.patch.object(drive_oauth.urllib.request, "urlopen", scripted),
        ):
            state = banked_state()
            okay, _email, detail = drive_oauth.complete(state, "4/0SPENT")
        self.assertFalse(okay)
        self.assertIn("already redeemed", detail)
        self.assertEqual(DriveGrant.objects.count(), 0)

    def test_access_token_requires_a_stored_grant(self):
        DriveGrant.objects.all().delete()
        okay, bearer, detail = drive_oauth.access_token()
        self.assertFalse(okay)
        self.assertEqual(bearer, "")
        self.assertIn("تخويل", detail)

    def test_a_fresh_cached_token_never_touches_the_network(self):
        drive_grant()

        def boom(*args, **kwargs):
            raise AssertionError("a fresh cached token must not refresh over the network")

        with mock.patch.object(drive_oauth.urllib.request, "urlopen", boom):
            okay, bearer, _detail = drive_oauth.access_token()
        self.assertTrue(okay)
        self.assertEqual(bearer, "BEAR")

    def test_an_expired_cached_token_refreshes_against_the_stored_grant(self):
        grant = drive_grant()
        grant.access_token_expires_at = timezone.now() - timedelta(seconds=1)
        grant.save(update_fields=["access_token_expires_at"])
        scripted = ScriptedDriveHTTP(
            [(200, {}, json.dumps({"access_token": "AT-3", "expires_in": 3600}).encode("utf-8"))]
        )
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.urllib.request, "urlopen", scripted),
        ):
            okay, bearer, _detail = drive_oauth.access_token()
        self.assertTrue(okay)
        self.assertEqual(bearer, "AT-3")
        grant.refresh_from_db()
        self.assertEqual(grant.access_token, "AT-3")
        body = scripted.calls[0].data.decode("utf-8")
        self.assertIn("refresh_token=rt-fixed", body)
        self.assertIn("grant_type=refresh_token", body)

    def test_an_invalid_grant_marks_the_row_revoked(self):
        grant = drive_grant()
        grant.access_token_expires_at = timezone.now() - timedelta(seconds=1)
        grant.save(update_fields=["access_token_expires_at"])
        scripted = ScriptedDriveHTTP(
            [
                (
                    400,
                    {},
                    json.dumps(
                        {"error": "invalid_grant", "error_description": "Token has been expired or revoked."}
                    ).encode("utf-8"),
                )
            ]
        )
        with (
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"),
            mock.patch.object(drive_oauth.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"),
            mock.patch.object(drive_oauth.urllib.request, "urlopen", scripted),
        ):
            okay, _bearer, detail = drive_oauth.access_token()
        self.assertFalse(okay)
        self.assertIn("تخويل", detail)
        grant.refresh_from_db()
        self.assertEqual(grant.status, DriveGrant.Status.REVOKED)
        self.assertIn("أعد التخويل", grant.error_message)

    def test_connected_reports_email_and_status_only(self):
        drive_grant()
        payload = drive_oauth.connected()
        self.assertEqual(payload["connected"], True)
        self.assertEqual(payload["account_email"], "owner@example.com")
        text = json.dumps(payload)
        self.assertNotIn("BEAR", text)
        self.assertNotIn("rt-fixed", text)

    def test_revoke_drops_the_row_even_when_google_fails(self):
        def boom(*args, **kwargs):
            raise AssertionError("the best-effort Google revoke must swallow network failures")

        drive_grant()
        with mock.patch.object(drive_oauth.urllib.request, "urlopen", boom):
            drive_oauth.revoke()
        self.assertEqual(DriveGrant.objects.count(), 0)
