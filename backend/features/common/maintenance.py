"""The periodic cleanup job: what it deletes, how it chunks, how it guards overlap.

Every row family here accumulates dead weight forever unless swept: expired
playback grants (already dropped on first miss — this is the safety sweep for
tokens never replayed), abandoned resumable-upload sessions (stale past
`VIDEO_UPLOAD_STALE_HOURS`) and their spool parts, spent OAuth states, the auth
audit trail past its retention window, and hidden reviews/threads past
`HIDDEN_CONTENT_RETENTION_DAYS` (Phase 13 §13.5).

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

import logging
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from features.common.choices import MaintenanceRunStatus
from features.common.models import MaintenanceRun
from features.common.observability import log_event

LOGGER = logging.getLogger(__name__)
CHUNK_SIZE = 500
UPLOAD_SESSION_RETENTION_DAYS = 7
RUNNING_GRACE_MINUTES = 60
# Phase 13 §13.5: hidden content (review/thread) is soft-delete; the plan asks
# that we retain the row for a fixed window so a moderator can change their
# mind, then hard-purge it. Longer than the abuse-review cycle (a week),
# shorter than a term.
HIDDEN_CONTENT_RETENTION_DAYS = 30


def expired_families(now: Any) -> dict[str, Any]:
    """The dead-weight querysets, keyed by the name the status body reports.

    Model imports stay inside the function: `common` is the lowest layer and
    must not import feature apps at module load (features import *it*).
    """
    from features.access.models import AuditEvent
    from features.auth.models import AuthEvent
    from features.videohosting.models import DriveAuthState, StreamToken, UploadSession

    # Phase 13 §13.5: stale resumables age out after VIDEO_UPLOAD_STALE_HOURS
    # (default 24) — the 7-day window was sized when a stuck row was rare.
    stale_uploads_hours = int(getattr(settings, "VIDEO_UPLOAD_STALE_HOURS", UPLOAD_SESSION_RETENTION_DAYS * 24))
    hidden_cutoff = timedelta(days=HIDDEN_CONTENT_RETENTION_DAYS)

    families: dict[str, Any] = {
        "streamTokens": StreamToken.objects.filter(expires_at__lte=now),
        "uploadSessions": UploadSession.objects.filter(
            updated_at__lt=now - timedelta(hours=stale_uploads_hours)
        ).exclude(status="done"),
        "driveAuthStates": DriveAuthState.objects.filter(expires_at__lte=now),
        "authEvents": AuthEvent.objects.filter(created_at__lt=now - timedelta(days=settings.AUTH_EVENT_RETENTION_DAYS)),
        "accessAuditEvents": AuditEvent.objects.filter(
            created_at__lt=now - timedelta(days=settings.AUDIT_RETENTION_DAYS)
        ),
    }

    # Optional feature families — the plan wants them counted when the tables
    # exist, and skipped cleanly during a partial migration or a stripped-down
    # test database. `try/except ImportError` keeps `common` the lowest layer.
    try:
        from features.reviews.models import CourseReview

        families["hiddenReviews"] = CourseReview.objects.filter(is_hidden=True, updated_at__lt=now - hidden_cutoff)
    except Exception:  # pragma: no cover - model missing on partial test DBs
        pass
    try:
        from features.discussions.models import DiscussionThread

        families["hiddenThreads"] = DiscussionThread.objects.filter(status="hidden", updated_at__lt=now - hidden_cutoff)
    except Exception:  # pragma: no cover
        pass

    return families


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
        # Keep common import-light; the owning quiz service performs grading.
        from features.courses.services import refresh_states
        from features.quizzes.services import expire_overdue

        deleted["quizAttemptsExpired"] = expire_overdue()
        deleted["liveSessionStatesRefreshed"] = refresh_states(now)
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
    # Phase 13 §13.4: one structured line per job with the per-family counts, so
    # a silent cron (the endpoint path logs nothing else) is still visible.
    log_event(
        LOGGER,
        "cleanup run finished",
        trigger=trigger,
        run=str(run.id),
        deleted=sum(deleted.values()),
        duration_ms=int((run.finished_at - run.started_at).total_seconds() * 1000),
    )
    return {"id": str(run.id), "status": "done", "deleted": deleted}
