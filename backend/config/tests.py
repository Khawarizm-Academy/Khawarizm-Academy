"""Tests for the settings helpers that choose the database location, the
request-id + metrics middleware, and the liveness/readiness endpoints."""

from __future__ import annotations

import json
import logging
import tempfile
import uuid
from pathlib import Path
from unittest import mock

from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings

from config.logging import JsonConsoleFormatter, RequestContextFilter, reset_request_id, set_request_id
from config.middleware import (
    ApiOriginRestrictionMiddleware,
    RequestIDMiddleware,
    RequestMetricsMiddleware,
    _is_allowed_origin,
    _origin_of,
)
from config.settings import resolve_sqlite_path
from config.views import healthz, readyz, root


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
