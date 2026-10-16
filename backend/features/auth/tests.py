"""Tests for the auth feature — users, roles, sessions, and endpoints."""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import timedelta

from django.conf import settings
from django.contrib import admin
from django.core.exceptions import FieldDoesNotExist
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from features.auth import firebase, services
from features.auth.models import AuthEvent, InstructorProfile, StudentProfile, User, UserSession
from features.auth.serializers import session_payload, user_profile
from features.common.choices import AuthProvider, Role, SessionRevokeReason
from features.common.testing import ApiTestCase, FakeRequest, authenticate, make_admin, make_user

IPHONE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)


class UserModelTests(TestCase):
    def test_str_prefers_full_name(self):
        self.assertEqual(str(make_user(full_name="Ahmed")), "Ahmed")

    def test_str_falls_back_to_email(self):
        self.assertEqual(str(make_user(full_name="")), "test.learner@example.com")

    def test_primary_key_is_a_uuid(self):
        user = make_user()
        self.assertEqual(user._meta.pk.name, "id")
        self.assertEqual(len(str(user.id)), 36)

    def test_email_is_the_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, "email")

    def test_has_no_username_field(self):
        with self.assertRaises(FieldDoesNotExist):
            User._meta.get_field("username")

    def test_is_admin_true_for_admin_role_or_staff(self):
        self.assertTrue(make_user(email="a@example.com", role=Role.ADMIN).is_admin)
        self.assertTrue(make_user(email="b@example.com", is_staff=True).is_admin)
        self.assertFalse(make_user(email="c@example.com").is_admin)


class ProfileServiceTests(TestCase):
    def test_ensure_profile_creates_a_student_profile(self):
        user = make_user()
        services.ensure_profile(user)
        self.assertTrue(StudentProfile.objects.filter(user=user).exists())

    def test_ensure_profile_creates_an_instructor_profile(self):
        user = make_user(email="ins@example.com", role=Role.INSTRUCTOR)
        services.ensure_profile(user)
        self.assertTrue(InstructorProfile.objects.filter(user=user).exists())


class UserProfileSerializerTests(TestCase):
    def test_maps_model_fields_to_camel_case(self):
        user = make_user(full_name="Ahmed", phone="+966 55")
        services.ensure_profile(user)
        payload = user_profile(user)
        self.assertEqual(payload["fullName"], "Ahmed")
        self.assertEqual(payload["phone"], "+966 55")
        self.assertEqual(payload["role"], Role.STUDENT)

    def test_includes_identity_and_preference_keys(self):
        user = make_user()
        services.ensure_profile(user)
        keys = user_profile(user).keys()
        for key in ("id", "email", "role", "learningLevel", "interests", "notifications", "language", "timezone"):
            self.assertIn(key, keys)


class SessionServiceTests(TestCase):
    def test_open_session_creates_a_session_tokens_and_an_event(self):
        user = make_user()
        session, access, refresh = services.open_session(user, FakeRequest(), "password")
        self.assertTrue(session.is_active)
        self.assertTrue(access)
        self.assertTrue(refresh)
        self.assertEqual(AuthEvent.objects.filter(kind="login").count(), 1)

    def test_single_device_revokes_the_previous_session(self):
        user = make_user()
        first, _, _ = services.open_session(user, FakeRequest("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"), "password")
        second, _, _ = services.open_session(user, FakeRequest(IPHONE_UA), "password")
        first.refresh_from_db()
        self.assertFalse(first.is_active)
        self.assertEqual(first.revoked_reason, SessionRevokeReason.SIGNED_IN_ELSEWHERE)
        self.assertTrue(second.is_active)

    def test_session_footprint_is_parsed(self):
        user = make_user()
        session, _, _ = services.open_session(user, FakeRequest(IPHONE_UA), "password")
        self.assertEqual(session.device_type, "mobile")
        self.assertEqual(session.os, "iOS")
        self.assertIn("Safari", session.browser)


class SessionSerializerTests(TestCase):
    def test_payload_marks_the_current_session(self):
        user = make_user()
        session, _, _ = services.open_session(user, FakeRequest(), "password")
        payload = session_payload(session, session.id)
        self.assertTrue(payload["isCurrent"])
        self.assertEqual(payload["id"], str(session.id))


