"""Roster HTTP contracts (Phase 14).

The roster is reachable only through `_sort_roster`, and every branch of that
mapping is a *tuple* of ordering terms. When the tuple was passed to
`order_by()` as one argument, Django raised `FieldError` and both roster
endpoints answered 500 for every caller — with no test anywhere touching the
route, so it shipped. These tests exist so that surface stays covered.
"""

from __future__ import annotations

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from features.common.choices import CourseStaffKind, CourseStatus, Role
from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseStaff
from features.dashboard.models import Enrollment


class StudioRosterSortingTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.instructor = make_user(email="roster-owner@example.com", role=Role.INSTRUCTOR, full_name="Roster Owner")
        self.course = make_course(slug="roster-course", owner=self.instructor, status=CourseStatus.PUBLISHED)
        CourseStaff.objects.create(course=self.course, user=self.instructor, kind=CourseStaffKind.OWNER)
        now = timezone.now()
        # Distinct on every sorted column so each ordering has one right answer.
        self.learner = self._enroll("aa@example.com", "أحمد", progress=20, last_active_days=1)
        self.midship = self._enroll("bb@example.com", "بدر", progress=60, last_active_days=20)
        self.complete = self._enroll("cc@example.com", "جميلة", progress=100, last_active_days=30)
        self.now = now

    def _enroll(self, email: str, name: str, *, progress: int, last_active_days: int):
        user = make_user(email=email, role=Role.STUDENT, full_name=name)
        enrollment = Enrollment.objects.create(
            user=user,
            course=self.course,
            progress=progress,
            is_completed=progress >= 100,
        )
        # `updated_at` is `auto_now`, so create() overwrites any passed value and
        # the roster's activity column is what `.update()` (which skips auto_now)
        # can still place in the past.
        Enrollment.objects.filter(pk=enrollment.pk).update(updated_at=self._days_ago(last_active_days))
        return user

    @staticmethod
    def _days_ago(days: int):
        return timezone.now() - timedelta(days=days)

    def login(self, user):
        authenticate(self.client, user)

    def _names(self, params: dict[str, object]):
        self.login(self.instructor)
        response = self.client.get(reverse("studio-students"), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return [row["name"] for row in response.data["items"]], response

    def test_roster_answers_with_no_sort_parameter_at_all(self):
        names, response = self._names({"course": self.course.slug})
        self.assertEqual(names, ["أحمد", "بدر", "جميلة"])
        self.assertEqual(response.data["total"], 3)
        self.assertEqual([row["status"] for row in response.data["items"]], ["active", "struggling", "completed"])

    def test_every_documented_sort_key_orders_the_roster(self):
        expected = {
            "name": ["أحمد", "بدر", "جميلة"],
            "progress": ["جميلة", "بدر", "أحمد"],
            "lastActive": ["أحمد", "بدر", "جميلة"],
            # No attempt rows here, so this branch only has to not explode.
            "quizAverage": None,
        }
        for sort, order in expected.items():
            with self.subTest(sort=sort):
                names, response = self._names({"course": self.course.slug, "sort": sort})
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                if order is not None:
                    self.assertEqual(names, order)

    def test_unknown_sort_is_a_validation_error_and_not_a_crash(self):
        # The serializer's choice list is exactly the mapping `_sort_roster`
        # knows, so a bad value must be rejected before any ORM work.
        self.login(self.instructor)
        response = self.client.get(reverse("studio-students"), {"sort": "not-a-column"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "validation_error")
        self.assertIn("sort", response.data["fields"])

    def test_status_filter_and_sort_combine(self):
        names, response = self._names({"course": self.course.slug, "status": "completed", "sort": "progress"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(names, ["جميلة"])

    def test_csv_export_sorts_and_streams(self):
        self.login(self.instructor)
        response = self.client.get(reverse("studio-students-csv"), {"course": self.course.slug, "sort": "progress"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"].split(";")[0], "text/csv")
        rows = [line for line in b"".join(response.streaming_content).decode("utf-8").splitlines() if line]
        self.assertEqual(rows[0].split(",")[0], "studentId")
        self.assertEqual(len(rows), 4)  # header + three learners
