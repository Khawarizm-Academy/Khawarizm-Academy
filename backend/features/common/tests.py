"""Tests for the shared helpers in features.common."""

from __future__ import annotations

from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from features.common.cache import bump_version, cached, param_digest
from features.common.errors import api_exception_handler
from features.common.serializers import as_number, compact
from features.common.testing import (
    ALLOWED_ORIGIN,
    ApiTestCase,
    authenticate,
    make_course,
    make_scholarship,
    make_user,
)
from features.courses.models import CourseProblem, CourseProblemOption
from features.dashboard.models import Enrollment


def make_problem() -> CourseProblem:
    """One practice problem with an option — the minimum the problem routes render."""
    problem = CourseProblem.objects.create(problem_id="p1", prompt="Prompt", correct_option_id="a")
    CourseProblemOption.objects.create(problem=problem, option_id="a", label="Option A")
    return problem


class CompactTests(TestCase):
    def test_drops_none_and_empty_string(self):
        self.assertEqual(compact(a=1, b=None, c=""), {"a": 1})

    def test_keeps_falsy_values_that_are_not_empty(self):
        self.assertEqual(compact(a=0, b=False, c=[], d={}), {"a": 0, "b": False, "c": [], "d": {}})

    def test_keeps_arabic_strings(self):
        self.assertEqual(compact(label="العربية"), {"label": "العربية"})


class AsNumberTests(TestCase):
    def test_converts_decimal_to_float(self):
        self.assertEqual(as_number(Decimal("4.5")), 4.5)

    def test_none_stays_none(self):
        self.assertIsNone(as_number(None))


