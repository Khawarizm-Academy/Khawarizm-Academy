"""Tests for the settings helpers that choose the database location."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from django.test import RequestFactory, SimpleTestCase, override_settings

from config.middleware import ApiOriginRestrictionMiddleware, _is_allowed_origin, _origin_of
from config.settings import resolve_sqlite_path
from config.views import root


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
