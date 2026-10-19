"""Tests for the settings helpers that choose the database location."""

from __future__ import annotations

import tempfile
from pathlib import Path

from django.test import SimpleTestCase

from config.settings import resolve_sqlite_path


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
