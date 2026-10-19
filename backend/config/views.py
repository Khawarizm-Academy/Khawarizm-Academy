"""Small unauthenticated endpoints for humans and uptime checks."""

from __future__ import annotations

from django.http import HttpRequest, JsonResponse


def root(request: HttpRequest) -> JsonResponse:
    """Say what this host is; the SPA talks to /api/ and data lives at /admin/."""
    return JsonResponse({"service": "Khawarizm Academy API", "status": "ok", "api": "/api/"})
