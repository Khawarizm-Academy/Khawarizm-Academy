"""Tests for the courses feature — models, serializers, and endpoints."""

from __future__ import annotations

from decimal import Decimal

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, api_client, authenticate, make_course, make_user
from features.courses.models import (
    Course,
    CourseLesson,
    CourseLiveSession,
    CourseModule,
    CourseProblem,
    CourseProblemOption,
)
from features.courses.serializers import (
    course_catalog_item,
    course_detail,
    course_problem,
)


def build_course_row() -> Course:
    """A course with one module, one lesson, one live session, one problem."""
    course = make_course(slug="course-1", related_ids=["course-2"])
    module = CourseModule.objects.create(course=course, module_id="m1", title="Module 1")
    CourseLesson.objects.create(module=module, lesson_id="l1", title="Lesson 1", duration="10:00")
    CourseLiveSession.objects.create(
        course=course, session_id="s1", title="Live 1", date_label="12 Oct", time_label="10:00"
    )
    problem = CourseProblem.objects.create(problem_id="p1", prompt="Prompt", correct_option_id="a")
    CourseProblemOption.objects.create(problem=problem, option_id="a", label="Option A")
    return course


class CourseModelTests(TestCase):
    def test_str_returns_the_title(self):
        self.assertEqual(str(make_course(title="Python")), "Python")

    def test_slug_is_a_unique_business_key(self):
        self.assertEqual(Course._meta.pk.name, "id")
        self.assertTrue(Course._meta.get_field("slug").unique)

    def test_exam_defaults(self):
        course = make_course()
        self.assertEqual((course.exam_question_count, course.exam_minutes), (25, 45))
        self.assertEqual(course.exam_pass_threshold, 70)

    def test_module_str_and_unique_key(self):
        course = make_course()
        module = CourseModule.objects.create(course=course, module_id="m1", title="Module")
        self.assertEqual(str(module), "course-1:m1")
        self.assertEqual(CourseModule._meta.unique_together, (("course", "module_id"),))

    def test_lesson_str(self):
        course = make_course()
        module = CourseModule.objects.create(course=course, module_id="m1", title="Module")
        lesson = CourseLesson.objects.create(module=module, lesson_id="l1", title="Lesson", duration="10:00")
        self.assertEqual(str(lesson), "m1:l1")

    def test_live_session_defaults_to_upcoming(self):
        course = make_course()
        session = CourseLiveSession.objects.create(
            course=course, session_id="s1", title="Live", date_label="d", time_label="t"
        )
        self.assertEqual(session.state, "upcoming")

    def test_problem_str_and_unique_business_key(self):
        problem = CourseProblem.objects.create(problem_id="p1", prompt="Prompt", correct_option_id="a")
        self.assertEqual(str(problem), "p1")
        self.assertEqual(CourseProblem._meta.pk.name, "id")
        self.assertTrue(CourseProblem._meta.get_field("problem_id").unique)

    def test_problem_option_str(self):
        problem = CourseProblem.objects.create(problem_id="p1", prompt="Prompt", correct_option_id="a")
        option = CourseProblemOption.objects.create(problem=problem, option_id="a", label="A")
        self.assertEqual(str(option), "p1:a")


class CourseCatalogSerializerTests(TestCase):
    def test_type_and_id(self):
        item = course_catalog_item(make_course(slug="course-1"))
        self.assertEqual((item["type"], item["id"]), ("course", "course-1"))

    def test_drops_empty_optional_fields(self):
        item = course_catalog_item(make_course())
        self.assertNotIn("rating", item)
        self.assertNotIn("duration", item)

    def test_rating_is_a_plain_number(self):
        item = course_catalog_item(make_course(rating=Decimal("4.5")))
        self.assertEqual(item["rating"], 4.5)

    def test_keeps_zero_lessons_count(self):
        self.assertIn("lessonsCount", course_catalog_item(make_course()))


class CourseDetailSerializerTests(TestCase):
    def test_merges_catalog_and_detail_fields(self):
        detail = course_detail(build_course_row())
        self.assertEqual(detail["id"], "course-1")
        self.assertEqual(detail["exam"], {"questionCount": 25, "minutes": 45, "passThreshold": 70, "attemptsLeft": 2})
        self.assertEqual(detail["relatedIds"], ["course-2"])

    def test_nests_modules_lessons_and_live_sessions(self):
        detail = course_detail(build_course_row())
        self.assertEqual(detail["modules"][0]["lessons"][0]["id"], "l1")
        self.assertEqual(detail["liveSessions"][0]["id"], "s1")

    def test_language_label_is_localized(self):
        self.assertEqual(course_detail(build_course_row())["languageLabel"], "العربية")

    def test_rating_falls_back_to_zero(self):
        self.assertEqual(course_detail(make_course())["rating"], 0)


class CourseProblemSerializerTests(TestCase):
    def test_shape_and_options(self):
        build_course_row()
        payload = course_problem(CourseProblem.objects.prefetch_related("options").get(problem_id="p1"))
        self.assertEqual(payload["id"], "p1")
        self.assertEqual(payload["options"], [{"id": "a", "label": "Option A"}])


