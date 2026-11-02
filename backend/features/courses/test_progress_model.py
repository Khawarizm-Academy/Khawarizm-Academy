"""Focused model tests for per-lesson learner progress."""

from __future__ import annotations

from datetime import datetime

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from features.common.testing import make_course, make_user
from features.courses.models import CourseLesson, CourseModule, LessonProgress


class LessonProgressModelTests(TestCase):
    def setUp(self):
        self.user = make_user(email="progress-learner@example.com")
        course = make_course(slug="progress-course")
        module = CourseModule.objects.create(course=course, module_id="module-1", title="Module 1")
        self.lesson = CourseLesson.objects.create(module=module, lesson_id="lesson-1", title="Lesson 1")

    def test_defaults_and_timestamps_are_set(self):
        progress = LessonProgress.objects.create(user=self.user, lesson=self.lesson)

        self.assertEqual(
            (
                progress.position_seconds,
                progress.duration_seconds,
                progress.watched_seconds,
                progress.completed,
                progress.completed_at,
            ),
            (0, 0, 0, False, None),
        )
        self.assertIsInstance(progress.created_at, datetime)
        self.assertIsInstance(progress.updated_at, datetime)
        self.assertTrue(timezone.is_aware(progress.created_at))
        self.assertTrue(timezone.is_aware(progress.updated_at))

    def test_user_and_lesson_pair_is_unique(self):
        LessonProgress.objects.create(user=self.user, lesson=self.lesson)

        with self.assertRaises(IntegrityError), transaction.atomic():
            LessonProgress.objects.create(user=self.user, lesson=self.lesson)

    def test_model_metadata_declares_relationship_constraint_and_index(self):
        self.assertEqual(LessonProgress._meta.get_field("lesson").remote_field.related_name, "progress_rows")
        self.assertEqual(
            [constraint.name for constraint in LessonProgress._meta.constraints],
            ["uniq_lp_user_lesson"],
        )
        self.assertEqual(
            [(index.name, tuple(index.fields)) for index in LessonProgress._meta.indexes],
            [("idx_lp_lesson_completed", ("lesson", "completed"))],
        )
