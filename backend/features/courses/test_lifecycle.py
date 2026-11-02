"""High-value ownership, lifecycle, curriculum, and visibility contracts."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth.models import AnonymousUser
from django.urls import reverse
from rest_framework import status

from features.access.models import AuditEvent
from features.common.choices import AuditAction, CourseStaffKind, CourseStatus, LessonKind, Role, VideoStatus
from features.common.errors import Conflict, HasEnrollments, InvalidParameter, PermissionDenied
from features.common.testing import ApiTestCase, authenticate, make_admin, make_course, make_user
from features.courses import services
from features.courses.models import Course, CourseLesson, CourseLiveSession, CourseModule, CourseStaff
from features.dashboard.models import Certificate, Enrollment, FavoriteCourse, ImminentLiveSession, PriorityContinue
from features.home.models import HomeFeaturedCourse
from features.videohosting.models import VideoAsset

LONG_ABOUT = (
    "This carefully prepared course description is intentionally longer than eighty characters so that "
    "the publish checklist treats the fixture as complete."
)


def ready_course(slug: str, owner_email: str):
    """Return an instructor-owned draft with one publishable article lesson."""
    owner = make_user(email=owner_email, role=Role.INSTRUCTOR, full_name="Course Owner")
    course = make_course(
        slug=slug,
        owner=owner,
        status=CourseStatus.DRAFT,
        title="Lifecycle Course",
        about=LONG_ABOUT,
        category_label="Programming",
        category_slug="programming",
        thumbnail_url=f"https://cdn.example.com/{slug}.png",
        outcomes=["Understand the topic", "Build a project", "Review the result"],
    )
    CourseStaff.objects.create(course=course, user=owner, kind=CourseStaffKind.OWNER)
    module = CourseModule.objects.create(course=course, module_id="module-1", title="Module 1", order=0)
    lesson = CourseLesson.objects.create(
        module=module,
        lesson_id="article-1",
        title="Article lesson",
        kind=LessonKind.ARTICLE,
        content="Useful article content for the learner.",
        is_free_preview=True,
        is_published=True,
        order=0,
    )
    return course, owner, module, lesson


class CourseLifecycleModelTests(ApiTestCase):
    def test_existing_course_defaults_to_published(self):
        course = make_course(slug="default-published")
        self.assertEqual(course.status, CourseStatus.PUBLISHED)

    def test_create_course_starts_draft_and_creates_owner_staff(self):
        owner = make_user(email="create-owner@example.com", role=Role.INSTRUCTOR, full_name="Create Owner")
        course = services.create_course(
            owner,
            {
                "slug": "created-draft",
                "title": "Created draft",
                "categoryLabel": "Programming",
                "categorySlug": "programming",
                "thumbnailUrl": "https://cdn.example.com/created-draft.png",
                "courseLevel": "beginner",
            },
        )
        self.assertEqual(course.status, CourseStatus.DRAFT)
        self.assertEqual(course.owner_id, owner.pk)
        self.assertTrue(CourseStaff.objects.filter(course=course, user=owner, kind=CourseStaffKind.OWNER).exists())
        self.assertEqual(course.instructor, "Create Owner")

    def test_draft_image_default_cannot_pass_publish_checklist(self):
        course, _owner, _module, _lesson = ready_course("checklist-image", "checklist-owner@example.com")
        course.thumbnail_url = ""
        course.save(update_fields=["thumbnail_url", "updated_at"])
        checklist = services.publish_checklist(course)
        self.assertFalse(checklist["ready"])
        self.assertIn("thumbnail_missing", {issue["code"] for issue in checklist["issues"]})

    def test_invalid_submit_and_publish_return_422_with_blocking_issue_details(self):
        course, owner, _module, _lesson = ready_course("invalid-submit", "invalid-submit@example.com")
        course.title = ""
        course.about = "short"
        course.thumbnail_url = ""
        course.category_slug = ""
        course.save(update_fields=["title", "about", "thumbnail_url", "category_slug", "updated_at"])
        authenticate(self.client, owner)
        submit = self.client.post(reverse("studio-course-submit", kwargs={"slug": course.slug}))
        self.assertEqual(submit.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(submit.json()["code"], "not_publishable")
        self.assertIn("title_missing", {issue["code"] for issue in submit.json()["fields"]["issues"]})

        invalid_publish, _owner, _module, _lesson = ready_course("invalid-publish", "invalid-publish@example.com")
        invalid_publish.about = "short"
        invalid_publish.save(update_fields=["about", "updated_at"])
        admin = make_admin(email="invalid-publish-admin@example.com")
        authenticate(self.client, admin)
        publish = self.client.post(reverse("studio-course-publish", kwargs={"slug": invalid_publish.slug}))
        self.assertEqual(publish.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(publish.json()["code"], "not_publishable")
        self.assertIn("description_short", {issue["code"] for issue in publish.json()["fields"]["issues"]})

    def test_draft_transitions_through_review_to_published_and_is_audited(self):
        course, owner, _module, _lesson = ready_course("review-transition", "review-owner@example.com")
        authenticate(self.client, owner)
        submit = self.client.post(reverse("studio-course-submit", kwargs={"slug": course.slug}))
        self.assertEqual(submit.status_code, status.HTTP_200_OK)
        course.refresh_from_db()
        self.assertEqual(course.status, CourseStatus.IN_REVIEW)
        self.assertIsNotNone(course.submitted_at)

        admin = make_admin(email="review-admin@example.com")
        authenticate(self.client, admin)
        approve = self.client.post(reverse("admin-review-approve", kwargs={"slug": course.slug}))
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        course.refresh_from_db()
        self.assertEqual(course.status, CourseStatus.PUBLISHED)
        self.assertIsNotNone(course.published_at)
        self.assertTrue(
            AuditEvent.objects.filter(
                action=AuditAction.COURSE_PUBLISHED,
                target_type="course",
                target_id=str(course.pk),
                actor=admin,
            ).exists()
        )

    def test_unpublish_without_enrollment_returns_draft_and_enrollment_forces_archive(self):
        no_enrollment, _owner, _module, _lesson = ready_course("unpublish-draft", "unpublish-draft@example.com")
        admin = make_admin(email="unpublish-admin@example.com")
        services.publish(no_enrollment, admin)
        services.unpublish_or_archive(no_enrollment, admin)
        no_enrollment.refresh_from_db()
        self.assertEqual(no_enrollment.status, CourseStatus.DRAFT)

        enrolled, _owner, _module, _lesson = ready_course("unpublish-archive", "unpublish-archive@example.com")
        services.publish(enrolled, admin)
        learner = make_user(email="archive-learner@example.com")
        services.enroll(learner, enrolled)
        services.unpublish_or_archive(enrolled, admin)
        enrolled.refresh_from_db()
        self.assertEqual(enrolled.status, CourseStatus.ARCHIVED)
        with self.assertRaises(HasEnrollments):
            services.delete_course(enrolled, admin)
        self.assertTrue(Course.objects.filter(pk=enrolled.pk).exists())
        self.assertTrue(
            AuditEvent.objects.filter(
                action=AuditAction.COURSE_UNPUBLISHED, target_id=str(enrolled.pk), target_type="course"
            ).exists()
        )

    def test_published_slug_is_locked_for_owner_but_admin_can_override(self):
        course, owner, _module, _lesson = ready_course("slug-locked", "slug-owner@example.com")
        admin = make_admin(email="slug-admin@example.com")
        services.publish(course, admin)

        authenticate(self.client, owner)
        owner_update = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": course.slug}),
            {"slug": "owner-renamed"},
            format="json",
        )
        self.assertEqual(owner_update.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(owner_update.json()["code"], "slug_locked")

        authenticate(self.client, admin)
        services.unpublish_or_archive(course, admin)
        authenticate(self.client, owner)
        owner_after_unpublish = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": course.slug}),
            {"slug": "owner-renamed-after-unpublish"},
            format="json",
        )
        self.assertEqual(owner_after_unpublish.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(owner_after_unpublish.json()["code"], "slug_locked")

        authenticate(self.client, admin)
        admin_update = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": course.slug}),
            {"slug": "admin-renamed"},
            format="json",
        )
        self.assertEqual(admin_update.status_code, status.HTTP_200_OK)
        self.assertTrue(Course.objects.filter(slug="admin-renamed", status=CourseStatus.DRAFT).exists())


class CourseVisibilityTests(ApiTestCase):
    def test_co_instructor_can_preview_but_assistant_cannot_edit_course(self):
        course, _owner, _module, _lesson = ready_course("staff-boundary", "staff-boundary-owner@example.com")
        co_instructor = make_user(email="staff-co@example.com", role=Role.INSTRUCTOR)
        assistant = make_user(email="staff-assistant@example.com", role=Role.INSTRUCTOR)
        CourseStaff.objects.create(course=course, user=co_instructor, kind=CourseStaffKind.CO_INSTRUCTOR)
        CourseStaff.objects.create(course=course, user=assistant, kind=CourseStaffKind.ASSISTANT)

        authenticate(self.client, co_instructor)
        co_preview = self.client.get(reverse("course-detail", kwargs={"slug": course.slug}))
        self.assertEqual(co_preview.status_code, status.HTTP_200_OK)
        self.assertEqual(co_preview["Cache-Control"], "private, no-store")
        self.assertEqual(
            self.client.get(reverse("studio-course-detail", kwargs={"slug": course.slug})).status_code,
            status.HTTP_200_OK,
        )

        authenticate(self.client, assistant)
        self.assertEqual(
            self.client.get(reverse("course-detail", kwargs={"slug": course.slug})).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.get(reverse("studio-course-detail", kwargs={"slug": course.slug})).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unrelated_instructor_cannot_read_or_edit_draft_but_owner_can_preview(self):
        course, owner, _module, _lesson = ready_course("private-draft", "private-owner@example.com")
        other = make_user(email="private-other@example.com", role=Role.INSTRUCTOR)

        authenticate(self.client, other)
        public_detail = self.client.get(reverse("course-detail", kwargs={"slug": course.slug}))
        self.assertEqual(public_detail.status_code, status.HTTP_404_NOT_FOUND)
        studio_detail = self.client.get(reverse("studio-course-detail", kwargs={"slug": course.slug}))
        self.assertEqual(studio_detail.status_code, status.HTTP_403_FORBIDDEN)
        edit = self.client.patch(
            reverse("studio-course-detail", kwargs={"slug": course.slug}), {"title": "No access"}, format="json"
        )
        self.assertEqual(edit.status_code, status.HTTP_403_FORBIDDEN)

        authenticate(self.client, owner)
        owner_preview = self.client.get(reverse("course-detail", kwargs={"slug": course.slug}))
        self.assertEqual(owner_preview.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_preview["Cache-Control"], "private, no-store")
        self.assertTrue(owner_preview.json()["isPreview"])
        self.assertEqual(owner_preview.json()["status"], CourseStatus.DRAFT)
        self.assertIsNone(owner_preview.json()["modules"][0]["lessons"][0]["videoSlug"])

    def test_visible_to_includes_archived_but_public_catalog_excludes_drafts(self):
        draft, _owner, _module, _lesson = ready_course("visible-draft", "visible-draft@example.com")
        archived = make_course(slug="visible-archived", status=CourseStatus.ARCHIVED)
        published = make_course(slug="visible-published", status=CourseStatus.PUBLISHED)
        public = Course.objects.visible_to(AnonymousUser()).values_list("slug", flat=True)
        self.assertEqual(set(public), {archived.slug, published.slug})

        body = self.client.get("/api/catalog", {"type": "courses"}).json()
        ids = {item["id"] for item in body["items"]}
        self.assertNotIn(draft.slug, ids)
        self.assertIn(published.slug, ids)
        self.assertNotIn(archived.slug, ids)

        archived_detail = self.client.get(reverse("course-detail", kwargs={"slug": archived.slug}))
        self.assertEqual(archived_detail.status_code, status.HTTP_200_OK)
        self.assertFalse(archived_detail.json()["enrollable"])

    def test_public_home_rail_skips_draft_course(self):
        draft, _owner, _module, _lesson = ready_course("home-draft", "home-draft@example.com")
        published = make_course(slug="home-published", status=CourseStatus.PUBLISHED)
        HomeFeaturedCourse.objects.create(course=draft)
        HomeFeaturedCourse.objects.create(course=published)
        course_ids = [row["id"] for row in self.client.get("/api/home").json()["courses"]]
        self.assertEqual(course_ids, [published.slug])

    def test_learner_dashboard_hides_draft_courses_but_keeps_archived_favorites(self):
        draft, _owner, _module, _lesson = ready_course("dashboard-private-draft", "dashboard-private@example.com")
        published = make_course(slug="dashboard-published", status=CourseStatus.PUBLISHED)
        archived = make_course(slug="dashboard-archived", status=CourseStatus.ARCHIVED)
        learner = make_user(email="dashboard-private-learner@example.com")
        FavoriteCourse.objects.create(user=learner, course=draft)
        FavoriteCourse.objects.create(user=learner, course=published)
        FavoriteCourse.objects.create(user=learner, course=archived)
        Certificate.objects.create(user=learner, course=draft, credential_id="draft-credential")
        Certificate.objects.create(user=learner, course=published, credential_id="published-credential")
        Certificate.objects.create(user=learner, course=archived, credential_id="archived-credential")
        PriorityContinue.objects.create(user=learner, course=draft)
        session = CourseLiveSession.objects.create(
            course=draft,
            session_id="private-session",
            title="Private session",
            date_label="Monday",
            time_label="10:00",
        )
        ImminentLiveSession.objects.create(user=learner, session=session)

        authenticate(self.client, learner)
        saved = self.client.get("/api/dashboard/saved").json()
        self.assertEqual({row["id"] for row in saved["courses"]}, {published.slug, archived.slug})
        certificates = self.client.get("/api/dashboard/competitions").json()["certificates"]
        self.assertEqual({row["id"] for row in certificates}, {published.slug, archived.slug})
        summary = self.client.get("/api/dashboard").json()
        self.assertIsNone(summary["priorityContinue"])
        self.assertIsNone(summary["imminentLiveSession"])

    def test_lesson_visibility_and_staff_safe_instructors_are_additive(self):
        course, owner, module, article = ready_course("lesson-visibility", "lesson-owner@example.com")
        asset = VideoAsset.objects.create(
            slug="lesson-visibility-video",
            title="Lesson video",
            status=VideoStatus.READY,
            duration_seconds=3600,
            created_by=owner,
        )
        visible_video = CourseLesson.objects.create(
            module=module,
            lesson_id="video-1",
            title="Video lesson",
            kind=LessonKind.VIDEO,
            video_asset=asset,
            duration_seconds=3600,
            duration="1 ساعة",
            is_free_preview=False,
            is_published=True,
            order=1,
        )
        hidden = CourseLesson.objects.create(
            module=module,
            lesson_id="hidden-1",
            title="Hidden lesson",
            kind=LessonKind.ARTICLE,
            content="Hidden content",
            is_published=False,
            order=2,
        )
        course.status = CourseStatus.PUBLISHED
        course.save(update_fields=["status", "updated_at"])

        public = self.client.get(reverse("course-detail", kwargs={"slug": course.slug})).json()
        public_lessons = public["modules"][0]["lessons"]
        self.assertEqual({lesson["id"] for lesson in public_lessons}, {article.lesson_id, visible_video.lesson_id})
        self.assertNotIn(hidden.lesson_id, {lesson["id"] for lesson in public_lessons})
        video_payload = next(lesson for lesson in public_lessons if lesson["id"] == visible_video.lesson_id)
        self.assertTrue(video_payload["hasVideo"])
        self.assertEqual(video_payload["videoSlug"], asset.slug)
        self.assertNotIn("isPublished", video_payload)
        self.assertNotIn("email", str(public).lower())

        authenticate(self.client, owner)
        staff = self.client.get(reverse("course-detail", kwargs={"slug": course.slug})).json()
        staff_lessons = staff["modules"][0]["lessons"]
        hidden_payload = next(lesson for lesson in staff_lessons if lesson["id"] == hidden.lesson_id)
        self.assertFalse(hidden_payload["isPublished"])
        self.assertNotIn("email", str(staff).lower())

    def test_course_detail_remains_four_queries_with_relations(self):
        course, _owner, module, _lesson = ready_course("four-query-detail", "four-query-owner@example.com")
        CourseLesson.objects.create(
            module=module,
            lesson_id="article-2",
            title="Second article",
            kind=LessonKind.ARTICLE,
            content="Second article content",
            is_published=True,
            order=1,
        )
        from features.courses.models import CourseLiveSession

        CourseLiveSession.objects.create(
            course=course,
            session_id="session-1",
            title="Weekly review",
            date_label="Monday",
            time_label="10:00",
        )
        course.status = CourseStatus.PUBLISHED
        course.save(update_fields=["status", "updated_at"])
        with self.assertNumQueries(4):
            response = self.client.get(reverse("course-detail", kwargs={"slug": course.slug}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["modules"][0]["lessons"]), 2)
        self.assertEqual(response.json()["liveSessions"][0]["id"], "session-1")


class CourseCurriculumTests(ApiTestCase):
    def test_lesson_patch_rejects_an_outdated_expected_timestamp(self):
        _course, owner, _module, lesson = ready_course("stale-lesson", "stale-lesson@example.com")
        stale = CourseLesson.objects.get(pk=lesson.pk)
        expected = stale.updated_at.isoformat()
        CourseLesson.objects.filter(pk=lesson.pk).update(
            title="Newer committed title", updated_at=stale.updated_at + timedelta(seconds=1)
        )

        with self.assertRaises(Conflict):
            services.update_lesson(stale, owner, {"title": "Stale overwrite", "expectedUpdatedAt": expected})
        stale.refresh_from_db()
        self.assertEqual(stale.title, "Newer committed title")

    def test_instructor_cannot_link_another_users_video_asset(self):
        _course, owner, _module, lesson = ready_course("foreign-video", "foreign-video-owner@example.com")
        asset_owner = make_user(email="foreign-video-asset-owner@example.com", role=Role.INSTRUCTOR)
        asset = VideoAsset.objects.create(
            slug="owned-by-someone-else", created_by=asset_owner, status=VideoStatus.READY
        )

        with self.assertRaises(PermissionDenied):
            services.link_video(lesson, asset, owner)

    def test_recompute_stats_counts_published_lessons_and_preserves_seed_duration_forms(self):
        for index, (seconds, expected) in enumerate(((6 * 3600, "6 ساعات"), (12 * 3600, "12 ساعة")), start=1):
            course = make_course(slug=f"stats-course-{index}")
            module = CourseModule.objects.create(course=course, module_id="module-1", title="Module")
            CourseLesson.objects.create(
                module=module,
                lesson_id="published",
                title="Published",
                duration_seconds=seconds,
                is_published=True,
            )
            CourseLesson.objects.create(
                module=module,
                lesson_id="unpublished",
                title="Unpublished",
                duration_seconds=999,
                is_published=False,
            )
            services.recompute_course_stats(course)
            course.refresh_from_db()
            self.assertEqual((course.lessons_count, course.total_seconds, course.duration), (1, seconds, expected))

    def test_module_reorder_requires_complete_unique_ids_and_preserves_exact_order(self):
        course, owner, _module, _lesson = ready_course("module-reorder", "module-reorder@example.com")
        for index in range(2, 4):
            CourseModule.objects.create(
                course=course, module_id=f"module-{index}", title=f"Module {index}", order=index
            )
        with self.assertRaises(InvalidParameter):
            services.reorder_modules(course, owner, ["module-1", "module-2"])
        with self.assertRaises(InvalidParameter):
            services.reorder_modules(course, owner, ["module-1", "module-1", "module-3"])
        services.reorder_modules(course, owner, ["module-3", "module-1", "module-2"])
        self.assertEqual(
            list(CourseModule.objects.filter(course=course).order_by("order").values_list("module_id", flat=True)),
            ["module-3", "module-1", "module-2"],
        )
        self.assertEqual(
            dict(CourseModule.objects.filter(course=course).values_list("module_id", "order")),
            {"module-1": 1, "module-2": 2, "module-3": 0},
        )

    def test_cross_module_moves_reject_malformed_cross_course_and_duplicate_ambiguity(self):
        course, owner, first, first_lesson = ready_course("lesson-moves", "lesson-moves@example.com")
        second = CourseModule.objects.create(course=course, module_id="module-2", title="Module 2", order=1)
        second_lesson = CourseLesson.objects.create(
            module=second, lesson_id="article-2", title="Second", kind=LessonKind.ARTICLE, order=0
        )
        other_course = make_course(slug="other-course-for-move")
        other_module = CourseModule.objects.create(course=other_course, module_id="other-module", title="Other")

        original = (first_lesson.module_id, first_lesson.order, second_lesson.module_id, second_lesson.order)
        with self.assertRaises(InvalidParameter):
            services.reorder_lessons(first, owner, [], moves=[{"lessonId": first_lesson.lesson_id}])
        with self.assertRaises(InvalidParameter):
            services.reorder_lessons(
                first,
                owner,
                [],
                moves=[
                    {"lessonId": first_lesson.lesson_id, "moduleId": second.module_id, "order": 0},
                    {"lessonId": first_lesson.lesson_id, "moduleId": second.module_id, "order": 1},
                ],
            )
        with self.assertRaises(InvalidParameter):
            services.reorder_lessons(
                first,
                owner,
                [],
                moves=[{"lessonId": first_lesson.lesson_id, "moduleId": other_module.module_id, "order": 0}],
            )
        self.assertEqual(
            (first_lesson.module_id, first_lesson.order, second_lesson.module_id, second_lesson.order), original
        )

        services.reorder_lessons(
            first,
            owner,
            [],
            moves=[
                {"lessonId": first_lesson.lesson_id, "moduleId": second.module_id, "order": 1},
                {"lessonId": second_lesson.lesson_id, "moduleId": first.module_id, "order": 0},
            ],
        )
        first_lesson.refresh_from_db()
        second_lesson.refresh_from_db()
        self.assertEqual((first_lesson.module_id, first_lesson.order), (second.pk, 1))
        self.assertEqual((second_lesson.module_id, second_lesson.order), (first.pk, 0))


class CourseEnrollmentAndCacheTests(ApiTestCase):
    def test_catalog_changes_after_publish_and_unpublish_commit(self):
        course, _owner, _module, _lesson = ready_course("cache-lifecycle", "cache-owner@example.com")
        admin = make_admin(email="cache-admin@example.com")
        self.assertNotIn(course.slug, {item["id"] for item in self.client.get("/api/catalog").json()["items"]})

        with self.captureOnCommitCallbacks(execute=True):
            services.publish(course, admin)
        self.assertIn(course.slug, {item["id"] for item in self.client.get("/api/catalog").json()["items"]})

        with self.captureOnCommitCallbacks(execute=True):
            services.unpublish_or_archive(course, admin)
        self.assertNotIn(course.slug, {item["id"] for item in self.client.get("/api/catalog").json()["items"]})

    def test_enroll_and_progress_do_not_make_draft_or_archived_courses_enrollable(self):
        draft, _owner, _module, _lesson = ready_course("not-enrollable-draft", "not-enrollable-draft@example.com")
        archived = make_course(slug="not-enrollable-archived", status=CourseStatus.ARCHIVED)
        learner = make_user(email="not-enrollable-learner@example.com")
        authenticate(self.client, learner)

        draft_enroll = self.client.post(reverse("course-enroll", kwargs={"slug": draft.slug}), {}, format="json")
        archived_enroll = self.client.post(reverse("course-enroll", kwargs={"slug": archived.slug}), {}, format="json")
        self.assertEqual(draft_enroll.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(archived_enroll.status_code, status.HTTP_409_CONFLICT)

        draft_progress = self.client.post(
            reverse("course-progress", kwargs={"slug": draft.slug}), {"progress": 25}, format="json"
        )
        archived_progress = self.client.post(
            reverse("course-progress", kwargs={"slug": archived.slug}), {"progress": 25}, format="json"
        )
        self.assertEqual(draft_progress.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(archived_progress.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Enrollment.objects.filter(user=learner, course__in=[draft, archived]).exists())
