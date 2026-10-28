"""Tests for the settings helpers that choose the database location, the
request-id + metrics middleware, and the liveness/readiness endpoints."""

from __future__ import annotations

import importlib
import json
import logging
import tempfile
import uuid
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.urls import resolve
from rest_framework.test import APIClient

from config.logging import JsonConsoleFormatter, RequestContextFilter, reset_request_id, set_request_id
from config.middleware import (
    ApiOriginRestrictionMiddleware,
    HardeningHeadersMiddleware,
    RequestIDMiddleware,
    RequestMetricsMiddleware,
    _is_allowed_origin,
    _origin_of,
)
from config.settings import resolve_sqlite_path
from config.views import healthz, readyz, root
from features.common.testing import ALLOWED_ORIGIN


class ResolveSqlitePathTests(SimpleTestCase):
    """SQLite stays in place off serverless, but moves to /tmp inside a read-only bundle."""

    def test_uses_the_project_file_off_serverless(self):
        self.assertEqual(
            resolve_sqlite_path(Path("/srv/app"), serverless=False),
            Path("/srv/app/db.sqlite3"),
        )

    def test_copies_the_bundled_file_into_tmp_for_a_serverless_runtime(self):
        with tempfile.TemporaryDirectory() as bundle_dir, tempfile.TemporaryDirectory() as runtime_dir:
            bundled = Path(bundle_dir) / "db.sqlite3"
            bundled.write_bytes(b"sqlite-bytes")

            resolved = resolve_sqlite_path(Path(bundle_dir), serverless=True, runtime_dir=Path(runtime_dir))

            self.assertEqual(resolved, Path(runtime_dir) / "db.sqlite3")
            self.assertEqual(resolved.read_bytes(), b"sqlite-bytes")

    def test_missing_bundle_yields_the_runtime_path_without_copying(self):
        with tempfile.TemporaryDirectory() as bundle_dir, tempfile.TemporaryDirectory() as runtime_dir:
            resolved = resolve_sqlite_path(Path(bundle_dir), serverless=True, runtime_dir=Path(runtime_dir))

            self.assertEqual(resolved, Path(runtime_dir) / "db.sqlite3")
            self.assertFalse(resolved.exists())

    def test_override_wins_everywhere(self):
        self.assertEqual(
            resolve_sqlite_path(Path("/srv/app"), serverless=True, override="/data/db.sqlite3"),
            Path("/data/db.sqlite3"),
        )


ALLOWED = {
    "CORS_ALLOWED_ORIGINS": ["https://khawarizmacademy.vercel.app"],
    "CORS_ALLOWED_ORIGIN_REGEXES": [r"^https://[a-z0-9.-]+\.vercel\.app$"],
}


class OriginNormalizationTests(SimpleTestCase):
    """A Referer carries a full URL; only its scheme://host matters."""

    def test_reduces_a_referer_url_to_its_origin(self):
        self.assertEqual(_origin_of("https://app.vercel.app/courses?x=1"), "https://app.vercel.app")

    def test_keeps_a_bare_origin_untouched(self):
        self.assertEqual(_origin_of("https://app.vercel.app"), "https://app.vercel.app")

    def test_missing_value_is_none(self):
        self.assertIsNone(_origin_of(None))


@override_settings(**ALLOWED)
class AllowedOriginTests(SimpleTestCase):
    def test_accepts_an_explicit_origin(self):
        self.assertTrue(_is_allowed_origin("https://khawarizmacademy.vercel.app"))

    def test_accepts_a_preview_origin_by_regex(self):
        self.assertTrue(_is_allowed_origin("https://khawarizm-academy-kpgm1h8cf-ahmed-albahrawys-projects.vercel.app"))

    def test_accepts_a_referer_that_carries_a_path(self):
        self.assertTrue(_is_allowed_origin("https://khawarizm-academy-kpgm1h8cf-ahmed-albahrawys-projects.vercel.app/"))

    def test_rejects_an_unrelated_origin(self):
        self.assertFalse(_is_allowed_origin("https://evil.example.com/"))


