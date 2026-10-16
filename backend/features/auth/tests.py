"""Tests for the auth feature — users, roles, sessions, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.core.exceptions import FieldDoesNotExist
from django.test import TestCase
from django.urls import reverse

from features.auth import services
from features.auth.models import AuthEvent, InstructorProfile, StudentProfile, User, UserSession
from features.auth.serializers import session_payload, user_profile
from features.common.choices import Role, SessionRevokeReason
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
