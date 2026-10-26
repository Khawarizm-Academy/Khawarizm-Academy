"""Video hosting tests — models, tokens, serializers, and the streaming routes.

Telegram is never contacted: segment rows carry a cached `file_path`, and the
key endpoint serves the stored AES key directly.
"""

from __future__ import annotations

import hashlib
import base64
import io
import json
import tempfile
import urllib.error
import urllib.parse
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.utils import timezone

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase, authenticate
from features.videohosting import diagnostics, ingest, oauthdrive, packaging, providers, tokens
from features.videohosting.models import DriveAuthState, DriveGrant, StreamToken, VideoAsset, VideoProvider, VideoRendition, VideoSegment
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
        with mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_ID", ""):
            with self.assertRaises(ValueError) as ctx:
                google_drive.credentials()
        self.assertIn("GOOGLE_DRIVE_CLIENT_ID", str(ctx.exception))

    def test_uploads_without_a_stored_grant_require_authorization_first(self):
        # The grant lives in DriveGrant now — no row means the admin must
        # authorize a Google account before any upload attempt.
        DriveGrant.objects.all().delete()
        with mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(google_drive.settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"):
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file("/tmp/x.mp4")
        self.assertIn("تخويل", str(ctx.exception))


class _FakeDriveResponse:
    """The slice of urllib's response the uploader touches."""

    def __init__(self, status, headers=None, body=b""):
        self.status = status
        self.headers = headers or {}
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _drive_grant(bearer: str = "BEAR") -> DriveGrant:
    """One stored Google grant with a fresh cached access token — no network.

    The upload grants need `refresh_token`, so the row mirrors what Google's
    consent callback writes; tests stop at the Drive-call script.
    """
    return DriveGrant.objects.create(
        account_email="owner@example.com",
        refresh_token="rt-fixed",
        access_token=bearer,
        access_token_expires_at=timezone.now() + timedelta(hours=1),
    )


def _google_id_token(email: str) -> str:
    """A three-part id_token whose middle section carries the email claim."""
    payload = base64.urlsafe_b64encode(json.dumps({"email": email}).encode("utf-8")).rstrip(b"=").decode("ascii")
    return f"header.{payload}.signature"


def _banked_state() -> str:
    """Run consent_url() and hand back the raw CSRF state it banked."""
    url = oauthdrive.consent_url()
    return urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["state"][0]


class _ScriptedDriveHTTP:
    """A urlopen stand-in answering from a script: (status, headers, body)."""

    def __init__(self, steps):
        self.steps = list(steps)
        self.calls = []

    def __call__(self, request, timeout=0):
        self.calls.append(request)
        status, headers, payload = self.steps.pop(0)
        if status == 308:
            # urllib's default opener has no 308 handler, so a live resume
            # tick arrives as an HTTPError — the stand-in mirrors that.
            raise urllib.error.HTTPError(request.full_url, 308, "Resume Incomplete", headers, None)
        if status >= 400:
            # Errors never flow through either: they raise with a readable body.
            raise urllib.error.HTTPError(request.full_url, status, "http impl error", headers, io.BytesIO(payload))
        return _FakeDriveResponse(status, headers, payload)


class GoogleDriveUploadServiceTests(ApiTestCase):
    def test_resumable_upload_sessions_chunks_and_reports_progress(self):
        scripted = _ScriptedDriveHTTP([
            (200, {"Location": "https://upload.session/1"}, b""),  # session open
            (308, {}, b""),                                   # chunk 1 accepted
            (308, {}, b""),                                   # chunk 2 accepted
            (200, {}, b'{"id": "FILE123"}'),                  # final chunk creates the file
        ])
        ticks = []

        _drive_grant()
        with mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"), \
             mock.patch.object(google_drive, "CHUNK_BYTES", 256), \
             mock.patch.object(google_drive.urllib.request, "urlopen", scripted):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            uploaded = google_drive.GoogleDriveService().upload_file(str(fake_bin), caption="source · x", on_bytes=lambda done, total: ticks.append((done, total)))

        parts = uploaded["parts"]
        self.assertEqual(parts[0]["file_id"], "FILE123")
        self.assertEqual(parts[0]["size_bytes"], 600)
        ranges = [call.headers.get("Content-range") for call in scripted.calls if call.get_method() == "PUT"]
        self.assertEqual(ranges, ["bytes 0-255/*", "bytes 256-511/*", "bytes 512-599/600"])
        session_open = [call for call in scripted.calls if "resumable" in call.full_url][0]
        self.assertIn("FOLDER1", session_open.data.decode("utf-8"))
        self.assertEqual(ticks, [(256, 600), (512, 600), (600, 600)])

    def test_a_308_on_the_final_chunk_fails_loudly(self):
        # An intermediate 308 is the protocol's keep-going; a 308 after the
        # last chunk means Drive did not finish — name it, never mask it.
        scripted = _ScriptedDriveHTTP([
            (200, {"Location": "https://upload.session/2"}, b""),
            (308, {}, b""),
            (308, {}, b""),
        ])
        _drive_grant()
        with mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"), \
             mock.patch.object(google_drive.urllib.request, "urlopen", scripted):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file(str(fake_bin))
        self.assertIn("آخر مقطع", str(ctx.exception))

    def test_a_permissions_refusal_names_the_share_fix(self):
        # A grant cannot touch a folder it is not Editor on: Google refuses the
        # session open and the error must route the operator to the share.
        quota_body = json.dumps({
            "error": {"message": "The user does not have sufficient permissions with respect to this file."}
        }).encode("utf-8")
        scripted = _ScriptedDriveHTTP([
            (403, {}, quota_body),
        ])
        _drive_grant()
        with mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"), \
             mock.patch.object(google_drive.urllib.request, "urlopen", scripted):
            fake_bin = Path(tempfile.mkdtemp()) / "lesson.mp4"
            fake_bin.write_bytes(b"0" * 600)
            with self.assertRaises(RuntimeError) as ctx:
                google_drive.GoogleDriveService().upload_file(str(fake_bin))
        self.assertIn("Editor", str(ctx.exception))


class DriveUploadProbeTests(ApiTestCase):
    """The deep check's 1-byte write — the only test that proves the folder works."""

    def test_probe_writes_one_byte_and_cleans_up(self):
        scripted = _ScriptedDriveHTTP([
            (200, {"Location": "https://upload.session/9"}, b""),
            (200, {}, b'{"id": "PROBE1"}'),
            (204, {}, b""),
        ])
        _drive_grant()
        with mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"), \
             mock.patch.object(google_drive.urllib.request, "urlopen", scripted):
            okay, detail = google_drive.upload_probe()
        self.assertTrue(okay)
        self.assertIn("1 بايت", detail)
        self.assertIn("حذف", detail)
        self.assertEqual(scripted.calls[-1].get_method(), "DELETE")

    def test_probe_surfaces_the_refusal_with_its_fix(self):
        quota_body = json.dumps({
            "error": {"message": "The user does not have sufficient permissions with respect to this file."}
        }).encode("utf-8")
        scripted = _ScriptedDriveHTTP([
            (403, {}, quota_body),
        ])
        _drive_grant()
        with mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER1"), \
             mock.patch.object(google_drive.urllib.request, "urlopen", scripted):
            okay, detail = google_drive.upload_probe()
        self.assertFalse(okay)
        self.assertIn("Editor", detail)


class DriveOAuthTests(ApiTestCase):
    """The consent dance — state CSRF, exchange, persistence, and the refresh."""

    def test_consent_url_banks_a_single_use_state(self):
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"):
            url = oauthdrive.consent_url()
        self.assertIn("accounts.google.com/o/oauth2/v2/auth", url)
        query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        self.assertEqual(query["access_type"], ["offline"])
        self.assertEqual(query["prompt"], ["consent"])
        self.assertIn("drive.file", query["scope"][0])
        self.assertIn("redirect_uri=http%3A%2F%2Fcb", url)
        # Only the state's hash is stored — the raw value rides the URL alone.
        self.assertTrue(DriveAuthState.objects.filter(state_hash=oauthdrive._hash(query["state"][0])).exists())
        self.assertFalse(DriveAuthState.objects.filter(state_hash=query["state"][0]).exists())

    def test_complete_rejects_an_unknown_state_without_touching_the_network(self):
        def boom(*args, **kwargs):
            raise AssertionError("a bad state must die before any Google call")

        DriveGrant.objects.all().delete()
        with mock.patch.object(oauthdrive.urllib.request, "urlopen", boom):
            okay, email, detail = oauthdrive.complete("forged", "4/0CODE")
        self.assertFalse(okay)
        self.assertIn("state", detail)
        self.assertEqual(DriveGrant.objects.count(), 0)

    def test_complete_rejects_an_expired_state(self):
        raw = "expired-state"
        DriveAuthState.objects.create(state_hash=oauthdrive._hash(raw), expires_at=timezone.now() - timedelta(seconds=1))
        okay, _email, detail = oauthdrive.complete(raw, "4/0CODE")
        self.assertFalse(okay)
        self.assertIn("state", detail)

    def test_complete_stores_a_single_use_state_only_once(self):
        # A replayed callback (same state twice) loses the second time.
        scripted = _ScriptedDriveHTTP([
            (200, {}, json.dumps({
                "access_token": "AT-1", "refresh_token": "RT-1", "expires_in": 3600,
                "scope": "https://www.googleapis.com/auth/drive.file",
                "id_token": _google_id_token("owner@example.com"),
            }).encode("utf-8")),
        ])
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            state = _banked_state()
            okay, email, detail = oauthdrive.complete(state, "4/0CODE")
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
        replay_okay, _email, replayed_detail = oauthdrive.complete(state, "4/0CODE")
        self.assertFalse(replay_okay)
        self.assertIn("state", replayed_detail)

    def test_a_regrant_without_a_refresh_token_keeps_the_old_one(self):
        # Google omits refresh_token on re-consent — the stored grant survives.
        _drive_grant()
        scripted = _ScriptedDriveHTTP([(
            200, {}, json.dumps({
                "access_token": "AT-2", "expires_in": 3600,
                "scope": "https://www.googleapis.com/auth/drive.file",
                "id_token": _google_id_token("owner@example.com"),
            }).encode("utf-8")),
        ])
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            state = _banked_state()
            okay, _email, _detail = oauthdrive.complete(state, "4/0CODE")
        self.assertTrue(okay)
        grant = DriveGrant.objects.get()
        self.assertEqual(grant.refresh_token, "rt-fixed")
        self.assertEqual(grant.access_token, "AT-2")

    def test_a_refused_code_reports_google_s_own_words(self):
        scripted = _ScriptedDriveHTTP([(
            400, {}, json.dumps({"error": "invalid_grant", "error_description": "Code was already redeemed."}).encode("utf-8"),
        )])
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            state = _banked_state()
            okay, _email, detail = oauthdrive.complete(state, "4/0SPENT")
        self.assertFalse(okay)
        self.assertIn("already redeemed", detail)
        self.assertEqual(DriveGrant.objects.count(), 0)

    def test_access_token_requires_a_stored_grant(self):
        DriveGrant.objects.all().delete()
        okay, bearer, detail = oauthdrive.access_token()
        self.assertFalse(okay)
        self.assertEqual(bearer, "")
        self.assertIn("تخويل", detail)

    def test_a_fresh_cached_token_never_touches_the_network(self):
        _drive_grant()

        def boom(*args, **kwargs):
            raise AssertionError("a fresh cached token must not refresh over the network")

        with mock.patch.object(oauthdrive.urllib.request, "urlopen", boom):
            okay, bearer, _detail = oauthdrive.access_token()
        self.assertTrue(okay)
        self.assertEqual(bearer, "BEAR")

    def test_an_expired_cached_token_refreshes_against_the_stored_grant(self):
        grant = _drive_grant()
        grant.access_token_expires_at = timezone.now() - timedelta(seconds=1)
        grant.save(update_fields=["access_token_expires_at"])
        scripted = _ScriptedDriveHTTP([(200, {}, json.dumps({"access_token": "AT-3", "expires_in": 3600}).encode("utf-8"))])
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            okay, bearer, _detail = oauthdrive.access_token()
        self.assertTrue(okay)
        self.assertEqual(bearer, "AT-3")
        grant.refresh_from_db()
        self.assertEqual(grant.access_token, "AT-3")
        body = scripted.calls[0].data.decode("utf-8")
        self.assertIn("refresh_token=rt-fixed", body)
        self.assertIn("grant_type=refresh_token", body)

    def test_an_invalid_grant_marks_the_row_revoked(self):
        grant = _drive_grant()
        grant.access_token_expires_at = timezone.now() - timedelta(seconds=1)
        grant.save(update_fields=["access_token_expires_at"])
        scripted = _ScriptedDriveHTTP([(
            400, {}, json.dumps({"error": "invalid_grant", "error_description": "Token has been expired or revoked."}).encode("utf-8"),
        )])
        with mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(oauthdrive.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(oauthdrive.urllib.request, "urlopen", scripted):
            okay, _bearer, detail = oauthdrive.access_token()
        self.assertFalse(okay)
        self.assertIn("تخويل", detail)
        grant.refresh_from_db()
        self.assertEqual(grant.status, DriveGrant.Status.REVOKED)
        self.assertIn("أعد التخويل", grant.error_message)

    def test_connected_reports_email_and_status_only(self):
        _drive_grant()
        payload = oauthdrive.connected()
        self.assertEqual(payload["connected"], True)
        self.assertEqual(payload["account_email"], "owner@example.com")
        text = json.dumps(payload)
        self.assertNotIn("BEAR", text)
        self.assertNotIn("rt-fixed", text)

    def test_revoke_drops_the_row_even_when_google_fails(self):
        def boom(*args, **kwargs):
            raise AssertionError("the best-effort Google revoke must swallow network failures")

        _drive_grant()
        with mock.patch.object(oauthdrive.urllib.request, "urlopen", boom):
            oauthdrive.revoke()
        self.assertEqual(DriveGrant.objects.count(), 0)


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


class DiagnosticsTests(ApiTestCase):
    """The staged validation — offline shape, env gating, and hint coverage."""

    def test_every_failing_check_names_its_fix(self):
        payload = diagnostics.run()
        failing = [c for group in payload["groups"] for c in group["checks"] if not c["ok"]]
        self.assertTrue(failing)
        for item in failing:
            self.assertTrue(item["hint"], f"check {item['id']} failed without a hint")

    def test_providers_gate_on_their_env(self):
        self.assertFalse(diagnostics.provider_available("telegram"))
        self.assertTrue(diagnostics.provider_reason("telegram"))
        with mock.patch.object(diagnostics.settings, "TELEGRAM_API_ID", "12345"), \
             mock.patch.object(diagnostics.settings, "TELEGRAM_API_HASH", "hash"), \
             mock.patch.object(diagnostics.settings, "TELEGRAM_BOT_TOKEN", "111:abc"), \
             mock.patch.object(diagnostics.settings, "TELEGRAM_STREAM_TOKEN", "222:def"), \
             mock.patch.object(diagnostics.settings, "TELEGRAM_CHANNEL_ID", "@channel"):
            self.assertTrue(diagnostics.provider_available("telegram"))
            self.assertEqual(diagnostics.provider_reason("telegram"), "")

    def test_deep_runs_touch_no_network_when_env_is_absent(self):
        def boom(*args, **kwargs):
            raise AssertionError("deep checks must not reach the network without credentials")

        with mock.patch.object(diagnostics.urllib.request, "urlopen", boom):
            payload = diagnostics.run(deep=True)
        telegram = next(group for group in payload["groups"] if group["id"] == "telegram")
        self.assertEqual({c["id"] for c in telegram["checks"]} & {"bot_api", "chat_access"}, set())

    def test_deep_drive_checks_touch_no_network_without_a_grant(self):
        # A configured env with no stored consent stops at the shallow gate —
        # the admin must authorize first; the deep mint never fires.
        def boom(*args, **kwargs):
            raise AssertionError("deep drive checks must not reach the network without a grant")

        DriveGrant.objects.all().delete()
        with mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(diagnostics.urllib.request, "urlopen", boom):
            group = diagnostics.drive_group(deep=True)
        check_ids = {c.id for c in group.checks}
        self.assertEqual(check_ids, {"client_id", "client_secret", "root_folder", "redirect_uri", "oauth_grant"})

    def test_deep_proves_the_grant_token_then_the_write(self):
        # The grant mints, then the 1-byte probe is the folder's verdict —
        # drive.file cannot read folder metadata, so there is no folder GET.
        _drive_grant()
        with mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(diagnostics, "drive_access_token",
                               return_value=(True, "BEAR", "استخدم access token المخزَّن.")) as fake_token, \
             mock.patch.object(diagnostics, "drive_upload_probe",
                               return_value=(False, "تعذّر الكتابة — راجع صلاحيات الحساب")) as fake_probe:
            group = diagnostics.drive_group(deep=True)
        by_id = {c.id: c for c in group.checks}
        self.assertTrue(by_id["drive_token"].ok)
        self.assertFalse(by_id["drive_probe"].ok)
        fake_token.assert_called_once()
        fake_probe.assert_called_once()


class StagingTests(ApiTestCase):
    """--package never / auto-without-ffmpeg stores the source with no FFmpeg."""

    def _telegram_asset(self, slug: str) -> None:
        """These tests study the Telegram ladder, so the row must name it."""
        providers.ensure_defaults()
        VideoAsset.objects.create(slug=slug, provider=VideoProvider.objects.get(code="telegram"))

    def test_never_stages_the_source_without_renditions(self):
        self._telegram_asset("staged-1")
        with mock.patch.object(ingest, "TelegramMediaService", self._fake_service()):
            asset = ingest.ingest_file("missing.mp4", "staged-1", package="never")
        self.assertEqual(asset.status, VideoStatus.STAGED)
        self.assertEqual(asset.source_message_id, 11)
        self.assertEqual(asset.source_size_bytes, 2048)
        self.assertFalse(asset.renditions.all().exists())

    def test_auto_stages_when_ffmpeg_is_missing(self):
        self._telegram_asset("staged-2")
        with mock.patch.object(ingest, "TelegramMediaService", self._fake_service()):
            with mock.patch.object(packaging, "ffmpeg_available", return_value=False):
                asset = ingest.ingest_file("missing.mp4", "staged-2", package="auto")
        self.assertEqual(asset.status, VideoStatus.STAGED)

    def test_force_without_ffmpeg_marks_the_asset_errored(self):
        self._telegram_asset("staged-3")
        with mock.patch.object(ingest, "TelegramMediaService", self._fake_service()):
            with mock.patch.object(packaging, "ffmpeg_available", return_value=False):
                with self.assertRaises(packaging.PackagingError):
                    ingest.ingest_file("missing.mp4", "staged-3", package="force")
        asset = VideoAsset.objects.get(slug="staged-3")
        self.assertEqual(asset.status, VideoStatus.ERROR)
        self.assertIn("ffmpeg", asset.error_message)

    def test_auto_packages_when_ffmpeg_exists(self):
        self._telegram_asset("staged-4")
        with tempfile.TemporaryDirectory() as work:
            fake_result = packaging.PackagingResult(
                master_playlist=MASTER, duration_seconds=90, renditions=[], work_dir=Path(work)
            )
            with mock.patch.object(ingest, "TelegramMediaService", self._fake_service()), \
                 mock.patch.object(packaging, "ffmpeg_available", return_value=True), \
                 mock.patch.object(packaging, "package_video", return_value=fake_result):
                asset = ingest.ingest_file("missing.mp4", "staged-4", package="auto")
        self.assertEqual(asset.status, VideoStatus.READY)
        self.assertEqual(asset.master_playlist, MASTER)

    @staticmethod
    def _fake_service() -> type:
        """A TelegramMediaService stand-in that never touches the network."""

        class FakeTelegramService:
            async def upload_file(self, file_path: str, caption: str = ""):
                return {"is_split": False, "parts": [{"message_id": 11, "file_id": "F", "size_bytes": 2048}]}

        return FakeTelegramService


class StagedTokenGateTests(ApiTestCase):
    def test_staged_asset_explains_what_it_is_waiting_for(self):
        authenticate(self.client)
        make_asset(status=VideoStatus.STAGED)
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 409)
        self.assertIn("التغليف", response.json()["detail"])
