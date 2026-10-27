"""The staged diagnostics — offline shape, env gating, hint coverage."""

from __future__ import annotations

from unittest import mock

from features.common.testing import ApiTestCase
from features.videohosting import diagnostics
from features.videohosting.models import DriveGrant
from features.videohosting.providers import google_drive

from features.videohosting.tests.helpers import drive_grant


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
        drive_grant()
        with mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_ID", "cid"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_CLIENT_SECRET", "secret"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_ROOT_FOLDER_ID", "FOLDER"), \
             mock.patch.object(diagnostics.settings, "GOOGLE_DRIVE_OAUTH_REDIRECT_URI", "http://cb"), \
             mock.patch.object(google_drive, "access_token",
                               return_value=(True, "BEAR", "استخدم access token المخزَّن.")) as fake_token, \
             mock.patch.object(google_drive, "upload_probe",
                               return_value=(False, "تعذّر الكتابة — راجع صلاحيات الحساب")) as fake_probe:
            group = diagnostics.drive_group(deep=True)
        by_id = {c.id: c for c in group.checks}
        self.assertTrue(by_id["drive_token"].ok)
        self.assertFalse(by_id["drive_probe"].ok)
        fake_token.assert_called_once()
        fake_probe.assert_called_once()
