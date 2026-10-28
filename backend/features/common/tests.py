"""Tests for the shared helpers in features.common."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from features.auth.models import AuthEvent
from features.common.cache import _version, bump_version, cached, param_digest
from features.common.choices import AuthEventKind, MaintenanceRunStatus
from features.common.errors import api_exception_handler
from features.common.maintenance import run_cleanup
from features.common.models import MaintenanceRun
from features.common.serializers import as_number, compact
from features.common.testing import (
    ALLOWED_ORIGIN,
    ApiTestCase,
    authenticate,
    make_admin,
    make_course,
    make_scholarship,
    make_user,
)
from features.courses import services as courses_services
from features.courses.models import CourseProblem, CourseProblemOption
from features.dashboard.models import Enrollment
from features.videohosting.models import DriveAuthState, StreamToken, UploadSession, VideoAsset, VideoProvider


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


class CleanupExpiredTests(TestCase):
    """The maintenance job: sweeps the four dead-weight families, idempotently."""

    def _seed(self) -> None:
        now = timezone.now()
        provider = VideoProvider.objects.create(code="test", name="Test")
        asset = VideoAsset.objects.create(slug="tok-asset", provider=provider)
        StreamToken.objects.create(token_hash="a" * 64, asset=asset, expires_at=now - timedelta(hours=1))
        StreamToken.objects.create(token_hash="b" * 64, asset=asset, expires_at=now + timedelta(hours=1))
        stale_session = UploadSession.objects.create(asset=asset, provider=provider, session_key="old")
        UploadSession.objects.filter(pk=stale_session.pk).update(updated_at=now - timedelta(days=8))
        UploadSession.objects.create(asset=asset, provider=provider, session_key="fresh")
        DriveAuthState.objects.create(state_hash="c" * 64, expires_at=now - timedelta(minutes=1))
        DriveAuthState.objects.create(state_hash="d" * 64, expires_at=now + timedelta(days=1))
        old_event = AuthEvent.objects.create(kind=AuthEventKind.LOGIN)
        old_created = now - timedelta(days=1 + 180)  # one day past the default retention
        AuthEvent.objects.filter(pk=old_event.pk).update(created_at=old_created)
        AuthEvent.objects.create(kind=AuthEventKind.LOGIN)

    def _alive(self) -> dict[str, int]:
        from features.videohosting.models import DriveAuthState as D
        from features.videohosting.models import StreamToken as S
        from features.videohosting.models import UploadSession as U

        return {
            "tokens": S.objects.count(),
            "sessions": U.objects.count(),
            "drive": D.objects.count(),
            "events": AuthEvent.objects.count(),
        }

    def test_the_command_sweeps_expired_rows_and_keeps_fresh_ones(self):
        self._seed()
        out = StringIO()
        call_command("cleanup_expired", stdout=out)
        alive = self._alive()
        self.assertEqual(alive, {"tokens": 1, "sessions": 1, "drive": 1, "events": 1})
        run = MaintenanceRun.objects.get()
        self.assertEqual(run.status, MaintenanceRunStatus.DONE)
        self.assertEqual(run.deleted, {"streamTokens": 1, "uploadSessions": 1, "driveAuthStates": 1, "authEvents": 1})

    def test_running_twice_leaves_identical_state(self):
        self._seed()
        call_command("cleanup_expired", stdout=StringIO())
        after_first = self._alive()
        out = StringIO()
        call_command("cleanup_expired", stdout=out)
        self.assertEqual(self._alive(), after_first)
        # The second run deletes nothing more and still reports every family.
        self.assertIn("streamTokens: 0", out.getvalue())
        self.assertIn("authEvents: 0", out.getvalue())

    def test_the_service_counts_each_family(self):
        self._seed()
        result = run_cleanup(trigger="command")
        self.assertEqual(result["status"], "done")
        self.assertEqual(
            result["deleted"], {"streamTokens": 1, "uploadSessions": 1, "driveAuthStates": 1, "authEvents": 1}
        )


class OverlapGuardTests(TestCase):
    """A still-running marker makes the next run exit 0 with `skipped`."""

    def _expired_token(self) -> StreamToken:
        now = timezone.now()
        asset = VideoAsset.objects.create(slug="guard-asset")
        return StreamToken.objects.create(token_hash="e" * 64, asset=asset, expires_at=now - timedelta(hours=1))

    def test_a_live_marker_skips_the_run_without_deleting(self):
        token = self._expired_token()
        MaintenanceRun.objects.create(trigger="command")  # status defaults to running
        out = StringIO()
        call_command("cleanup_expired", stdout=out)
        self.assertIn("skipped, still running", out.getvalue())
        self.assertTrue(StreamToken.objects.filter(pk=token.pk).exists())

    def test_a_stale_marker_does_not_block(self):
        self._expired_token()
        stale = MaintenanceRun.objects.create(trigger="command")
        MaintenanceRun.objects.filter(pk=stale.pk).update(started_at=timezone.now() - timedelta(hours=2))
        out = StringIO()
        call_command("cleanup_expired", stdout=out)
        self.assertIn("cleanup done", out.getvalue())


CRON_SECRET = "cron-secret-value"


@override_settings(MAINTENANCE_CRON_SECRET=CRON_SECRET)
class MaintenanceEndpointTests(ApiTestCase):
    """`/api/admin/maintenance/cleanup`: staff or cron secret, 202 status body."""

    def test_staff_bearer_runs_the_cleanup(self):
        authenticate(self.client, make_admin())
        response = self.client.post("/api/admin/maintenance/cleanup")
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "done")
        self.assertEqual(
            set(response.json()["deleted"]), {"streamTokens", "uploadSessions", "driveAuthStates", "authEvents"}
        )
        self.assertEqual(MaintenanceRun.objects.get().trigger, "endpoint")

    def test_the_cron_secret_authenticates_without_a_session(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {CRON_SECRET}")
        response = self.client.get("/api/admin/maintenance/cleanup")
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "done")
        self.assertEqual(MaintenanceRun.objects.get().trigger, "cron")

    def test_a_wrong_secret_is_rejected_as_a_bad_token(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-the-secret")
        response = self.client.post("/api/admin/maintenance/cleanup")
        # 401 like every other bad bearer — the cron authenticator advertises
        # Bearer so DRF does not coerce this to 403.
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "token_invalid")

    def test_students_and_anonymous_callers_are_forbidden(self):
        authenticate(self.client, make_user())  # a student
        self.assertEqual(self.client.post("/api/admin/maintenance/cleanup").status_code, 403)
        body = APIClient().post("/api/admin/maintenance/cleanup", HTTP_ORIGIN=ALLOWED_ORIGIN).json()
        self.assertEqual(body["code"], "permission_denied")


class OnCommitDisciplineTests(ApiTestCase):
    """Phase 9 gate: counter writes and cache bumps never fire pre-commit."""

    def test_enroll_counts_immediately_but_bumps_the_catalog_only_on_commit(self):
        user = make_user()
        course = make_course()
        before = _version("catalog")
        with self.captureOnCommitCallbacks() as callbacks:  # collected, not executed
            courses_services.enroll(user, course)
        course.refresh_from_db()
        self.assertEqual(course.enrolled_count, 1)  # the F() update is in-transaction...
        self.assertEqual(_version("catalog"), before)  # ...but the bump waits for commit
        for callback in callbacks:
            callback()
        self.assertEqual(_version("catalog"), before + 1)

    def test_a_re_enroll_neither_recounts_nor_rebumps(self):
        user = make_user()
        course = make_course()
        with self.captureOnCommitCallbacks(execute=True):
            courses_services.enroll(user, course)
            courses_services.enroll(user, course)
        course.refresh_from_db()
        self.assertEqual(course.enrolled_count, 1)
