"""Custom middleware to restrict direct browser access to the API."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin


def _is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return False
    for allowed in settings.CORS_ALLOWED_ORIGINS:
        if origin == allowed:
            return True
    if hasattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES") and settings.CORS_ALLOWED_ORIGIN_REGEXES:
        import re

        for pattern in settings.CORS_ALLOWED_ORIGIN_REGEXES:
            if re.match(pattern, origin):
                return True
    return False


class ApiOriginRestrictionMiddleware(MiddlewareMixin):
    """Return 403 if a request to /api/ comes without an allowed origin/referer."""

    def process_request(self, request: HttpRequest):
        if request.path.startswith("/api/"):
            origin = request.META.get("HTTP_ORIGIN") or request.META.get("HTTP_REFERER")
            if not _is_allowed_origin(origin):
                return HttpResponseForbidden("Forbidden: direct access to API is not allowed")
        return None
