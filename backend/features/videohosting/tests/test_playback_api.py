"""Authenticated lesson playback grant contract tests."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseLesson, CourseModule, LessonProgress
from features.dashboard.models import Enrollment
from features.videohosting.models import StreamToken, VideoCaption, VideoProvider
from features.videohosting.tests.helpers import make_asset


class LessonPlaybackApiTests(ApiTestCase):
    def _lesson(self, *, with_video=True, preview=False):
        course = make_course()
        module = CourseModule.objects.create(course=course, module_id="module-1", title="Module 1")
        asset = make_asset(slug="course-1--lesson-1") if with_video else None
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="lesson-1",
            title="Lesson 1",
            video_asset=asset,
            is_free_preview=preview,
        )
        next_lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="lesson-2",
            title="Lesson 2",
        )
        return course, lesson, next_lesson, asset

    def test_enrolled_playback_resolves_asset_and_returns_resume_next_and_lesson_bound_token(self):
        user = make_user()
        authenticate(self.client, user)
        course, lesson, _next_lesson, asset = self._lesson()
        Enrollment.objects.create(user=user, course=course)
        LessonProgress.objects.create(
            user=user,
            lesson=lesson,
            position_seconds=42,
            duration_seconds=120,
            watched_seconds=50,
        )
        VideoCaption.objects.create(
            asset=asset,
            language="en",
            label="English",
            is_default=True,
            vtt="WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello\n",
        )

        response = self.client.post("/api/courses/course-1/lessons/lesson-1/playback")
        self.assertEqual(response.status_code, 200, response.content)
        grant = response.json()
        self.assertEqual(grant["assetId"], asset.slug)
        self.assertEqual(grant["mode"], "hls")
        self.assertEqual(grant["resumeAt"], 42)
        self.assertEqual(grant["lesson"], {"id": "lesson-1", "title": "Lesson 1", "nextLessonId": "lesson-2"})
        self.assertEqual(StreamToken.objects.get().lesson_id, lesson.pk)
        caption = self.client.get(f"/api/stream/{grant['token']}/captions/en.vtt")
        self.assertEqual(caption.status_code, 200)
        self.assertTrue(caption["Content-Type"].startswith("text/vtt"))
        self.assertEqual(caption["Cache-Control"], "no-store")

    def test_youtube_link_grant_is_tokenless_and_uses_the_safe_embed_origin(self):
        user = make_user()
        authenticate(self.client, user)
        provider = VideoProvider.objects.create(code="youtube", name="YouTube", is_enabled=True)
        make_asset(
            slug="linked-youtube",
            provider=provider,
            created_by=user,
            playback_mode="embed",
            protection="none",
            external_ref="dQw4w9WgXcQ",
        )

        response = self.client.post("/api/videos/linked-youtube/token")
        self.assertEqual(response.status_code, 200, response.content)
        grant = response.json()
        self.assertEqual(grant["token"], "")
        self.assertEqual(grant["mode"], "embed")
        self.assertEqual(
            grant["embedUrl"],
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&rel=0&modestbranding=1&playsinline=1",
        )
        self.assertEqual(StreamToken.objects.count(), 0)

    def test_free_preview_uses_short_grant_ttl_without_enrollment(self):
        user = make_user()
        authenticate(self.client, user)
        self._lesson(preview=True)

        response = self.client.post("/api/courses/course-1/lessons/lesson-1/playback")
        self.assertEqual(response.status_code, 200, response.content)
        row = StreamToken.objects.get()
        remaining = row.expires_at - timezone.now()
        self.assertLessEqual(remaining, timedelta(minutes=30))
        self.assertGreater(remaining, timedelta(minutes=29))

    def test_missing_video_returns_409_no_video(self):
        user = make_user()
        authenticate(self.client, user)
        self._lesson(with_video=False)

        response = self.client.post("/api/courses/course-1/lessons/lesson-1/playback")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "no_video")

    def test_enrollment_is_required_for_non_preview_lesson(self):
        user = make_user()
        authenticate(self.client, user)
        self._lesson()

        response = self.client.post("/api/courses/course-1/lessons/lesson-1/playback")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "not_entitled")