class AuthViewTests(ApiTestCase):
    def test_me_requires_auth(self):
        self.assertIn(self.client.get("/api/auth/me").status_code, (401, 403))

    def test_me_returns_the_signed_in_user(self):
        user = make_user()
        authenticate(self.client, user)
        body = self.client.get("/api/auth/me").json()
        self.assertEqual(body["email"], user.email)
        self.assertEqual(body["role"], user.role)

    def test_config_advertises_the_providers(self):
        body = self.client.get("/api/auth/config").json()
        self.assertEqual(body["providers"], ["password", "google", "facebook"])

    def test_config_reports_whether_dev_tokens_are_accepted(self):
        body = self.client.get("/api/auth/config").json()
        self.assertEqual(body["devAuth"], settings.FIREBASE_ALLOW_DEV_TOKENS and not settings.FIREBASE_PROJECT_ID)

    @override_settings(
        FIREBASE_PROJECT_ID="demo-project",
        FIREBASE_API_KEY="key-123",
        FIREBASE_AUTH_DOMAIN="demo-project.firebaseapp.com",
    )
    def test_config_serves_the_web_config_the_console_prints(self):
        body = self.client.get("/api/auth/config").json()["firebase"]

        self.assertEqual(
            body,
            {
                "apiKey": "key-123",
                "authDomain": "demo-project.firebaseapp.com",
                "projectId": "demo-project",
            },
        )

    @override_settings(FIREBASE_PROJECT_ID="demo-project", FIREBASE_ALLOW_DEV_TOKENS=True)
    def test_a_configured_project_turns_the_dev_fallback_off(self):
        # Both the fallback and the project id are on; the project id must win.
        self.assertFalse(self.client.get("/api/auth/config").json()["devAuth"])

    @override_settings(FIREBASE_PROJECT_ID="", FIREBASE_API_KEY="", FIREBASE_AUTH_DOMAIN="")
    def test_config_ships_no_keys_until_a_project_is_pasted_in(self):
        self.assertEqual(self.client.get("/api/auth/config").json()["firebase"], {})

    def test_dev_login_returns_tokens_for_a_new_user(self):
        body = self.client.post("/api/auth/firebase", {"idToken": "dev:new@example.com"}, format="json").json()
        self.assertIn("accessToken", body)
        self.assertIn("refreshToken", body)
        self.assertEqual(body["user"]["email"], "new@example.com")
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_dev_login_can_assign_a_role(self):
        body = self.client.post("/api/auth/firebase", {"idToken": "dev:teach@example.com:instructor"}, format="json").json()
        self.assertEqual(body["user"]["role"], Role.INSTRUCTOR)

    def test_refresh_rotates_the_token(self):
        body = self.client.post("/api/auth/firebase", {"idToken": "dev:rot@example.com"}, format="json").json()
        rotated = self.client.post("/api/auth/refresh", {"refreshToken": body["refreshToken"]}, format="json").json()
        self.assertIn("accessToken", rotated)
        self.assertNotEqual(rotated["refreshToken"], body["refreshToken"])

    def test_logout_revokes_the_session(self):
        user = make_user()
        _, session = authenticate(self.client, user)
        self.client.post("/api/auth/logout", {}, format="json")
        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_sessions_list_marks_the_current_device(self):
        user = make_user()
        _, session = authenticate(self.client, user)
        body = self.client.get("/api/auth/sessions").json()
        self.assertEqual(body["sessions"][0]["id"], str(session.id))
        self.assertTrue(body["sessions"][0]["isCurrent"])

    def test_signed_in_elsewhere_surfaces_the_reason_code(self):
        user = make_user()
        authenticate(self.client, user)
        services.open_session(user, FakeRequest(IPHONE_UA), "password")
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "signed_in_elsewhere")