@override_settings(**ALLOWED)
class ApiOriginRestrictionTests(SimpleTestCase):
    def _middleware(self):
        return ApiOriginRestrictionMiddleware(get_response=lambda request: None)

    def test_allows_a_preview_referer_with_a_path(self):
        request = RequestFactory().get(
            "/api/auth/config",
            HTTP_REFERER="https://khawarizm-academy-kpgm1h8cf-ahmed-albahrawys-projects.vercel.app/",
        )
        self.assertIsNone(self._middleware().process_request(request))

    def test_blocks_a_request_without_origin_or_referer(self):
        request = RequestFactory().get("/api/auth/config")
        response = self._middleware().process_request(request)
        self.assertEqual(response.status_code, 403)

    def test_ignores_non_api_paths(self):
        request = RequestFactory().get("/admin/")
        self.assertIsNone(self._middleware().process_request(request))


class RootViewTests(SimpleTestCase):
    def test_root_reports_the_service(self):
        response = root(RequestFactory().get("/"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)["status"], "ok")


class HealthzTests(SimpleTestCase):
    def test_healthz_reports_liveness_without_touching_the_db(self):
        response = healthz(RequestFactory().get("/healthz"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), {"status": "ok"})


class ReadyzTests(TestCase):
    def test_readyz_reports_the_database_up(self):
        response = readyz(RequestFactory().get("/readyz"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)["database"], "up")

    def test_readyz_returns_503_when_the_database_is_down(self):
        with mock.patch("config.views.connection.cursor", side_effect=OSError("db down")):
            response = readyz(RequestFactory().get("/readyz"))
        self.assertEqual(response.status_code, 503)
        self.assertEqual(json.loads(response.content)["database"], "down")


class RequestIdTests(SimpleTestCase):
    def _response(self, request):
        return RequestIDMiddleware(lambda request: JsonResponse({}))(request)

    def test_an_inbound_request_id_is_echoed_back(self):
        response = self._response(RequestFactory().get("/", HTTP_X_REQUEST_ID="abc-123-def"))
        self.assertEqual(response["X-Request-ID"], "abc-123-def")

    def test_without_one_a_request_id_is_minted(self):
        response = self._response(RequestFactory().get("/"))
        self.assertTrue(uuid.UUID(response["X-Request-ID"]))

    def test_a_hostile_inbound_value_is_replaced(self):
        response = self._response(RequestFactory().get("/", HTTP_X_REQUEST_ID="../../etc/passwd"))
        self.assertTrue(uuid.UUID(response["X-Request-ID"]))


class RequestMetricsTests(SimpleTestCase):
    def _logged(self, middleware_request):
        middleware = RequestMetricsMiddleware(lambda request: JsonResponse({}, status=200))
        with self.assertLogs("config.request", level="INFO") as captured:
            middleware(middleware_request)
        return captured

    def _lines(self, captured):
        formatter = JsonConsoleFormatter()
        return [json.loads(formatter.format(record)) for record in captured.records]

    def test_every_request_logs_one_json_line_with_the_request_fields(self):
        lines = self._lines(self._logged(RequestFactory().get("/api/catalog")))
        self.assertEqual(len(lines), 1)
        line = lines[0]
        self.assertEqual(line["level"], "info")
        self.assertEqual(line["msg"], "request")
        self.assertEqual(line["path"], "/api/catalog")
        self.assertEqual(line["status"], 200)
        self.assertIn("duration_ms", line)
        self.assertIn("queries", line)
        self.assertIn("db_ms", line)

    def test_a_chatty_request_escalates_to_warning(self):
        chatty = mock.MagicMock(queries=100, db_seconds=0.0)
        with mock.patch("config.middleware.QueryCounter", return_value=chatty):
            middleware = RequestMetricsMiddleware(lambda request: JsonResponse({}))
            with self.assertLogs("config.request", level="WARNING") as captured:
                middleware(RequestFactory().get("/api/dashboard"))
        self.assertEqual(self._lines(captured)[0]["level"], "warning")

    def test_the_user_id_leaves_the_context_after_the_request(self):
        middleware = RequestMetricsMiddleware(lambda request: JsonResponse({}))
        with self.assertLogs("config.request", level="INFO"):
            middleware(RequestFactory().get("/"))
        # A second capture must not inherit the previous request's user id.
        with self.assertLogs("config.request", level="INFO") as captured:
            middleware(RequestFactory().get("/"))
        self.assertNotIn("user_id", self._lines(captured)[0])


