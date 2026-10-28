"""The periodic cleanup job: what it deletes, how it chunks, how it guards overlap.

Every row family here accumulates dead weight forever unless swept: expired
playback grants (already dropped on first miss — this is the safety sweep for
tokens never replayed), abandoned resumable-upload sessions, spent OAuth
states, and the auth audit trail past its retention window.

Design (background-jobs §3, §7): the job is **idempotent** — deleting an
already-deleted row deletes nothing, so re-runs and overlaps converge on the
same end state; it deletes in **chunks of 500 with one transaction per
chunk**, so a big backlog never holds one long transaction; and an overlap
guard (the newest still-`running` `MaintenanceRun`) makes a second concurrent
run exit with `skipped` instead of doubling the work. A crashed run's marker
stops blocking after `RUNNING_GRACE_MINUTES`, so a wedged job can't wedge the
schedule forever.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from features.common.choices import MaintenanceRunStatus
from features.common.models import MaintenanceRun

CHUNK_SIZE = 500
UPLOAD_SESSION_RETENTION_DAYS = 7
RUNNING_GRACE_MINUTES = 60


def expired_families(now: Any) -> dict[str, Any]:
    """The dead-weight querysets, keyed by the name the status body reports.

    Model imports stay inside the function: `common` is the lowest layer and
    must not import feature apps at module load (features import *it*).
    """
    from features.auth.models import AuthEvent
    from features.videohosting.models import DriveAuthState, StreamToken, UploadSession

    return {
        "streamTokens": StreamToken.objects.filter(expires_at__lte=now),
        "uploadSessions": UploadSession.objects.filter(
            updated_at__lt=now - timedelta(days=UPLOAD_SESSION_RETENTION_DAYS)
        ).exclude(status="done"),
        "driveAuthStates": DriveAuthState.objects.filter(expires_at__lte=now),
        "authEvents": AuthEvent.objects.filter(created_at__lt=now - timedelta(days=settings.AUTH_EVENT_RETENTION_DAYS)),
    }


def _delete_chunked(queryset: Any) -> int:
    """Delete in chunks of 500, one transaction per chunk; return the count."""
    total = 0
    while True:
        with transaction.atomic():
            pks = list(queryset.values_list("pk", flat=True)[:CHUNK_SIZE])
            if not pks:
                return total
            total += queryset.filter(pk__in=pks).delete()[0]
    # unreachable — the empty chunk returns


def run_cleanup(trigger: str) -> dict[str, Any]:
    """One guarded cleanup execution; the status body the command/endpoint share.

    Returns `{"id", "status": "skipped"}` when another run is still alive
    (the caller must exit 0 — overlapping crons are normal, not errors), or
    `{"id", "status": "done", "deleted": {...}}` after a completed run.
    """
    now = timezone.now()
    running = (
        MaintenanceRun.objects.filter(
            status=MaintenanceRunStatus.RUNNING,
            started_at__gte=now - timedelta(minutes=RUNNING_GRACE_MINUTES),
        )
        .order_by("-started_at")
        .first()
    )
    if running is not None:
        return {"id": str(running.id), "status": "skipped"}

    run = MaintenanceRun.objects.create(trigger=trigger, started_at=now)
    try:
        deleted = {name: _delete_chunked(qs) for name, qs in expired_families(now).items()}
    except Exception as exc:
        run.status = MaintenanceRunStatus.ERROR
        run.error = str(exc)[:500]
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error", "finished_at"])
        raise
    run.status = MaintenanceRunStatus.DONE
    run.deleted = deleted
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "deleted", "finished_at"])
    return {"id": str(run.id), "status": "done", "deleted": deleted}