class ExceptionHandlerTests(TestCase):
    def test_renders_the_envelope_for_validation_errors(self):
        response = api_exception_handler(ValidationError("bad"), {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data, {"detail": "bad", "code": "validation_error", "fields": {"non_field_errors": ["bad"]}}
        )

    def test_renders_the_envelope_for_field_validation_errors(self):
        response = api_exception_handler(ValidationError({"email": ["required"]}), {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data, {"detail": "required", "code": "validation_error", "fields": {"email": ["required"]}}
        )


class ApiOriginMiddlewareTests(TestCase):
    def test_rejects_request_without_origin(self):
        response = APIClient().get("/api/events")
        self.assertEqual(response.status_code, 403)

    def test_allows_request_with_allowed_origin(self):
        response = APIClient().get("/api/events", HTTP_ORIGIN=ALLOWED_ORIGIN)
        self.assertEqual(response.status_code, 200)


class ItemsContractTests(ApiTestCase):
    """Phase 8: every list endpoint answers a top-level object, never a bare array."""

    def test_dashboard_enrolled_is_wrapped(self):
        user = make_user()
        Enrollment.objects.create(user=user, course=make_course())
        authenticate(self.client, user)
        body = self.client.get("/api/dashboard/enrolled").json()
        self.assertEqual(set(body), {"items"})
        self.assertEqual(body["items"][0]["id"], "course-1")

    def test_the_shared_problems_set_is_wrapped(self):
        make_problem()
        self.assertEqual(set(self.client.get("/api/problems").json()), {"items"})

    def test_course_problems_are_wrapped(self):
        make_problem()
        self.assertEqual(set(self.client.get("/api/courses/course-1/problems").json()), {"items"})

    def test_related_courses_are_wrapped(self):
        make_course(slug="course-1", related_ids=["course-2"])
        make_course(slug="course-2")
        body = self.client.get("/api/courses/course-1/related").json()
        self.assertEqual(set(body), {"items"})
        self.assertEqual([item["id"] for item in body["items"]], ["course-2"])

    def test_device_sessions_are_wrapped(self):
        authenticate(self.client, make_user())
        body = self.client.get("/api/auth/sessions").json()
        self.assertEqual(set(body), {"items"})
        self.assertTrue(body["items"][0]["isCurrent"])


class ErrorEnvelopeContractTests(ApiTestCase):
    """Phase 8: every error is `{detail, code}` (plus `fields` on validation)."""

    def test_a_400_names_its_code(self):
        body = self.client.get("/api/catalog", {"type": "bogus"}).json()
        self.assertEqual(set(body), {"detail", "code"})
        self.assertEqual(body["code"], "invalid_parameter")
        self.assertIn("courses", body["detail"])

    def test_a_404_names_its_code(self):
        body = self.client.get("/api/courses/missing").json()
        self.assertEqual(set(body), {"detail", "code"})
        self.assertEqual(body["code"], "not_found")

    def test_a_401_from_the_session_carries_its_reason_code(self):
        body = self.client.post("/api/auth/refresh", {"refreshToken": "x"}, format="json").json()
        self.assertEqual(set(body), {"detail", "code"})
        self.assertEqual(body["code"], "session_invalid")

    def test_a_403_names_its_code(self):
        authenticate(self.client, make_user())  # a student, not staff
        body = self.client.get("/api/admin/users").json()
        self.assertEqual(set(body), {"detail", "code"})
        self.assertEqual(body["code"], "permission_denied")

    def test_an_unauthenticated_call_names_its_code(self):
        body = APIClient().get("/api/dashboard/enrolled", HTTP_ORIGIN=ALLOWED_ORIGIN).json()
        self.assertEqual(set(body), {"detail", "code"})
        self.assertEqual(body["code"], "not_authenticated")


class TestingHelpersTests(ApiTestCase):
    def test_client_sends_allowed_origin(self):
        self.assertEqual(self.client.get("/api/events").status_code, 200)

    def test_factories_fill_required_fields(self):
        self.assertEqual(make_course().slug, "course-1")
        self.assertEqual(make_scholarship().slug, "scholarship-1")


class CacheHelperTests(TestCase):
    """The app-cache contract: versioned keys, jittered TTLs, one miss line."""

    def setUp(self) -> None:
        super().setUp()
        cache.clear()  # version keys and entries must not leak between tests

    def test_a_miss_calls_the_loader_and_a_hit_does_not(self):
        calls = []

        def loader():
            calls.append(1)
            return {"n": len(calls)}

        first = cached("test-ns", param_digest({"a": 1}), 60, loader)
        second = cached("test-ns", param_digest({"a": 1}), 60, loader)
        self.assertEqual(first, {"n": 1})
        self.assertEqual(second, {"n": 1})  # the loader ran once
        self.assertEqual(len(calls), 1)

    def test_a_version_bump_invalidates_the_whole_family(self):
        counter = {"n": 0}

        def loader():
            counter["n"] += 1
            return {"n": counter["n"]}

        warm = cached("test-bump", "key", 60, loader)
        bump_version("test-bump")
        after = cached("test-bump", "key", 60, loader)
        self.assertEqual(warm, {"n": 1})
        self.assertEqual(after, {"n": 2})  # the loader ran again, fresh value

    def test_a_cached_none_is_a_hit_not_a_miss(self):
        calls = []
        loader = lambda: calls.append(1) and None  # noqa: E731

        self.assertIsNone(cached("test-none", "k", 60, loader))
        self.assertIsNone(cached("test-none", "k", 60, loader))
        self.assertEqual(len(calls), 1)

    def test_every_miss_logs_one_greppable_line(self):
        with self.assertLogs("features.common.cache", level="INFO") as captured:
            cached("test-log", "abc", 60, lambda: {"x": 1})
        self.assertIn("cache miss", captured.records[0].getMessage())
        self.assertEqual(captured.records[0].cache_ns, "test-log")

    def test_param_digest_is_order_insensitive_and_deterministic(self):
        self.assertEqual(param_digest({"a": 1, "b": 2}), param_digest({"b": 2, "a": 1}))
        self.assertNotEqual(param_digest({"a": 1}), param_digest({"a": 2}))