class RequestContextTests(SimpleTestCase):
    def test_the_filter_attaches_the_current_request_id(self):
        record = logging.LogRecord("test", logging.INFO, __file__, 1, "hello", (), None)
        token = set_request_id("req-42")
        try:
            self.assertTrue(RequestContextFilter().filter(record))
        finally:
            reset_request_id(token)
        self.assertEqual(record.request_id, "req-42")

    def test_the_formatter_emits_one_json_line(self):
        formatter = JsonConsoleFormatter()
        record = logging.LogRecord("test", logging.INFO, __file__, 1, "hello", (), None)
        record.request_id = "req-42"
        record.user_id = ""
        line = json.loads(formatter.format(record))
        self.assertEqual(line["msg"], "hello")
        self.assertEqual(line["request_id"], "req-42")
        self.assertNotIn("user_id", line)  # empty context stays out of the line


class HardeningHeaderTests(SimpleTestCase):
    def _response(self, path="/api/catalog"):
        middleware = HardeningHeadersMiddleware(lambda request: JsonResponse({}))
        return middleware(RequestFactory().get(path))

    def test_every_response_carries_the_permissions_policy(self):
        self.assertIn("camera=()", self._response().headers["Permissions-Policy"])

    def test_the_admin_gets_a_report_only_csp(self):
        response = self._response("/admin/")
        self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy-Report-Only"])

    def test_the_api_stays_out_of_the_admin_csp(self):
        self.assertNotIn("Content-Security-Policy-Report-Only", self._response())

    def test_existing_headers_are_never_overwritten(self):
        middleware = HardeningHeadersMiddleware(lambda request: JsonResponse({}, headers={"Permissions-Policy": "own"}))
        response = middleware(RequestFactory().get("/"))
        self.assertEqual(response.headers["Permissions-Policy"], "own")


class DevProfileSafetyTests(SimpleTestCase):
    """The committed dev profile must stay plain-HTTP friendly — no redirect, no secure cookies."""

    def test_the_development_profile_never_gates_http(self):
        self.assertFalse(settings.SECURE_SSL_REDIRECT)
        self.assertEqual(settings.SECURE_HSTS_SECONDS, 0)
        self.assertFalse(settings.SESSION_COOKIE_SECURE)
        self.assertFalse(settings.CSRF_COOKIE_SECURE)

    def test_the_browser_hardening_defaults_are_always_on(self):
        self.assertEqual(settings.SECURE_REFERRER_POLICY, "strict-origin-when-cross-origin")
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)


class PrivateCacheMiddlewareTests(SimpleTestCase):
    def _response(self, path):
        from config.middleware import PrivateCacheMiddleware

        middleware = PrivateCacheMiddleware(lambda request: JsonResponse({}))
        return middleware(RequestFactory().get(path))

    def test_per_user_and_privileged_routes_are_no_store(self):
        for path in (
            "/api/dashboard/summary",
            "/api/auth/me",
            "/api/auth/sessions",
            "/api/admin/overview",
            "/api/videos/clip-1/token",
            "/api/stream/clip-1/index.m3u8",
        ):
            with self.subTest(path=path):
                self.assertEqual(self._response(path).headers["Cache-Control"], "private, no-store")

    def test_public_routes_are_left_to_their_views(self):
        self.assertNotIn("Cache-Control", self._response("/api/catalog"))
        self.assertNotIn("Cache-Control", self._response("/api/auth/refresh"))


class SchemaEndpointTests(TestCase):
    """`/api/schema` renders the contract; the docs page wraps it; both are read-only."""

    def setUp(self) -> None:
        self.client = APIClient()

    def test_the_schema_answers_yaml_without_an_origin(self):
        response = self.client.get("/api/schema")
        self.assertEqual(response.status_code, 200)
        self.assertIn("application/vnd.oai.openapi", response.headers["Content-Type"])
        self.assertIn("operationId: catalog_list", response.content.decode())

    def test_the_swagger_page_answers_html(self):
        response = self.client.get("/api/schema/docs")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["Content-Type"])

    def test_every_documented_operation_lists_the_error_envelope(self):
        # The spec itself: the shared Error component exists and every
        # operation's 400/401/403/404/429 rows reference it (spot-check).
        text = self.client.get("/api/schema").content.decode()
        self.assertIn("Error:", text)
        for status_code in ("'400'", "'401'", "'403'", "'404'", "'429'"):
            self.assertIn(f"{status_code}:", text)


