"""SQLite backend variant: clone-safe WAL test databases.

Same engine as `django.db.backends.sqlite3` except the test-DB clone
checkpoints the WAL into the main file first. The parallel runner spins up
each worker by `shutil.copy`ing the database file while the parent's
just-run migrations may still sit in the `-wal` sidecar — a clone then
starts life without its tables ("no such table" in random workers).

The engine stays opt-in per database (`ENGINE = "config.sqlite_backend"`);
outside `clone_test_db` it is byte-for-byte the built-in behavior.
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


class DatabaseWrapper(sqlite_base.DatabaseWrapper):
    creation_class = WALCheckpointCreation
