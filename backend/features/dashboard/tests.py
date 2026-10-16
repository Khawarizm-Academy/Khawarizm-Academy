"""Tests for the dashboard feature — projections, scoping, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, demo_learner, make_learner
from features.dashboard.models import (
    CertificateItem,
    CompetitionItem,
    DashboardNotification,
    DashboardStat,
    EnrolledCourse,
    FavoriteCourseItem,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedScholarshipItem,
    UpcomingEvent,
)


class DashboardModelTests(TestCase):
    def setUp(self):
        self.learner = demo_learner()

    def test_enrolled_course_str_and_unique_key(self):
        row = EnrolledCourse.objects.create(learner=self.learner, course_id="c1", title="Course")
        self.assertEqual(str(row), f"{self.learner.email}:c1")
        self.assertEqual(EnrolledCourse._meta.unique_together, (("learner", "course_id"),))

    def test_priority_continue_str(self):
        row = PriorityContinue.objects.create(learner=self.learner, course_id="c1", title="Course")
        self.assertEqual(str(row), f"{self.learner.email}:c1")

    def test_imminent_live_session_str(self):
        row = ImminentLiveSession.objects.create(learner=self.learner, session_id="s1", course_title="Live")
        self.assertEqual(str(row), f"{self.learner.email}:s1")

    def test_dashboard_stat_str_and_defaults(self):
        row = DashboardStat.objects.create(learner=self.learner)
        self.assertEqual(str(row), f"{self.learner.email}:stats")
        self.assertEqual(row.attendance_rate, 98)

    def test_upcoming_event_default_type(self):
        row = UpcomingEvent.objects.create(learner=self.learner, event_id="e1", title="Exam")
        self.assertEqual(row.event_type, "submission")

    def test_saved_and_favorite_and_competition_and_certificate_str(self):
        cases = (
            (SavedScholarshipItem, {"item_id": "s1", "title": "T"}),
            (FavoriteCourseItem, {"item_id": "f1", "title": "T"}),
            (CompetitionItem, {"item_id": "k1", "title": "T"}),
            (CertificateItem, {"item_id": "z1", "title": "T"}),
        )
        for model, fields in cases:
            row = model.objects.create(learner=self.learner, **fields)
            self.assertEqual(str(row), f"{self.learner.email}:{fields['item_id']}")


class DashboardSummaryViewTests(ApiTestCase):
    def test_empty_summary_returns_nulls_and_empty_events(self):
        body = self.client.get("/api/dashboard").json()
        self.assertEqual(body, {"stats": None, "priorityContinue": None, "imminentLiveSession": None, "upcomingEvents": []})

    def test_populated_summary_returns_each_block(self):
        learner = demo_learner()
        DashboardStat.objects.create(learner=learner, attendance_rate=95, points_earned=10)
        PriorityContinue.objects.create(learner=learner, course_id="c1", title="Course")
        ImminentLiveSession.objects.create(learner=learner, session_id="s1", course_title="Live")
        UpcomingEvent.objects.create(learner=learner, event_id="e1", title="Exam")
        body = self.client.get("/api/dashboard").json()
        self.assertEqual(body["stats"]["attendanceRate"], 95)
        self.assertEqual(body["priorityContinue"]["id"], "c1")
        self.assertEqual(body["imminentLiveSession"]["id"], "s1")
        self.assertEqual(body["upcomingEvents"][0]["id"], "e1")


class DashboardScopingTests(ApiTestCase):
    def test_rows_belonging_to_another_learner_are_excluded(self):
        other = make_learner(email="other@example.com")
        EnrolledCourse.objects.create(learner=other, course_id="c1", title="Course")
        self.assertEqual(self.client.get("/api/dashboard/enrolled").json(), [])

    def test_enrolled_only_returns_the_current_learner(self):
        learner = demo_learner()
        EnrolledCourse.objects.create(learner=learner, course_id="c1", title="Course")
        body = self.client.get("/api/dashboard/enrolled").json()
        self.assertEqual([row["id"] for row in body], ["c1"])


class DashboardSectionViewTests(ApiTestCase):
    def test_saved_returns_scholarships_and_courses(self):
        learner = demo_learner()
        SavedScholarshipItem.objects.create(learner=learner, item_id="s1", title="Scholarship")
        FavoriteCourseItem.objects.create(learner=learner, item_id="c1", title="Course")
        body = self.client.get("/api/dashboard/saved").json()
        self.assertEqual(body["scholarships"][0]["id"], "s1")
        self.assertEqual(body["courses"][0]["id"], "c1")

    def test_competitions_returns_competitions_and_certificates(self):
        learner = demo_learner()
        CompetitionItem.objects.create(learner=learner, item_id="k1", title="Competition")
        CertificateItem.objects.create(learner=learner, item_id="z1", title="Certificate")
        body = self.client.get("/api/dashboard/competitions").json()
        self.assertEqual(body["competitions"][0]["id"], "k1")
        self.assertEqual(body["certificates"][0]["id"], "z1")

    def test_notifications_returns_both_shapes(self):
        learner = demo_learner()
        NotificationItemData.objects.create(learner=learner, notification_id="n1", message="M")
        DashboardNotification.objects.create(learner=learner, notification_id="n1", title="T")
        body = self.client.get("/api/dashboard/notifications").json()
        self.assertEqual(body["items"][0]["id"], "n1")
        self.assertEqual(body["drawer"][0]["id"], "n1")


class DashboardNotificationReadTests(ApiTestCase):
    def test_marks_both_representations_as_read(self):
        learner = demo_learner()
        NotificationItemData.objects.create(learner=learner, notification_id="n1", is_unread=True)
        DashboardNotification.objects.create(learner=learner, notification_id="n1", is_read=False)
        body = self.client.post("/api/dashboard/notifications/n1/read", {}, format="json").json()
        self.assertEqual(body, {"read": True, "id": "n1"})
        self.assertFalse(NotificationItemData.objects.get(learner=learner, notification_id="n1").is_unread)
        self.assertTrue(DashboardNotification.objects.get(learner=learner, notification_id="n1").is_read)


class DashboardUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("dashboard-summary"), "/api/dashboard")
        self.assertEqual(reverse("dashboard-enrolled"), "/api/dashboard/enrolled")
        self.assertEqual(reverse("dashboard-notification-read", args=["n1"]), "/api/dashboard/notifications/n1/read")


class DashboardAdminTests(TestCase):
    def test_every_model_is_registered(self):
        models = (
            CertificateItem,
            CompetitionItem,
            DashboardNotification,
            DashboardStat,
            EnrolledCourse,
            FavoriteCourseItem,
            ImminentLiveSession,
            NotificationItemData,
            PriorityContinue,
            SavedScholarshipItem,
            UpcomingEvent,
        )
        for model in models:
            self.assertTrue(admin.site.is_registered(model), model.__name__)
