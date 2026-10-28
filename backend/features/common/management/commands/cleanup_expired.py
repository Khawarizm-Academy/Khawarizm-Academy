"""Delete the dead-weight rows the runtime never revisits — `cleanup_expired`.

Sweeps expired `StreamToken`s (the on-miss delete only fires when a client
replays a dead token; this reaches the rest), `UploadSession`s stale past 7
days, expired `DriveAuthState`s, and `AuthEvent`s past
`AUTH_EVENT_RETENTION_DAYS` (env, default 180).

Self-hosted: cron every 6h —
    0 */6 * * *  cd /path/to/backend && .venv/bin/python manage.py cleanup_expired
Vercel: `backend/vercel.json` schedules `GET /api/admin/maintenance/cleanup`
every 6h; Vercel attaches `Authorization: Bearer $CRON_SECRET`, which the
endpoint verifies against `MAINTENANCE_CRON_SECRET`.

Safe to run twice (idempotent deletes, chunks of 500, one transaction per
chunk); a second concurrent run exits 0 with "skipped, still running" — the
overlap marker is the newest still-running `MaintenanceRun` row.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from features.common.maintenance import run_cleanup


class Command(BaseCommand):
    help = (
        "Delete expired playback tokens, stale upload sessions, expired Drive states, and past-retention auth events."
    )

    def handle(self, *args, **options) -> None:
        result = run_cleanup(trigger="command")
        if result["status"] == "skipped":
            # Exit 0: an overlap is the guard working, not a failure.
            self.stdout.write("skipped, still running")
            return
        for family, count in result["deleted"].items():
            self.stdout.write(f"{family}: {count}")
        self.stdout.write(self.style.SUCCESS("cleanup done"))