class AuthSessionLifecycleTests(ApiTestCase):
    """A refresh token is single-use, and a revoked session dies instantly."""

    def _login(self, email: str) -> dict:
        return self.client.post("/api/auth/firebase", {"idToken": f"dev:{email}"}, format="json").json()

    def test_a_refresh_token_cannot_be_replayed(self):
        first = self._login("once@example.com")
        self.client.post("/api/auth/refresh", {"refreshToken": first["refreshToken"]}, format="json")

        replay = self.client.post("/api/auth/refresh", {"refreshToken": first["refreshToken"]}, format="json")

        self.assertEqual(replay.status_code, 401)
        self.assertEqual(replay.json()["code"], "session_invalid")

    def test_an_unknown_refresh_token_is_rejected(self):
        response = self.client.post("/api/auth/refresh", {"refreshToken": "not-a-real-token"}, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "session_invalid")

    def test_refresh_without_a_token_is_a_bad_request(self):
        self.assertEqual(self.client.post("/api/auth/refresh", {}, format="json").status_code, 400)

    def test_a_session_past_its_window_cannot_be_refreshed(self):
        body = self._login("old@example.com")
        UserSession.objects.update(expires_at=timezone.now() - timedelta(days=1))

        response = self.client.post("/api/auth/refresh", {"refreshToken": body["refreshToken"]}, format="json")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "expired")

    def test_a_logged_out_token_dies_before_it_expires(self):
        authenticate(self.client, make_user())
        self.client.post("/api/auth/logout", {}, format="json")

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "logout")

    def test_the_refresh_token_dies_with_the_session_it_belonged_to(self):
        body = self._login("gone@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {body['accessToken']}")
        self.client.post("/api/auth/logout", {}, format="json")

        response = self.client.post("/api/auth/refresh", {"refreshToken": body["refreshToken"]}, format="json")

        self.assertEqual(response.status_code, 401)

    def test_the_device_list_only_shows_your_own_devices(self):
        make_user(email="theirs@example.com")
        _, own_session = authenticate(self.client, make_user(email="mine@example.com"))

        body = self.client.get("/api/auth/sessions").json()

        self.assertEqual([row["id"] for row in body["sessions"]], [str(own_session.id)])

    def test_you_can_only_revoke_your_own_devices(self):
        victim_session, _, _ = services.open_session(make_user(email="victim@example.com"), FakeRequest(), "password")
        authenticate(self.client, make_user(email="bystander@example.com"))

        response = self.client.post(f"/api/auth/sessions/{victim_session.id}/revoke", {}, format="json")

        self.assertEqual(response.status_code, 404)
        victim_session.refresh_from_db()
        self.assertTrue(victim_session.is_active)

    def test_a_deactivated_account_loses_its_session(self):
        user = make_user()
        authenticate(self.client, user)
        User.objects.filter(pk=user.pk).update(is_active=False)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "revoked_by_admin")


class FirebaseVerificationTests(TestCase):
    """The switch between a real project and the local `dev:` fallback."""

    def tearDown(self):
        # The Admin SDK caches one app per process; drop it so tests stay independent.
        import firebase_admin

        firebase_admin._apps.clear()

    @override_settings(FIREBASE_PROJECT_ID="", FIREBASE_ALLOW_DEV_TOKENS=True)
    def test_a_dev_token_is_accepted_while_no_project_is_configured(self):
        identity = firebase.verify_id_token("dev:someone@example.com")

        self.assertEqual(identity["email"], "someone@example.com")
        self.assertEqual(identity["provider"], AuthProvider.DEV)

    @override_settings(FIREBASE_PROJECT_ID="", FIREBASE_ALLOW_DEV_TOKENS=True)
    def test_a_dev_token_can_carry_a_role(self):
        identity = firebase.verify_id_token("dev:teach@example.com:instructor")

        self.assertEqual(identity["role"], Role.INSTRUCTOR)

    @override_settings(FIREBASE_PROJECT_ID="", FIREBASE_ALLOW_DEV_TOKENS=True)
    def test_a_dev_token_without_an_email_is_refused(self):
        with self.assertRaises(firebase.FirebaseError):
            firebase.verify_id_token("dev:")

    @override_settings(FIREBASE_PROJECT_ID="", FIREBASE_ALLOW_DEV_TOKENS=False)
    def test_a_dev_token_is_refused_once_the_fallback_is_switched_off(self):
        with self.assertRaises(firebase.FirebaseError):
            firebase.verify_id_token("dev:someone@example.com")

    @override_settings(FIREBASE_PROJECT_ID="demo-project", FIREBASE_ALLOW_DEV_TOKENS=True)
    def test_a_dev_token_loses_to_a_configured_project(self):
        # The project id wins, so the string goes to the Admin SDK and comes back refused.
        with self.assertRaises(firebase.FirebaseError):
            firebase.verify_id_token("dev:someone@example.com")


