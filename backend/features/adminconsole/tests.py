"""Tests for the admin console analytics API."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse

from features.auth import services
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
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
