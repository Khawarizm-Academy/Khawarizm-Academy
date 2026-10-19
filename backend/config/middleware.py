"""Custom middleware to restrict direct browser access to the API."""

from __future__ import annotations

import re
from urllib.parse import urlsplit

from django.conf import settings
from django.http import HttpRequest, HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin


def _origin_of(value: str | None) -> str | None:
    """Reduce a request Origin or Referer to its bare scheme://host origin."""
    if not value:
        return None
    parts = urlsplit(value)
    if not parts.scheme or not parts.netloc:
        return value
    return f"{parts.scheme}://{parts.netloc}"


def _is_allowed_origin(value: str | None) -> bool:
    origin = _origin_of(value)
    if not origin:
        return False
    if origin in settings.CORS_ALLOWED_ORIGINS:
        return True
    regexes = getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", None) or []
    return any(re.match(pattern, origin) for pattern in regexes)


class ApiOriginRestrictionMiddleware(MiddlewareMixin):
    """Return 403 if a request to /api/ comes without an allowed origin/referer."""

    def process_request(self, request: HttpRequest):
        if request.path.startswith("/api/"):
            origin = request.META.get("HTTP_ORIGIN") or request.META.get("HTTP_REFERER")
            if not _is_allowed_origin(origin):
                return HttpResponseForbidden("Forbidden: direct access to API is not allowed")
        return None
