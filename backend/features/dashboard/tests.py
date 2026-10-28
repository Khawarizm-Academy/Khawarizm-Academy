"""Tests for the dashboard feature — projections, scoping, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, authenticate, make_course, make_scholarship, make_user
from features.competitions.models import Competition
from features.courses.models import CourseLiveSession
from features.dashboard.models import (
    Certificate,
    DashboardNotification,
    DashboardStat,
    Enrollment,
    FavoriteCourse,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedCompetition,
    SavedScholarship,
    UpcomingEvent,
)

DASHBOARD_MODELS = (
    Certificate,
    DashboardNotification,
    DashboardStat,
    Enrollment,
    FavoriteCourse,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedCompetition,
    SavedScholarship,
    UpcomingEvent,
)


class DashboardModelTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.course = make_course()

    def test_enrollment_str_and_unique_key(self):
        row = Enrollment.objects.create(user=self.user, course=self.course)
        self.assertEqual(str(row), f"{self.user.email}:course-1")
        self.assertEqual(Enrollment._meta.unique_together, (("user", "course"),))

    def test_priority_continue_str(self):
        row = PriorityContinue.objects.create(user=self.user, course=self.course)
        self.assertEqual(str(row), f"{self.user.email}:course-1")

    def test_imminent_live_session_str(self):
        session = CourseLiveSession.objects.create(
            course=self.course, session_id="s1", title="Live", date_label="Sun", time_label="8pm"
        )
        row = ImminentLiveSession.objects.create(user=self.user, session=session)
        self.assertEqual(str(row), f"{self.user.email}:s1")

    def test_dashboard_stat_str_and_defaults(self):
        row = DashboardStat.objects.create(user=self.user)
        self.assertEqual(str(row), f"{self.user.email}:stats")
        self.assertEqual(row.attendance_rate, 98)

    def test_upcoming_event_default_type(self):
        row = UpcomingEvent.objects.create(user=self.user, event_id="e1", title="Exam")
        self.assertEqual(row.event_type, "submission")

    def test_saved_and_favorite_and_competition_and_certificate_rows(self):
        competition = Competition.objects.create(competition_id="k1", title="Comp")
        SavedScholarship.objects.create(user=self.user, scholarship=make_scholarship())
        FavoriteCourse.objects.create(user=self.user, course=self.course)
        SavedCompetition.objects.create(user=self.user, competition=competition)
        Certificate.objects.create(user=self.user, course=self.course)
        self.assertEqual(SavedScholarship.objects.count(), 1)
        self.assertEqual(Certificate.objects.count(), 1)


class DashboardSummaryViewTests(ApiTestCase):
    def test_requires_auth(self):
        self.assertIn(self.client.get("/api/dashboard").status_code, (401, 403))

    def test_empty_summary_returns_nulls_and_empty_events(self):
        authenticate(self.client, make_user())
        body = self.client.get("/api/dashboard").json()
        self.assertEqual(
            body, {"stats": None, "priorityContinue": None, "imminentLiveSession": None, "upcomingEvents": []}
        )

    def test_populated_summary_returns_each_block(self):
        user = make_user()
        course = make_course()
        session = CourseLiveSession.objects.create(
            course=course, session_id="s1", title="Live", date_label="Sun", time_label="8pm"
        )
        DashboardStat.objects.create(user=user, attendance_rate=95, points_earned=10)
        PriorityContinue.objects.create(user=user, course=course)
        ImminentLiveSession.objects.create(user=user, session=session)
        UpcomingEvent.objects.create(user=user, event_id="e1", title="Exam")
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard").json()
        self.assertEqual(body["stats"]["attendanceRate"], 95)
        self.assertEqual(body["priorityContinue"]["id"], "course-1")
        self.assertEqual(body["imminentLiveSession"]["id"], "s1")
        self.assertEqual(body["upcomingEvents"][0]["id"], "e1")


class DashboardScopingTests(ApiTestCase):
    def test_rows_belonging_to_another_user_are_excluded(self):
        other = make_user(email="other@example.com")
        Enrollment.objects.create(user=other, course=make_course())
        authenticate(self.client, make_user())
        self.assertEqual(self.client.get("/api/dashboard/enrolled").json(), [])

    def test_enrolled_only_returns_the_current_user(self):
        user = make_user()
        Enrollment.objects.create(user=user, course=make_course())
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard/enrolled").json()
        self.assertEqual([row["id"] for row in body], ["course-1"])


class DashboardSectionViewTests(ApiTestCase):
    def test_saved_returns_scholarships_and_courses(self):
        user = make_user()
        SavedScholarship.objects.create(user=user, scholarship=make_scholarship())
        FavoriteCourse.objects.create(user=user, course=make_course())
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard/saved").json()
        self.assertEqual(body["scholarships"][0]["id"], "scholarship-1")
        self.assertEqual(body["courses"][0]["id"], "course-1")

    def test_competitions_returns_competitions_and_certificates(self):
        user = make_user()
        competition = Competition.objects.create(competition_id="k1", title="Comp")
        SavedCompetition.objects.create(user=user, competition=competition)
        Certificate.objects.create(user=user, course=make_course())
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard/competitions").json()
        self.assertEqual(body["competitions"][0]["id"], "k1")
        self.assertEqual(body["certificates"][0]["id"], "course-1")

    def test_notifications_returns_both_shapes(self):
        user = make_user()
        NotificationItemData.objects.create(user=user, notification_id="n1", message="M")
        DashboardNotification.objects.create(user=user, notification_id="n1", title="T")
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard/notifications").json()
        self.assertEqual(body["items"][0]["id"], "n1")
        self.assertEqual(body["drawer"][0]["id"], "n1")


class DashboardNotificationReadTests(ApiTestCase):
    def test_marks_both_representations_as_read(self):
        user = make_user()
        NotificationItemData.objects.create(user=user, notification_id="n1", is_unread=True)
        DashboardNotification.objects.create(user=user, notification_id="n1", is_read=False)
        authenticate(self.client, user)
        body = self.client.post("/api/dashboard/notifications/n1/read", {}, format="json").json()
        self.assertEqual(body, {"read": True, "id": "n1"})
        self.assertFalse(NotificationItemData.objects.get(user=user, notification_id="n1").is_unread)
        self.assertTrue(DashboardNotification.objects.get(user=user, notification_id="n1").is_read)


class DashboardUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("dashboard-summary"), "/api/dashboard")
        self.assertEqual(reverse("dashboard-enrolled"), "/api/dashboard/enrolled")


class DashboardAdminTests(TestCase):
    def test_every_model_is_registered(self):
        for model in DASHBOARD_MODELS:
            self.assertTrue(admin.site.is_registered(model), model.__name__)
