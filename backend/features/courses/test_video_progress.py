"""Focused service tests for lesson video progress heartbeats."""

from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from features.common.choices import CourseStatus
from features.common.errors import InvalidParameter, PermissionDenied
from features.common.testing import make_course, make_user
from features.courses.models import CourseLesson, CourseModule, LessonProgress
from features.courses.video_progress import record_lesson_progress
from features.dashboard.models import Enrollment
from features.videohosting.models import VideoAsset


class LessonProgressServiceTests(TestCase):
    def setUp(self):
        self.user = make_user(email="video-progress-learner@example.com")
        self.course = make_course(slug="video-progress-course", status=CourseStatus.PUBLISHED)
        self.module = CourseModule.objects.create(course=self.course, module_id="module-1", title="Module 1")
        self.lesson = CourseLesson.objects.create(
            module=self.module,
            lesson_id="lesson-1",
            title="Lesson 1",
            duration_seconds=100,
            is_published=True,
        )
        Enrollment.objects.create(user=self.user, course=self.course)

    def payload(self, **overrides):
        values = {"positionSeconds": 10, "durationSeconds": 100, "watchedDeltaSeconds": 10}
        values.update(overrides)
        return values

    def test_requires_an_authenticated_user_with_watch_permission(self):
        with self.assertRaises(PermissionDenied):
            record_lesson_progress(AnonymousUser(), self.lesson, self.payload())

        with patch("features.courses.video_progress.has_perm", return_value=False), self.assertRaises(PermissionDenied):
            record_lesson_progress(self.user, self.lesson, self.payload())

    def test_requires_an_enrollment(self):
        Enrollment.objects.filter(user=self.user, course=self.course).delete()

        with self.assertRaises(PermissionDenied):
            record_lesson_progress(self.user, self.lesson, self.payload())

    def test_requires_a_published_lesson_and_published_or_archived_course(self):
        self.lesson.is_published = False
        self.lesson.save(update_fields=["is_published", "updated_at"])
        with self.assertRaises(PermissionDenied):
            record_lesson_progress(self.user, self.lesson, self.payload())

        self.lesson.is_published = True
        self.lesson.save(update_fields=["is_published", "updated_at"])
        self.course.status = CourseStatus.DRAFT
        self.course.save(update_fields=["status", "updated_at"])
        with self.assertRaises(PermissionDenied):
            record_lesson_progress(self.user, self.lesson, self.payload())

    def test_enrolled_learner_can_record_progress_for_an_archived_course(self):
        self.course.status = CourseStatus.ARCHIVED
        self.course.save(update_fields=["status", "updated_at"])

        progress = record_lesson_progress(self.user, self.lesson, self.payload())

        self.assertEqual((progress.position_seconds, progress.duration_seconds), (10, 100))

    def test_authoritative_video_duration_clamps_position_and_ignores_request_duration(self):
        asset = VideoAsset.objects.create(slug="progress-video", duration_seconds=60)
        self.lesson.video_asset = asset
        self.lesson.duration_seconds = 40
        self.lesson.save(update_fields=["video_asset", "duration_seconds", "updated_at"])

        progress = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=999, durationSeconds=999, watchedDeltaSeconds=20),
        )

        self.assertEqual(
            (progress.position_seconds, progress.duration_seconds, progress.watched_seconds),
            (60, 60, 20),
        )

    def test_request_duration_is_used_only_when_stored_duration_is_unknown(self):
        self.lesson.duration_seconds = 0
        self.lesson.save(update_fields=["duration_seconds", "updated_at"])

        progress = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=999, durationSeconds=120, watchedDeltaSeconds=10),
        )

        self.assertEqual((progress.position_seconds, progress.duration_seconds), (120, 120))

    def test_watched_delta_is_capped_and_watched_seconds_is_monotonic(self):
        first = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=80, watchedDeltaSeconds=90),
        )
        second = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=5, watchedDeltaSeconds=10),
        )

        self.assertEqual(first.watched_seconds, 45)
        self.assertEqual(second.watched_seconds, 55)
        self.assertEqual(second.position_seconds, 5)

    def test_completes_at_ninety_percent_and_never_uncompletes(self):
        record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=45, watchedDeltaSeconds=45),
        )
        completed = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=90, watchedDeltaSeconds=45),
        )
        completed_at = completed.completed_at
        self.assertTrue(completed.completed)
        self.assertIsNotNone(completed_at)

        later = record_lesson_progress(
            self.user,
            self.lesson,
            self.payload(positionSeconds=1, watchedDeltaSeconds=1),
        )

        self.assertTrue(later.completed)
        self.assertEqual(later.completed_at, completed_at)

    def test_retries_keep_one_row_and_do_not_recalculate_course_aggregates(self):
        original_stats = (self.course.total_seconds, self.course.lessons_count, self.course.duration)
        record_lesson_progress(self.user, self.lesson, self.payload())
        record_lesson_progress(self.user, self.lesson, self.payload())

        self.assertEqual(LessonProgress.objects.filter(user=self.user, lesson=self.lesson).count(), 1)
        self.course.refresh_from_db()
        self.assertEqual((self.course.total_seconds, self.course.lessons_count, self.course.duration), original_stats)

    def test_payload_requires_exact_camel_case_keys_and_nonnegative_integers(self):
        invalid_payloads = [
            {"position_seconds": 10, "durationSeconds": 100, "watchedDeltaSeconds": 1},
            {"positionSeconds": 10, "durationSeconds": 100, "watchedDeltaSeconds": 1, "extra": 0},
            self.payload(positionSeconds=True),
            self.payload(durationSeconds=False),
            self.payload(watchedDeltaSeconds="1"),
            self.payload(positionSeconds=-1),
            self.payload(durationSeconds=-1),
            self.payload(watchedDeltaSeconds=-1),
        ]

        for invalid in invalid_payloads:
            with self.subTest(payload=invalid), self.assertRaises(InvalidParameter):
                record_lesson_progress(self.user, self.lesson, invalid)