class FirebaseSettingsGuardTests(TestCase):
    """A half-filled Firebase config must stop the boot, not the browser."""

    def _boot(self, **env_overrides) -> subprocess.CompletedProcess:
        """Import the real settings in a clean process, exactly like `runserver`."""
        return subprocess.run(
            [sys.executable, "-c", "import django; django.setup()"],
            cwd=settings.BASE_DIR,
            env={
                **os.environ,
                "DJANGO_SETTINGS_MODULE": "config.settings",
                "DJANGO_ENV": "development",
                **env_overrides,
            },
            capture_output=True,
            text=True,
        )

    def test_a_project_id_without_a_web_config_refuses_to_boot(self):
        result = self._boot(FIREBASE_PROJECT_ID="demo-project", FIREBASE_API_KEY="", FIREBASE_AUTH_DOMAIN="")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FIREBASE_API_KEY", result.stderr)

    def test_a_complete_config_boots(self):
        result = self._boot(
            FIREBASE_PROJECT_ID="demo-project",
            FIREBASE_API_KEY="key-123",
            FIREBASE_AUTH_DOMAIN="demo-project.firebaseapp.com",
        )

        self.assertEqual(result.returncode, 0, result.stderr)


class AuthUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("auth-me"), "/api/auth/me")
        self.assertEqual(reverse("auth-firebase"), "/api/auth/firebase")
        self.assertEqual(reverse("auth-refresh"), "/api/auth/refresh")
        self.assertEqual(reverse("auth-logout"), "/api/auth/logout")


class AuthAdminTests(TestCase):
    def test_user_and_session_are_registered(self):
        self.assertTrue(admin.site.is_registered(User))
        self.assertTrue(admin.site.is_registered(UserSession))


class AdminConsoleViewTests(ApiTestCase):
    def test_requires_admin(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/overview").status_code, 403)

    def test_overview_counts_users(self):
        authenticate(self.client, make_admin())
        make_user(email="s2@example.com")
        body = self.client.get("/api/admin/overview").json()
        self.assertGreaterEqual(body["users"]["total"], 2)

    def test_user_list_filters_by_query(self):
        authenticate(self.client, make_admin())
        make_user(email="findme@example.com", full_name="Find Me")
        body = self.client.get("/api/admin/users?q=findme").json()
        self.assertEqual(body["results"][0]["email"], "findme@example.com")

    def test_role_change_updates_staff_flag(self):
        authenticate(self.client, make_admin())
        target = make_user(email="promote@example.com")
        body = self.client.post(f"/api/admin/users/{target.id}/role", {"role": "instructor"}, format="json").json()
        self.assertEqual(body["role"], "instructor")
        target.refresh_from_db()
        self.assertEqual(target.role, "instructor")

    def test_admin_cannot_change_own_role(self):
        admin = make_admin()
        authenticate(self.client, admin)
        response = self.client.post(f"/api/admin/users/{admin.id}/role", {"role": "student"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_sessions_list_requires_admin(self):
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/admin/sessions").status_code, 403)

    def test_admin_can_revoke_a_session(self):
        admin = make_admin()
        target = make_user(email="device@example.com")
        session, _, _ = services.open_session(target, FakeRequest(), "password")
        authenticate(self.client, admin)
        self.client.post(f"/api/admin/sessions/{session.id}/revoke", {}, format="json")
        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_device_breakdown_groups_sessions(self):
        admin = make_admin()
        authenticate(self.client, admin)
        services.open_session(make_user(email="d1@example.com"), FakeRequest(IPHONE_UA), "password")
        body = self.client.get("/api/admin/analytics/devices").json()
        self.assertTrue(any(row["key"] == "mobile" for row in body["deviceType"]))
