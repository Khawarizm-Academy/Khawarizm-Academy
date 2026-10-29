"""SQLite backend variant: clone-safe, forkserver-safe parallel tests.

Same engine as `django.db.backends.sqlite3` with two behaviors for the test
runner:

- `clone_test_db` checkpoints the WAL into the main file before the copy. The
  parallel runner spins up each worker by `shutil.copy`ing the database
  file; under `journal_mode=WAL` (config/settings.py — the upload worker's
  threads need it) the parent's just-run migrations can still sit in the
  `-wal` sidecar, and a clone then starts life without its tables.
- `setup_worker_connection` always hands a worker its cloned FILE. Python
  3.14 made `forkserver` the multiprocessing default, and on that path
  Django builds each worker a **shared-cache in-memory** database — where a
  poll-loop read takes a table lock the upload worker's thread cannot wait
  out (SQLITE_LOCKED is never retried by the busy timeout: "database table
  is locked"). A cloned file with WAL + busy_timeout provides the same
  per-worker isolation without that trap.

The engine is opt-in per database (`ENGINE = "config.sqlite_backend"`);
outside these two hooks it is byte-for-byte the built-in behavior.
"""

from __future__ import annotations

from django.db.backends.sqlite3 import base as sqlite_base
from django.db.backends.sqlite3.creation import DatabaseCreation


class WALCheckpointCreation(DatabaseCreation):
    def clone_test_db(self, *args, **kwargs):
        self.connection.ensure_connection()
        with self.connection.cursor() as cursor:
            # TRUNCATE also empties the sidecar, so repeated clones stay exact.
            cursor.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        super().clone_test_db(*args, **kwargs)

    def setup_worker_connection(self, _worker_id):
        # The fork/spawn-style handover: point the worker at its clone file
        # and let it reconnect. Skips the shared-cache in-memory database the
        # forkserver path would otherwise build (see the module docstring).
        settings_dict = self.get_test_db_clone_settings(_worker_id)
        self.connection.settings_dict.update(settings_dict)
        self.connection.close()


class DatabaseWrapper(sqlite_base.DatabaseWrapper):
    creation_class = WALCheckpointCreation
