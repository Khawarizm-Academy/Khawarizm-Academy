"""API tests for the instructor Studio video asset actions.

The URL patterns are local to this test module so the tests do not depend on
production route wiring or any provider/network implementation.
"""

from __future__ import annotations

from unittest.mock import patch

from django.test import override_settings
from django.urls import path
from rest_framework.test import APIClient

from features.common.choices import CourseStatus, Role
from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseLesson, CourseModule
from features.videohosting.models import VideoAsset, VideoCaption
from features.videohosting.studio_assets import (
    studio_video_caption_create,
    studio_video_caption_delete,
    studio_video_detail,
)
from features.videohosting.tests.helpers import make_asset

urlpatterns = [
    path("studio/videos/<str:asset_id>", studio_video_detail),
    path("studio/videos/<str:asset_id>/captions", studio_video_caption_create),
    path("studio/videos/<str:asset_id>/captions/<str:language>", studio_video_caption_delete),
]


@override_settings(ROOT_URLCONF=__name__)
class StudioAssetActionTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.owner = make_user(email="video-owner@example.com", role=Role.INSTRUCTOR)
        authenticate(self.client, self.owner)
        self.asset = make_asset(created_by=self.owner, slug="studio-asset-1")

    def test_every_action_requires_authentication_and_video_permission(self):
        anonymous = APIClient()
        anonymous.defaults["HTTP_ORIGIN"] = "http://localhost:5173"
        response = anonymous.patch(f"/studio/videos/{self.asset.pk}", {"title": "Nope"}, format="json")
        self.assertEqual(response.status_code, 401)

        student = make_user(email="video-student@example.com", role=Role.STUDENT)
        client = APIClient()
        client.defaults["HTTP_ORIGIN"] = "http://localhost:5173"
        authenticate(client, student)
        response = client.patch(f"/studio/videos/{self.asset.pk}", {"title": "Nope"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "permission_denied")

    def test_non_owner_with_manage_own_cannot_edit_another_asset(self):
        other = make_user(email="other-instructor@example.com", role=Role.INSTRUCTOR)
        authenticate(self.client, other)
        response = self.client.patch(f"/studio/videos/{self.asset.pk}", {"title": "Nope"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_patch_has_a_strict_whitelist_and_updates_title_and_poster(self):
        response = self.client.patch(
            f"/studio/videos/{self.asset.pk}",
            {"title": "Edited lesson", "posterUrl": "https://cdn.example.com/poster.jpg"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Edited lesson")
        self.assertEqual(response.json()["posterUrl"], "https://cdn.example.com/poster.jpg")
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.title, "Edited lesson")
        self.assertEqual(self.asset.poster_url, "https://cdn.example.com/poster.jpg")

        response = self.client.patch(
            f"/studio/videos/{self.asset.pk}", {"title": "Edited", "provider": "telegram"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "unknown_field")

    def _caption(self, language: str, *, is_default: bool = False, vtt: str = "WEBVTT\n\n"):
        return self.client.post(
            f"/studio/videos/{self.asset.pk}/captions",
            {"language": language, "label": language, "isDefault": is_default, "vtt": vtt},
            format="json",
        )

    def test_caption_requires_webvtt_size_and_bcp47_like_language(self):
        response = self._caption("en_US")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_language")

        response = self._caption("en-US", vtt="NOT VTT\n")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_caption")

        response = self._caption("en-😀")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_language")

        response = self._caption("en-US", vtt="WEBVTT\n" + ("x" * (512 * 1024)))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "caption_too_large")

    def test_caption_is_strict_bool_unique_language_and_one_default(self):
        response = self.client.post(
            f"/studio/videos/{self.asset.pk}/captions",
            {"language": "en", "label": "English", "isDefault": 1, "vtt": "WEBVTT\n"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_field")

        self.assertEqual(self._caption("en", is_default=True).status_code, 201)
        self.assertEqual(self._caption("ar", is_default=True).status_code, 201)
        self.assertEqual(VideoCaption.objects.get(asset=self.asset, language="en").is_default, False)
        self.assertEqual(VideoCaption.objects.get(asset=self.asset, language="ar").is_default, True)

        response = self._caption("EN")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "duplicate_language")

        response = self.client.post(
            f"/studio/videos/{self.asset.pk}/captions",
            {"language": "fr", "label": "French", "isDefault": False, "vtt": "WEBVTT\n", "extra": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "unknown_field")

    def test_caption_delete_removes_only_requested_language(self):
        self.assertEqual(self._caption("en").status_code, 201)
        self.assertEqual(self._caption("ar").status_code, 201)
        response = self.client.delete(f"/studio/videos/{self.asset.pk}/captions/en")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(VideoCaption.objects.filter(asset=self.asset, language="en").exists())
        self.assertTrue(VideoCaption.objects.filter(asset=self.asset, language="ar").exists())

    def test_delete_conflicts_with_asset_linked_to_a_published_course(self):
        course = make_course(
            slug="published-course",
            title="Published course",
            owner=self.owner,
            status=CourseStatus.PUBLISHED,
        )
        module = CourseModule.objects.create(course=course, module_id="module-1", title="Module 1")
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="lesson-1",
            title="Linked lesson",
            video_asset=self.asset,
            is_published=False,
        )
        response = self.client.delete(f"/studio/videos/{self.asset.pk}")
        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["code"], "asset_in_use")
        self.assertEqual(body["fields"]["lessons"][0]["course"]["slug"], course.slug)
        self.assertEqual(body["fields"]["lessons"][0]["lesson"]["id"], lesson.lesson_id)
        self.assertTrue(VideoAsset.objects.filter(pk=self.asset.pk).exists())

    @patch("features.videohosting.remote_cleanup.schedule_remote_delete")
    def test_delete_schedules_remote_cleanup_before_cascade(self, schedule):
        captured = []

        def capture(asset, **kwargs):
            captured.append((str(asset.pk), kwargs))

        schedule.side_effect = capture
        asset_id = str(self.asset.pk)
        response = self.client.delete(f"/studio/videos/{asset_id}")
        self.assertEqual(response.status_code, 204)
        schedule.assert_called_once()
        self.assertEqual(captured[0][0], asset_id)
        self.assertEqual(captured[0][1]["actor"], self.owner)
        self.assertIsNotNone(captured[0][1]["request"])
        self.assertFalse(VideoAsset.objects.filter(pk=self.asset.pk).exists())
