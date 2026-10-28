"""Small unauthenticated endpoints for humans and uptime checks.

`/healthz` answers for the process alone (no DB); `/readyz` adds the
database check so a restart loop can't be caused by a slow dependency
(be-observability §5).
"""

from __future__ import annotations

import logging

from django.db import connection
from django.http import HttpRequest, JsonResponse

logger = logging.getLogger(__name__)


def root(request: HttpRequest) -> JsonResponse:
    """Say what this host is; the SPA talks to /api/ and data lives at /admin/."""
    return JsonResponse({"service": "Khawarizm Academy API", "status": "ok", "api": "/api/"})


def healthz(request: HttpRequest) -> JsonResponse:
    """Liveness: the process is up. No dependencies are touched."""
    return JsonResponse({"status": "ok"})


def readyz(request: HttpRequest) -> JsonResponse:
    """Readiness: the database answers `SELECT 1`; 503 when it does not."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        logger.exception("readyz: database unreachable")
        return JsonResponse({"status": "unavailable", "database": "down"}, status=503)
    return JsonResponse({"status": "ok", "database": "up"})