class OriginGateStillEnforcedTests(TestCase):
    """The schema exemptions are exactly that — the rest of /api/ stays gated."""

    def test_a_no_origin_request_to_a_real_endpoint_is_still_403(self):
        self.assertEqual(APIClient().get("/api/catalog").status_code, 403)

    def test_an_allowed_origin_still_passes(self):
        self.assertEqual(APIClient().get("/api/catalog", HTTP_ORIGIN=ALLOWED_ORIGIN).status_code, 200)


# (urls module, a sample path under /api/, the url_name it must resolve to).
MOUNTED = [
    ("config.urls", "/api/schema", "schema"),
    ("config.urls", "/api/schema/docs", "schema-docs"),
    ("features.auth.urls", "/api/auth/config", "auth-config"),
    ("features.catalog.urls", "/api/catalog", "catalog-list"),
    ("features.catalog.urls", "/api/catalog/filters", "catalog-filters"),
    ("features.courses.urls", "/api/problems", "problems-list"),
    ("features.courses.urls", "/api/courses/any-slug", "course-detail"),
    ("features.scholarships.urls", "/api/scholarships/any-slug", "scholarship-detail"),
    ("features.dashboard.urls", "/api/dashboard", "dashboard-summary"),
    ("features.dashboard.urls", "/api/dashboard/enrolled", "dashboard-enrolled"),
    ("features.home.urls", "/api/home", "home"),
    ("features.events.urls", "/api/events", "events-list"),
    ("features.competitions.urls", "/api/competitions", "competitions-list"),
    ("features.profile.urls", "/api/profile", "profile"),
    ("features.adminconsole.urls", "/api/admin/overview", "admin-overview"),
    ("features.adminconsole.urls", "/api/admin/maintenance/cleanup", "admin-maintenance-cleanup"),
    ("features.videohosting.urls", "/api/videos/providers", "videohosting-providers"),
    ("features.videohosting.urls", "/api/videos/any-slug", "videohosting-meta"),
    (
        "features.videohosting.console.urls",
        "/api/admin/video-assets/upload",
        "admin-video-asset-upload",
    ),
]

# Every urls module whose sibling ordering the shadow check walks.
URLCONF_MODULES = [
    "config.urls",
    "features.auth.urls",
    "features.catalog.urls",
    "features.courses.urls",
    "features.scholarships.urls",
    "features.dashboard.urls",
    "features.home.urls",
    "features.events.urls",
    "features.competitions.urls",
    "features.profile.urls",
    "features.adminconsole.urls",
    "features.videohosting.urls",
    "features.videohosting.console.urls",
]


class MountedRoutesTests(TestCase):
    """Every feature route is mounted where the frontend expects it."""

    def test_every_pinned_path_resolves_to_its_url_name(self):
        for module, sample_path, url_name in MOUNTED:
            with self.subTest(module=module, path=sample_path):
                self.assertEqual(resolve(sample_path).url_name, url_name)


class StaticBeforeParameterizedTests(TestCase):
    """A static sibling must never be shadowed by an earlier parameterized one.

    The regression this mechanizes: `videos/<slug:slug>` before
    `videos/providers` turned the providers list into meta's 404.
    """

    def test_no_earlier_parameterized_pattern_matches_any_static_path(self):
        for module_name in URLCONF_MODULES:
            with self.subTest(urlconf=module_name):
                patterns = importlib.import_module(module_name).urlpatterns
                parameterized = [(i, p) for i, p in enumerate(patterns) if "<" in str(p.pattern)]
                for j, static_pattern in enumerate(patterns):
                    route = str(static_pattern.pattern)
                    if "<" in route:
                        continue
                    for i, earlier in parameterized:
                        if i >= j:
                            break
                        with self.subTest(module=module_name, static=route, shadowed_by=str(earlier.pattern)):
                            self.assertFalse(
                                earlier.pattern.regex.fullmatch(route),
                                f"`{route}` is shadowed by the earlier `{earlier.pattern}` "
                                f"— static paths must be declared first ({module_name}).",
                            )
