"""Small unauthenticated endpoints for humans and uptime checks.

`/healthz` answers for the process alone (no DB); `/readyz` adds the
database check plus the two "a fresh boot with a hole here is a misconfig"
gates Phase 13 §13.4 asks for: the default `student` / `admin` roles and the
Telegram spool directory when that provider is enabled.
"""

from __future__ import annotations

import logging
from pathlib import Path

from django.conf import settings
from django.db import connection
from django.http import HttpRequest, JsonResponse

logger = logging.getLogger(__name__)


def root(request: HttpRequest) -> JsonResponse:
    """Say what this host is; the SPA talks to /api/ and data lives at /admin/."""
    return JsonResponse({"service": "Khawarizm Academy API", "status": "ok", "api": "/api/"})


def healthz(request: HttpRequest) -> JsonResponse:
    """Liveness: the process is up. No dependencies are touched."""
    return JsonResponse({"status": "ok"})


def _database_up() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        logger.exception("readyz: database unreachable")
        return False
    return True


def _default_roles_present() -> bool:
    """A missing student/admin role is a boot-blocking misconfiguration.

    The `access` seed migration installs them idempotently; if a fresh clone
    skipped migrations (or someone DELETEd a system row), every subsequent
    permission check silently denies. The plan calls this out explicitly, so
    readiness reports it.
    """

    try:
        from features.access.models import AccessRole

        return AccessRole.objects.filter(slug__in=("student", "admin")).count() >= 2
    except Exception:
        # The table is missing entirely - migrations have not run.
        logger.exception("readyz: default role rows are unreadable")
        return False


def _spool_dir_ok() -> bool | None:
    """`None` when the check does not apply; otherwise True/False."""

    spool = getattr(settings, "VIDEO_SPOOL_DIR", "") or ""
    telegram_enabled = getattr(settings, "TELEGRAM_ENABLED", False)
    if not (spool or telegram_enabled):
        return None
    if not spool:
        return False
    path = Path(spool)
    return path.is_dir() and path.exists()


def readyz(request: HttpRequest) -> JsonResponse:
    """Readiness: DB + default roles + (when applicable) the video spool dir."""

    checks = {
        "database": "up" if _database_up() else "down",
        "defaultRoles": "ok" if _default_roles_present() else "missing",
    }
    spool = _spool_dir_ok()
    if spool is not None:
        checks["spoolDir"] = "ok" if spool else "missing"
    ok = all(v in {"up", "ok"} for v in checks.values())
    return JsonResponse({"status": "ok" if ok else "unavailable", **checks}, status=200 if ok else 503)
