"""Phase 4 legacy video-mode and lesson-link backfill tests."""

from __future__ import annotations

from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.db import connection
from django.test import TestCase

from features.common.choices import LessonKind
from features.common.testing import make_course
from features.courses.models import CourseLesson, CourseModule
from features.videohosting.models import VideoAsset, VideoProvider

MIGRATION = import_module("features.videohosting.migrations.0010_streamtoken_lesson_uploadsession_file_name_and_more")


class LegacyVideoBackfillTests(TestCase):
    def setUp(self):
        self.course = make_course(slug="legacy-course")
        self.drive = VideoProvider.objects.create(code="google_drive", name="Google Drive")
        self.telegram = VideoProvider.objects.create(code="telegram", name="Telegram")
        self.module = CourseModule.objects.create(course=self.course, module_id="module-1", title="Module 1")

    def _lesson(self, lesson_id: str, *, module=None, kind=LessonKind.ARTICLE):
        return CourseLesson.objects.create(
            module=module or self.module,
            lesson_id=lesson_id,
            title=lesson_id,
            kind=kind,
        )

    def _run_backfill(self):
        MIGRATION.backfill_legacy_video_modes(apps, SimpleNamespace(connection=connection))

    def test_hls_and_drive_modes_are_set_and_unique_legacy_lessons_linked_idempotently(self):
        hls_lesson = self._lesson("hls-lesson")
        raw_lesson = self._lesson("raw-lesson")
        hls = VideoAsset.objects.create(
            slug="legacy-course--hls-lesson",
            provider=self.telegram,
            master_playlist="#EXTM3U\n",
        )
        raw = VideoAsset.objects.create(
            slug="legacy-course--raw-lesson",
            provider=self.drive,
            source_file_id="drive-file-id",
        )
        non_drive = VideoAsset.objects.create(
            slug="legacy-course--unknown-lesson",
            provider=self.telegram,
            source_file_id="not-a-drive-id",
        )

        self._run_backfill()
        self._run_backfill()
        hls.refresh_from_db()
        raw.refresh_from_db()
        non_drive.refresh_from_db()
        hls_lesson.refresh_from_db()
        raw_lesson.refresh_from_db()
        self.assertEqual((hls.playback_mode, hls.protection), ("hls", "encrypted"))
        self.assertEqual((raw.playback_mode, raw.protection), ("raw", "gated"))
        self.assertEqual((hls_lesson.video_asset_id, hls_lesson.kind), (hls.pk, LessonKind.VIDEO))
        self.assertEqual((raw_lesson.video_asset_id, raw_lesson.kind), (raw.pk, LessonKind.VIDEO))
        self.assertEqual(non_drive.playback_mode, "")

    def test_ambiguous_legacy_slug_is_logged_and_never_guessed(self):
        second = CourseModule.objects.create(course=self.course, module_id="module-2", title="Module 2")
        first_lesson = self._lesson("shared", kind=LessonKind.ARTICLE)
        second_lesson = self._lesson("shared", module=second, kind=LessonKind.ARTICLE)
        asset = VideoAsset.objects.create(slug="legacy-course--shared", master_playlist="#EXTM3U\n")

        with self.assertLogs(MIGRATION.__name__, level="WARNING") as captured:
            self._run_backfill()
        first_lesson.refresh_from_db()
        second_lesson.refresh_from_db()
        asset.refresh_from_db()
        self.assertIsNone(first_lesson.video_asset_id)
        self.assertIsNone(second_lesson.video_asset_id)
        self.assertEqual(first_lesson.kind, LessonKind.ARTICLE)
        self.assertIn(asset.slug, captured.output[0])
