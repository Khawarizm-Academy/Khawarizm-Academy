"""Tests for the admin console analytics API."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse

from features.auth import services
from features.common.testing import ApiTestCase, FakeRequest, authenticate, make_admin, make_user


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


class AdminConsoleAnalyticsTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        authenticate(self.client, make_admin())

    def test_login_series_returns_points(self):
        services.open_session(make_user(email="series@example.com"), FakeRequest(), "password")
        body = self.client.get("/api/admin/analytics/logins?days=14").json()
        self.assertEqual(body["days"], 14)
        self.assertTrue(body["points"])

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
