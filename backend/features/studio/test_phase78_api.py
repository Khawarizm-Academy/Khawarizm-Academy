"""High-value HTTP contracts for the Phase 7-8 Studio APIs."""

from __future__ import annotations

from datetime import timedelta

from django.urls import reverse
from rest_framework import status

from features.auth.models import InstructorProfile
from features.common.choices import CourseStaffKind, CourseStatus, LessonKind, Role, VideoStatus
from features.common.testing import ApiTestCase, authenticate, make_admin, make_course, make_user
from features.courses.models import CourseLesson, CourseModule, CourseStaff, LessonResource
from features.dashboard.models import Enrollment
from features.videohosting.models import VideoAsset


class StudioPhase78ApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.owner = make_user(email="phase78-owner@example.com", role=Role.INSTRUCTOR, full_name="Phase 78 Owner")
        self.other_instructor = make_user(
            email="phase78-other@example.com", role=Role.INSTRUCTOR, full_name="Other Instructor"
        )
        self.student = make_user(email="phase78-student@example.com", role=Role.STUDENT)
        self.course = make_course(
            slug="phase78-course",
            owner=self.owner,
            status=CourseStatus.DRAFT,
            about="A sufficiently long course description for the Phase 7 and Phase 8 editor fixture.",
        )
        CourseStaff.objects.create(course=self.course, user=self.owner, kind=CourseStaffKind.OWNER)

    def login(self, user):
        authenticate(self.client, user)

    def test_student_is_denied_profile_overview_and_course_collection(self):
        self.login(self.student)

        for route_name in ("studio-profile", "studio-overview", "studio-courses"):
            with self.subTest(route_name=route_name):
                response = self.client.get(reverse(route_name))
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_course_collection_is_scoped_to_owned_courses_and_all_requires_any_permission(self):
        other_course = make_course(
            slug="phase78-other-course",
            owner=self.other_instructor,
            status=CourseStatus.PUBLISHED,
        )
        CourseStaff.objects.create(course=other_course, user=self.other_instructor, kind=CourseStaffKind.OWNER)

        self.login(self.owner)
        own = self.client.get(reverse("studio-courses"))
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual({row["slug"] for row in own.data["items"]}, {self.course.slug})

        all_denied = self.client.get(reverse("studio-courses"), {"scope": "all"})
        self.assertEqual(all_denied.status_code, status.HTTP_403_FORBIDDEN)

        admin = make_admin(email="phase78-admin@example.com")
        self.login(admin)
        all_courses = self.client.get(reverse("studio-courses"), {"scope": "all"})
        self.assertEqual(all_courses.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {row["slug"] for row in all_courses.data["items"]},
            {self.course.slug, other_course.slug},
        )

    def test_profile_patch_is_self_scoped_sanitized_and_requires_https_avatar(self):
        self.login(self.owner)

        response = self.client.patch(
            reverse("studio-profile"),
            {
                "headline": "Backend educator",
                "bio": "<script>alert(1)</script><strong>Safe Markdown</strong>",
                "credential": "MSc",
                "expertise": ["Django", "APIs"],
                "avatarUrl": "https://cdn.example.com/phase78-avatar.png",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["headline"], "Backend educator")
        self.assertEqual(response.data["bio"], "alert(1)Safe Markdown")
        self.assertEqual(response.data["avatarUrl"], "https://cdn.example.com/phase78-avatar.png")
        self.assertEqual(InstructorProfile.objects.get(user=self.owner).expertise, ["Django", "APIs"])

        insecure = self.client.patch(
            reverse("studio-profile"),
            {"avatarUrl": "http://cdn.example.com/insecure.png"},
            format="json",
        )
        self.assertEqual(insecure.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(insecure["Cache-Control"], "private, no-store")
        self.assertEqual(InstructorProfile.objects.get(user=self.owner).credential, "MSc")

    def test_overview_only_reports_courses_visible_to_the_instructor(self):
        other_course = make_course(
            slug="phase78-overview-other",
            owner=self.other_instructor,
            status=CourseStatus.PUBLISHED,
        )
        CourseStaff.objects.create(course=other_course, user=self.other_instructor, kind=CourseStaffKind.OWNER)

        self.login(self.owner)
        response = self.client.get(reverse("studio-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["courses"][CourseStatus.DRAFT], 1)
        self.assertEqual(response.data["courses"][CourseStatus.PUBLISHED], 0)
        self.assertEqual([row["courseSlug"] for row in response.data["recentActivity"]], [self.course.slug])

    def test_duplicate_course_copies_graph_without_video_by_default_and_uses_unique_slugs(self):
        module = CourseModule.objects.create(course=self.course, module_id="module-1", title="Module 1", order=0)
        asset = VideoAsset.objects.create(
            slug="phase78-source-video",
            title="Source video",
            status=VideoStatus.READY,
            created_by=self.owner,
        )
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="lesson-1",
            title="Video lesson",
            kind=LessonKind.VIDEO,
            content="Lesson notes",
            video_asset=asset,
            is_published=True,
            order=0,
        )
        LessonResource.objects.create(
            lesson=lesson,
            title="Reference",
            url="https://docs.example.com/reference",
            order=0,
        )

        self.login(self.owner)
        response = self.client.post(reverse("studio-course-duplicate", kwargs={"slug": self.course.slug}))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        clone = self.course.__class__.objects.get(slug="phase78-course-copy")
        self.assertEqual(clone.status, CourseStatus.DRAFT)
        self.assertEqual(clone.owner_id, self.owner.pk)
        cloned_lesson = CourseLesson.objects.get(module__course=clone)
        self.assertEqual(cloned_lesson.content, lesson.content)
        self.assertIsNone(cloned_lesson.video_asset_id)
        self.assertTrue(
            LessonResource.objects.filter(lesson=cloned_lesson, url="https://docs.example.com/reference").exists()
        )

        self.login(self.other_instructor)
        denied = self.client.post(reverse("studio-course-duplicate", kwargs={"slug": self.course.slug}))
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        self.login(self.owner)
        second = self.client.post(reverse("studio-course-duplicate", kwargs={"slug": self.course.slug}))
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.course.__class__.objects.filter(slug="phase78-course-copy-2").exists())

        keep_video = self.client.post(
            f"{reverse('studio-course-duplicate', kwargs={'slug': self.course.slug})}?keepVideos=true",
        )
        self.assertEqual(keep_video.status_code, status.HTTP_201_CREATED)
        kept = self.course.__class__.objects.get(slug="phase78-course-copy-3")
        self.assertEqual(CourseLesson.objects.get(module__course=kept).video_asset_id, asset.pk)

    def test_bulk_archive_is_atomic_for_unauthorized_slugs_and_idempotent_for_owned_courses(self):
        second_owned = make_course(slug="phase78-second-owned", owner=self.owner, status=CourseStatus.DRAFT)
        CourseStaff.objects.create(course=second_owned, user=self.owner, kind=CourseStaffKind.OWNER)
        foreign = make_course(slug="phase78-foreign", owner=self.other_instructor, status=CourseStatus.DRAFT)
        CourseStaff.objects.create(course=foreign, user=self.other_instructor, kind=CourseStaffKind.OWNER)

        self.login(self.owner)
        archived = self.client.post(
            reverse("studio-course-bulk-archive"),
            {"slugs": [self.course.slug, second_owned.slug]},
            format="json",
        )
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertEqual(archived.data["archived"], 2)
        self.course.refresh_from_db()
        second_owned.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.ARCHIVED)
        self.assertEqual(second_owned.status, CourseStatus.ARCHIVED)

        repeat = self.client.post(reverse("studio-course-bulk-archive"), {"slugs": [self.course.slug]}, format="json")
        self.assertEqual(repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(repeat.data["archived"], 0)

        mixed = self.client.post(
            reverse("studio-course-bulk-archive"),
            {"slugs": [self.course.slug, foreign.slug]},
            format="json",
        )
        self.assertEqual(mixed.status_code, status.HTTP_403_FORBIDDEN)
        foreign.refresh_from_db()
        self.assertEqual(foreign.status, CourseStatus.DRAFT)

        self.login(self.student)
        denied = self.client.post(reverse("studio-course-bulk-archive"), {"slugs": [foreign.slug]}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_course_patch_returns_stale_write_conflict_with_current_copy(self):
        self.login(self.owner)
        current = self.course.updated_at
        stale = current.isoformat()
        self.course.__class__.objects.filter(pk=self.course.pk).update(
            title="Newer title", updated_at=current + timedelta(seconds=1)
        )

        response = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": self.course.slug}),
            {"title": "Stale overwrite", "expectedUpdatedAt": stale},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "stale_write")
        self.assertIn("current", response.data["fields"])
        self.course.refresh_from_db()
        self.assertEqual(self.course.title, "Newer title")

    def test_outcomes_and_related_courses_validate_limits_self_and_published_targets(self):
        published = make_course(slug="phase78-related-published", status=CourseStatus.PUBLISHED)
        unpublished = make_course(slug="phase78-related-draft", status=CourseStatus.DRAFT)
        self.login(self.owner)

        too_many_outcomes = self.client.post(
            reverse("studio-course-outcomes", kwargs={"slug": self.course.slug}),
            {"outcomes": [f"Outcome {index}" for index in range(13)]},
            format="json",
        )
        self.assertEqual(too_many_outcomes.status_code, status.HTTP_400_BAD_REQUEST)

        self_reference = self.client.post(
            reverse("studio-course-related-courses", kwargs={"slug": self.course.slug}),
            {"relatedIds": [self.course.slug]},
            format="json",
        )
        self.assertEqual(self_reference.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self_reference.data["code"], "related_self")

        draft_target = self.client.post(
            reverse("studio-course-related-courses", kwargs={"slug": self.course.slug}),
            {"relatedIds": [unpublished.slug]},
            format="json",
        )
        self.assertEqual(draft_target.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(draft_target.data["code"], "related_not_published")

        valid = self.client.post(
            reverse("studio-course-related-courses", kwargs={"slug": self.course.slug}),
            {"relatedIds": [published.slug]},
            format="json",
        )
        self.assertEqual(valid.status_code, status.HTTP_200_OK)
        self.assertEqual(valid.data["relatedIds"], [published.slug])

    def test_duplicate_lesson_copies_resources_but_starts_unpublished_and_not_preview(self):
        module = CourseModule.objects.create(course=self.course, module_id="duplicate-module", title="Module")
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="article-source",
            title="Article source",
            kind=LessonKind.ARTICLE,
            content="Markdown body",
            is_free_preview=True,
            is_published=True,
        )
        LessonResource.objects.create(
            lesson=lesson,
            title="Guide",
            url="https://docs.example.com/guide",
        )

        self.login(self.owner)
        response = self.client.post(reverse("studio-lesson-duplicate", kwargs={"lesson_id": lesson.pk}))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        clone = CourseLesson.objects.get(module=module, lesson_id="article-source-copy")
        self.assertEqual(clone.content, lesson.content)
        self.assertFalse(clone.is_free_preview)
        self.assertFalse(clone.is_published)
        self.assertTrue(LessonResource.objects.filter(lesson=clone, url="https://docs.example.com/guide").exists())

    def test_article_content_matrix_public_preview_locked_enrolled_and_staff_draft(self):
        published = make_course(slug="phase78-content-published", status=CourseStatus.PUBLISHED)
        module = CourseModule.objects.create(course=published, module_id="content-module", title="Content")
        free = CourseLesson.objects.create(
            module=module,
            lesson_id="free-article",
            title="Free article",
            kind=LessonKind.ARTICLE,
            content="Public article",
            is_free_preview=True,
            is_published=True,
        )
        locked = CourseLesson.objects.create(
            module=module,
            lesson_id="locked-article",
            title="Locked article",
            kind=LessonKind.ARTICLE,
            content="Enrolled article",
            is_free_preview=False,
            is_published=True,
        )

        free_url = reverse("course-lesson-content", kwargs={"slug": published.slug, "lesson_uuid": free.pk})
        locked_url = reverse("course-lesson-content", kwargs={"slug": published.slug, "lesson_uuid": locked.pk})
        anonymous_free = self.client.get(free_url)
        self.assertEqual(anonymous_free.status_code, status.HTTP_200_OK)
        self.assertEqual(anonymous_free.data["content"], "Public article")

        anonymous_locked = self.client.get(locked_url)
        self.assertEqual(anonymous_locked.status_code, status.HTTP_403_FORBIDDEN)

        self.login(self.student)
        unenrolled_locked = self.client.get(locked_url)
        self.assertEqual(unenrolled_locked.status_code, status.HTTP_403_FORBIDDEN)
        Enrollment.objects.create(user=self.student, course=published)
        enrolled_locked = self.client.get(locked_url)
        self.assertEqual(enrolled_locked.status_code, status.HTTP_200_OK)
        self.assertEqual(enrolled_locked.data["content"], "Enrolled article")

        draft = make_course(slug="phase78-content-draft", owner=self.owner, status=CourseStatus.DRAFT)
        CourseStaff.objects.create(course=draft, user=self.owner, kind=CourseStaffKind.OWNER)
        draft_module = CourseModule.objects.create(course=draft, module_id="draft-module", title="Draft")
        draft_lesson = CourseLesson.objects.create(
            module=draft_module,
            lesson_id="draft-article",
            title="Draft article",
            kind=LessonKind.ARTICLE,
            content="Staff-only draft",
            is_published=False,
        )
        draft_url = reverse("course-lesson-content", kwargs={"slug": draft.slug, "lesson_uuid": draft_lesson.pk})

        self.login(self.owner)
        staff_draft = self.client.get(draft_url)
        self.assertEqual(staff_draft.status_code, status.HTTP_200_OK)
        self.assertEqual(staff_draft.data["content"], "Staff-only draft")

        self.login(self.other_instructor)
        unrelated_staff = self.client.get(draft_url)
        self.assertEqual(unrelated_staff.status_code, status.HTTP_404_NOT_FOUND)

    def test_resource_and_avatar_urls_reject_non_https(self):
        module = CourseModule.objects.create(course=self.course, module_id="https-module", title="HTTPS")
        lesson = CourseLesson.objects.create(
            module=module,
            lesson_id="https-lesson",
            title="Article",
            kind=LessonKind.ARTICLE,
        )
        self.login(self.owner)
        response = self.client.post(
            reverse("studio-lesson-resources", kwargs={"lesson_id": lesson.pk}),
            {"title": "Unsafe", "url": "http://example.com/file.pdf"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(LessonResource.objects.filter(lesson=lesson).exists())

        secure = self.client.post(
            reverse("studio-lesson-resources", kwargs={"lesson_id": lesson.pk}),
            {"title": "Safe", "url": "https://example.com/file.pdf"},
            format="json",
        )
        self.assertEqual(secure.status_code, status.HTTP_201_CREATED)
        self.assertTrue(LessonResource.objects.filter(lesson=lesson, url="https://example.com/file.pdf").exists())

    def test_staff_candidates_include_only_eligible_users_not_already_on_the_team(self):
        candidate = make_user(
            email="phase78-team-candidate@example.com",
            role=Role.INSTRUCTOR,
            full_name="Phase 78 Team Candidate",
        )
        existing = make_user(
            email="phase78-team-existing@example.com",
            role=Role.INSTRUCTOR,
            full_name="Phase 78 Team Existing",
        )
        non_studio = make_user(
            email="phase78-team-student@example.com",
            role=Role.STUDENT,
            full_name="Phase 78 Team Student",
        )
        CourseStaff.objects.create(course=self.course, user=existing, kind=CourseStaffKind.ASSISTANT)

        self.login(self.owner)
        response = self.client.get(
            reverse("studio-course-staff-candidates", kwargs={"slug": self.course.slug}),
            {"q": "Phase 78 Team"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual({row["id"] for row in response.data["items"]}, {str(candidate.pk)})
        self.assertNotIn(str(existing.pk), {row["id"] for row in response.data["items"]})
        self.assertNotIn(str(non_studio.pk), {row["id"] for row in response.data["items"]})

    def test_team_search_and_removal_are_course_owner_scoped(self):
        member = make_user(email="phase78-removable@example.com", role=Role.INSTRUCTOR)
        member_row = CourseStaff.objects.create(
            course=self.course,
            user=member,
            kind=CourseStaffKind.CO_INSTRUCTOR,
        )
        foreign_course = make_course(
            slug="phase78-foreign-staff",
            owner=self.other_instructor,
            status=CourseStatus.DRAFT,
        )
        CourseStaff.objects.create(course=foreign_course, user=self.other_instructor, kind=CourseStaffKind.OWNER)
        foreign_member = CourseStaff.objects.create(
            course=foreign_course,
            user=member,
            kind=CourseStaffKind.ASSISTANT,
        )

        self.login(self.owner)
        search_foreign = self.client.get(
            reverse("studio-course-staff-candidates", kwargs={"slug": foreign_course.slug}),
            {"q": "phase78"},
        )
        self.assertEqual(search_foreign.status_code, status.HTTP_403_FORBIDDEN)

        remove_foreign = self.client.delete(
            reverse(
                "studio-course-staff-detail",
                kwargs={"slug": foreign_course.slug, "staff_id": foreign_member.pk},
            )
        )
        self.assertEqual(remove_foreign.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(CourseStaff.objects.filter(pk=foreign_member.pk).exists())

        remove_owned = self.client.delete(
            reverse(
                "studio-course-staff-detail",
                kwargs={"slug": self.course.slug, "staff_id": member_row.pk},
            )
        )
        self.assertEqual(remove_owned.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CourseStaff.objects.filter(pk=member_row.pk).exists())