class CourseViewTests(ApiTestCase):
    def test_detail_returns_the_landing_record(self):
        build_course_row()
        body = self.client.get("/api/courses/course-1").json()
        self.assertEqual(body["id"], "course-1")
        self.assertEqual(body["modules"][0]["id"], "m1")

    def test_detail_missing_slug_returns_404(self):
        response = self.client.get("/api/courses/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "الدورة غير موجودة"})

    def test_problems_list_returns_the_shared_set(self):
        build_course_row()
        body = self.client.get("/api/problems").json()
        self.assertEqual([problem["id"] for problem in body], ["p1"])

    def test_course_problems_returns_the_same_set(self):
        build_course_row()
        self.assertEqual(self.client.get("/api/courses/course-1/problems").json()[0]["id"], "p1")

    def test_related_returns_catalog_cards(self):
        build_course_row()
        make_course(slug="course-2")
        body = self.client.get("/api/courses/course-1/related").json()
        self.assertEqual([item["id"] for item in body], ["course-2"])

    def test_related_missing_course_returns_404(self):
        self.assertEqual(self.client.get("/api/courses/missing/related").status_code, 404)

    def test_enroll_acknowledges(self):
        make_course()
        body = self.client.post("/api/courses/course-1/enroll", {}, format="json").json()
        self.assertEqual(body, {"enrolled": True, "courseId": "course-1"})

    def test_progress_echoes_completed_lessons(self):
        make_course()
        body = self.client.post("/api/courses/course-1/progress", {"completedLessonIds": ["l1"]}, format="json").json()
        self.assertEqual(body, {"courseId": "course-1", "completedLessonIds": ["l1"]})

    def test_progress_without_body_defaults_to_empty_list(self):
        make_course()
        body = self.client.post("/api/courses/course-1/progress", {}, format="json").json()
        self.assertEqual(body["completedLessonIds"], [])

    def test_certificate_metadata(self):
        make_course()
        body = self.client.get("/api/courses/course-1/certificate").json()
        self.assertEqual(body["credentialId"], "KHM-2026-COURSE-1")
        self.assertTrue(body["isOfficial"])

    def test_enroll_rejects_get(self):
        make_course()
        self.assertEqual(self.client.get("/api/courses/course-1/enroll").status_code, 405)


class CoursePersistenceTests(ApiTestCase):
    def test_enroll_persists_for_the_signed_in_learner(self):
        make_course()
        user = make_user()
        authenticate(self.client, user)
        self.client.post("/api/courses/course-1/enroll", {}, format="json")
        self.assertEqual(user.enrollments.count(), 1)

    def test_progress_persists_for_the_signed_in_learner(self):
        make_course()
        user = make_user()
        authenticate(self.client, user)
        self.client.post("/api/courses/course-1/progress", {"progress": 40, "lastLesson": "l2"}, format="json")
        enrollment = user.enrollments.get()
        self.assertEqual((enrollment.progress, enrollment.last_lesson), (40, "l2"))

    def test_favorite_hints_a_visitor_to_sign_in(self):
        make_course()
        body = self.client.post("/api/courses/course-1/favorite", {}, format="json").json()
        self.assertTrue(body["requiresAuth"])

    def test_favorite_toggles_for_the_signed_in_learner(self):
        make_course()
        authenticate(self.client, make_user())
        first = self.client.post("/api/courses/course-1/favorite", {}, format="json").json()
        second = self.client.post("/api/courses/course-1/favorite", {}, format="json").json()
        self.assertTrue(first["favorited"])
        self.assertFalse(second["favorited"])

    def test_favorite_missing_course_is_a_404(self):
        self.assertEqual(self.client.post("/api/courses/missing/favorite", {}, format="json").status_code, 404)


class CourseUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("course-detail", args=["s"]), "/api/courses/s")
        self.assertEqual(reverse("problems-list"), "/api/problems")
        self.assertEqual(reverse("course-certificate", args=["s"]), "/api/courses/s/certificate")


class CourseAdminTests(TestCase):
    def test_all_models_are_registered(self):
        for model in (Course, CourseModule, CourseProblem):
            self.assertTrue(admin.site.is_registered(model))


class CourseQueryGuardTests(ApiTestCase):
    """Phase 6 tripwire: the landing record stays constant-4 however many modules."""

    def test_detail_is_a_constant_query_count(self):
        build_course_row()  # one module, one lesson, one live session
        course = Course.objects.get(slug="course-1")
        second = CourseModule.objects.create(course=course, module_id="m2", title="Module 2")
        CourseLesson.objects.create(module=second, lesson_id="l2", title="Lesson 2", duration="5:00")
        with self.assertNumQueries(4):  # course + modules + lessons + live sessions
            body = self.client.get("/api/courses/course-1").json()
        self.assertEqual([module["id"] for module in body["modules"]], ["m1", "m2"])
        self.assertEqual(body["modules"][1]["lessons"][0]["id"], "l2")


class EnrollCounterTests(ApiTestCase):
    """The dead enrolled_count counter lives again — one commit, F() increment."""

    def _enroll(self):
        return self.client.post("/api/courses/course-1/enroll", {}, format="json")

    def test_first_enroll_increments_the_counter(self):
        make_course()
        authenticate(self.client, make_user())
        self.assertEqual(Course.objects.get(slug="course-1").enrolled_count, 0)
        self._enroll()
        self.assertEqual(Course.objects.get(slug="course-1").enrolled_count, 1)

    def test_re_enrolling_does_not_increment_again(self):
        make_course()
        authenticate(self.client, make_user())
        self._enroll()
        self._enroll()
        self.assertEqual(Course.objects.get(slug="course-1").enrolled_count, 1)

    def test_enroll_bumps_the_catalog_cache_after_the_commit(self):
        make_course()
        self.client.get("/api/catalog")  # warm the interleave
        authenticate(self.client, make_user())
        with self.captureOnCommitCallbacks(execute=True):
            self._enroll()
        with self.assertNumQueries(2):  # a miss at the bumped version, not a stale hit
            api_client().get("/api/catalog")  # a fresh, unauthenticated client
