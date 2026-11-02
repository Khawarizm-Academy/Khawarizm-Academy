"""Focused contract tests for the Phase 3 Studio API."""

from __future__ import annotations

import uuid

from django.urls import reverse
from rest_framework import status

from features.common.choices import CourseStaffKind, CourseStatus, Role
from features.common.testing import ApiTestCase, authenticate, make_course, make_user
from features.courses.models import CourseLesson, CourseModule, CourseStaff, LessonResource


class StudioRouteTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.owner = make_user(email="studio.owner@example.com", role=Role.INSTRUCTOR)
        self.other = make_user(email="studio.other@example.com", role=Role.INSTRUCTOR)
        self.course = make_course(
            slug="studio-course",
            owner=self.owner,
            status=CourseStatus.DRAFT,
            about="A sufficiently long course description for editor fixtures.",
        )
        CourseStaff.objects.create(course=self.course, user=self.owner, kind=CourseStaffKind.OWNER)

    def login(self, user):
        authenticate(self.client, user)

    def test_unauthenticated_studio_request_is_401(self):
        response = self.client.get(reverse("studio-courses"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_read_but_unrelated_instructor_gets_403(self):
        self.login(self.owner)
        owner_response = self.client.get(reverse("studio-course-detail", kwargs={"slug": self.course.slug}))
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_response["Cache-Control"], "private, no-store")

        self.client.credentials()
        self.login(self.other)
        other_response = self.client.get(reverse("studio-course-detail", kwargs={"slug": self.course.slug}))
        self.assertEqual(other_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_course_returns_editor_payload_and_no_store(self):
        self.login(self.owner)
        response = self.client.post(
            reverse("studio-courses"),
            {"title": "A new draft", "categorySlug": "programming", "courseLevel": "beginner"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertIn("checklist", response.data)
        self.assertNotIn("email", str(response.data).lower())

    def test_malformed_course_body_is_a_shared_400(self):
        self.login(self.owner)
        response = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": self.course.slug}),
            {"unexpectedField": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data)

    def test_route_reversal_and_malformed_uuid_are_safe(self):
        module_id = uuid.uuid4()
        self.assertEqual(
            reverse("studio-lessons", kwargs={"module_id": module_id}),
            f"/api/studio/modules/{module_id}/lessons",
        )
        self.login(self.owner)
        response = self.client.patch("/api/studio/lessons/not-a-uuid", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_curriculum_and_resources_representative_success(self):
        self.login(self.owner)
        module_response = self.client.post(
            reverse("studio-modules", kwargs={"slug": self.course.slug}),
            {"title": "Module 1"},
            format="json",
        )
        self.assertEqual(module_response.status_code, status.HTTP_201_CREATED)
        module = CourseModule.objects.get(course=self.course)
        lesson_response = self.client.post(
            reverse("studio-lessons", kwargs={"module_id": module.pk}),
            {"title": "Lesson 1", "kind": "article", "content": "An article"},
            format="json",
        )
        self.assertEqual(lesson_response.status_code, status.HTTP_201_CREATED)
        lesson = CourseLesson.objects.get(module=module)
        resource_response = self.client.post(
            reverse("studio-lesson-resources", kwargs={"lesson_id": lesson.pk}),
            {"title": "Docs", "url": "http://insecure.example/docs"},
            format="json",
        )
        self.assertEqual(resource_response.status_code, status.HTTP_400_BAD_REQUEST)
        secure_response = self.client.post(
            reverse("studio-lesson-resources", kwargs={"lesson_id": lesson.pk}),
            {"title": "Docs", "url": "https://secure.example/docs"},
            format="json",
        )
        self.assertEqual(secure_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(LessonResource.objects.filter(lesson=lesson).exists())

    def test_review_queue_requires_reviewer_permission(self):
        self.login(self.owner)
        response = self.client.get(reverse("admin-review-queue"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_uuid_missing_returns_404_not_cross_course_data(self):
        self.login(self.owner)
        response = self.client.delete(
            reverse(
                "studio-course-staff-detail",
                kwargs={"slug": self.course.slug, "staff_id": uuid.uuid4()},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
