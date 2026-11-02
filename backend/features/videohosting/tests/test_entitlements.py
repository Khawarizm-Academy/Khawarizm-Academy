"""Playback entitlement matrix and query-budget tests."""

from __future__ import annotations

from uuid import uuid4

from django.contrib.auth.models import AnonymousUser
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from features.access.models import AccessRole, RoleAssignment
from features.auth.models import User
from features.common.choices import CourseStaffKind, CourseStatus, LessonKind, Role, VideoStatus
from features.common.testing import make_course, make_user
from features.courses.models import CourseLesson, CourseModule, CourseStaff
from features.dashboard.models import Enrollment
from features.videohosting.models import VideoAsset
from features.videohosting.services import (
    REASON_ADMIN,
    REASON_ENROLLED,
    REASON_NOT_ENTITLED,
    REASON_OWNER,
    REASON_PREVIEW,
    REASON_STAFF,
    playback_access,
)


class PlaybackEntitlementTests(TestCase):
    def _asset(self, *, created_by=None) -> VideoAsset:
        return VideoAsset.objects.create(
            slug=f"entitlement-{uuid4().hex}",
            title="Entitlement video",
            status=VideoStatus.READY,
            created_by=created_by,
        )

    def _linked_lesson(
        self,
        asset: VideoAsset,
        *,
        status: str = CourseStatus.PUBLISHED,
        is_published: bool = True,
        is_free_preview: bool = False,
    ) -> tuple:
        course = make_course(slug=f"entitlement-course-{uuid4().hex}", status=status)
        module = CourseModule.objects.create(
            course=course,
            module_id=f"module-{uuid4().hex[:8]}",
            title="Entitlement module",
        )
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id=f"lesson-{uuid4().hex[:8]}",
            title="Entitlement lesson",
            kind=LessonKind.VIDEO,
            video_asset=asset,
            is_published=is_published,
            is_free_preview=is_free_preview,
        )
        return course, lesson

    def _permission_user(self, permission: str):
        user = make_user(email=f"{permission.replace('.', '-')}-{uuid4().hex}@example.com")
        role = AccessRole.objects.create(
            slug=f"entitlement-{uuid4().hex[:8]}",
            name="Entitlement test role",
            color="cyan",
            position=100,
            permissions=[permission],
        )
        RoleAssignment.objects.create(user=user, role=role)
        return user

    def test_admin_rule_wins_first(self):
        admin = User.objects.create_superuser(
            email=f"admin-{uuid4().hex}@example.com",
            password="test-pass-123",
        )
        asset = self._asset(created_by=admin)
        self._linked_lesson(asset, is_free_preview=True)

        access = playback_access(admin, asset)

        self.assertEqual(access.allowed, True)
        self.assertEqual((access.reason, access.via), (REASON_ADMIN, "admin"))

    def test_owner_rule_precedes_staff_and_preview(self):
        owner = make_user(email=f"owner-{uuid4().hex}@example.com")
        asset = self._asset(created_by=owner)
        course, _lesson = self._linked_lesson(asset, is_free_preview=True)
        CourseStaff.objects.create(course=course, user=owner, kind=CourseStaffKind.ASSISTANT)

        access = playback_access(owner, asset)

        self.assertEqual((access.reason, access.via), (REASON_OWNER, "owner"))

    def test_any_course_staff_member_can_preview_a_linked_draft_asset(self):
        staff = make_user(email=f"staff-{uuid4().hex}@example.com")
        asset = self._asset()
        course, _lesson = self._linked_lesson(asset, status=CourseStatus.DRAFT)
        CourseStaff.objects.create(course=course, user=staff, kind=CourseStaffKind.ASSISTANT)

        access = playback_access(staff, asset)

        self.assertEqual((access.reason, access.via), (REASON_STAFF, "staff"))

    def test_global_course_or_curriculum_editor_requires_a_linked_lesson(self):
        for permission in ("courses.edit_any", "curriculum.edit_any"):
            with self.subTest(permission=permission):
                editor = self._permission_user(permission)
                unlinked = self._asset()
                self.assertEqual(playback_access(editor, unlinked).reason, REASON_NOT_ENTITLED)

                linked = self._asset()
                self._linked_lesson(linked, status=CourseStatus.DRAFT)
                access = playback_access(editor, linked)
                self.assertEqual((access.reason, access.via), (REASON_STAFF, "staff"))

    def test_anonymous_published_free_preview_is_allowed(self):
        asset = self._asset()
        self._linked_lesson(asset, is_free_preview=True)

        access = playback_access(AnonymousUser(), asset)

        self.assertEqual((access.reason, access.via), (REASON_PREVIEW, "preview"))

    def test_preview_requires_published_lesson_and_published_course(self):
        scenarios = (
            (CourseStatus.PUBLISHED, False),
            (CourseStatus.DRAFT, True),
            (CourseStatus.ARCHIVED, True),
        )
        for status, is_published in scenarios:
            with self.subTest(status=status, is_published=is_published):
                asset = self._asset()
                self._linked_lesson(
                    asset,
                    status=status,
                    is_published=is_published,
                    is_free_preview=True,
                )
                access = playback_access(AnonymousUser(), asset)
                self.assertEqual(access.reason, REASON_NOT_ENTITLED)
                self.assertIsNone(access.via)

    def test_enrollment_allows_published_and_archived_courses_only_with_published_lesson(self):
        learner = make_user(email=f"learner-{uuid4().hex}@example.com")
        scenarios = (
            (CourseStatus.PUBLISHED, True, True),
            (CourseStatus.ARCHIVED, True, True),
            (CourseStatus.DRAFT, True, False),
            (CourseStatus.PUBLISHED, False, False),
        )
        for status, is_published, allowed in scenarios:
            with self.subTest(status=status, is_published=is_published):
                asset = self._asset()
                course, _lesson = self._linked_lesson(
                    asset,
                    status=status,
                    is_published=is_published,
                )
                Enrollment.objects.create(user=learner, course=course)
                access = playback_access(learner, asset)
                self.assertEqual(access.allowed, allowed)
                self.assertEqual(access.reason, REASON_ENROLLED if allowed else REASON_NOT_ENTITLED)
                self.assertEqual(access.via, "enrolled" if allowed else None)

    def test_non_enrolled_learner_is_denied_for_non_preview_content(self):
        learner = make_user(email=f"not-enrolled-{uuid4().hex}@example.com")
        asset = self._asset()
        self._linked_lesson(asset)

        access = playback_access(learner, asset)

        self.assertEqual((access.allowed, access.reason, access.via), (False, REASON_NOT_ENTITLED, None))

    def test_unlinked_asset_is_private_to_owner(self):
        owner = make_user(email=f"unlinked-owner-{uuid4().hex}@example.com")
        other = make_user(email=f"unlinked-other-{uuid4().hex}@example.com")
        asset = self._asset(created_by=owner)

        owner_access = playback_access(owner, asset)
        other_access = playback_access(other, asset)

        self.assertEqual((owner_access.reason, owner_access.via), (REASON_OWNER, "owner"))
        self.assertEqual((other_access.reason, other_access.via), (REASON_NOT_ENTITLED, None))

    def test_cold_permission_snapshot_and_linked_projection_stay_within_three_queries(self):
        learner = User.objects.create_user(
            email=f"cold-query-{uuid4().hex}@example.com",
            password="test-pass-123",
            role=Role.STUDENT,
        )
        asset = self._asset()
        self._linked_lesson(asset)

        with CaptureQueriesContext(connection) as queries:
            access = playback_access(learner, asset)

        self.assertEqual(access.reason, REASON_NOT_ENTITLED)
        self.assertLessEqual(len(queries), 3)
