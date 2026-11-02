"""Learner heartbeat API routing and cache contract tests."""

from __future__ import annotations

from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseLesson, CourseModule, LessonProgress
from features.dashboard.models import Enrollment


class LessonProgressApiTests(ApiTestCase):
    def test_put_persists_clamped_progress_for_an_enrolled_learner(self):
        user = make_user()
        authenticate(self.client, user)
        course = make_course()
        module = CourseModule.objects.create(course=course, module_id="module-1", title="Module 1")
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="lesson-1",
            title="Lesson 1",
            duration_seconds=100,
        )
        Enrollment.objects.create(user=user, course=course)

        first = self.client.put(
            "/api/courses/course-1/lessons/lesson-1/progress",
            {"positionSeconds": 45, "durationSeconds": 100, "watchedDeltaSeconds": 60},
            format="json",
        )
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(first.json()["watchedSeconds"], 45)
        self.assertFalse(first.json()["completed"])

        response = self.client.put(
            "/api/courses/course-1/lessons/lesson-1/progress",
            {"positionSeconds": 500, "durationSeconds": 100, "watchedDeltaSeconds": 60},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["positionSeconds"], 100)
        self.assertEqual(response.json()["watchedSeconds"], 90)
        self.assertTrue(response.json()["completed"])
        self.assertEqual(response["Cache-Control"], "private, no-store")
        row = LessonProgress.objects.get(user=user, lesson=lesson)
        self.assertEqual(row.position_seconds, 100)
