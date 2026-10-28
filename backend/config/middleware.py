"""Custom middleware: request id, per-request metrics, origin restriction."""

from __future__ import annotations

import logging
import re
import time
import uuid
from urllib.parse import urlsplit

from django.conf import settings
from django.db import connection
from django.http import HttpRequest, HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin

from config.logging import (
    MANY_QUERIES,
    SLOW_DB_SECONDS,
    QueryCounter,
    reset_request_id,
    reset_user_id,
    set_request_id,
    set_user_id,
)

REQUEST_ID_HEADER = "X-Request-ID"
# Inbound ids are echoed as-is (one line, printable); anything else is minted.
_REQUEST_ID_RE = re.compile(r"^[a-zA-Z0-9\-]{8,64}$")

logger = logging.getLogger("config.request")


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

    # A top-level Google OAuth redirect carries no Origin or Referer; its CSRF
    # protection is the single-use `state` in the query, not the origin gate.
    # The maintenance endpoint: platform crons (Vercel) send no Origin either —
    # they authenticate with the cron secret instead. /healthz and /readyz sit
    # outside /api/ anyway; listing them here keeps the uptime surface
    # explicit if they ever move under it.
    EXEMPT_PATHS = (
        "/api/admin/video-drive/oauth/callback",
        "/api/admin/maintenance/cleanup",
        "/healthz",
        "/readyz",
    )

    def process_request(self, request: HttpRequest):
        if request.path.startswith("/api/"):
            if request.path in self.EXEMPT_PATHS:
                return None
            origin = request.META.get("HTTP_ORIGIN") or request.META.get("HTTP_REFERER")
            if not _is_allowed_origin(origin):
                return HttpResponseForbidden("Forbidden: direct access to API is not allowed")
        return None


class RequestIDMiddleware(MiddlewareMixin):
    """Accept an inbound request id or mint one; every log line and the
    response header carry it, so a support ticket pins one request."""

    def process_request(self, request: HttpRequest):
        inbound = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = inbound if _REQUEST_ID_RE.fullmatch(inbound) else uuid.uuid4().hex
        request.request_id = request_id
        self._token = set_request_id(request_id)

    def process_response(self, request: HttpRequest, response):
        response[REQUEST_ID_HEADER] = getattr(request, "request_id", "")
        reset_request_id(self._token)
        return response


class RequestMetricsMiddleware:
    """One INFO line per request: status, duration, query count, DB time.

    The query counter wraps the whole inner stack (view + DB), and escalates
    to WARNING above the thresholds in config.logging — the N+1 tripwire that
    makes query health visible before the users feel it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        start = time.perf_counter()
        counter = QueryCounter()
        with connection.execute_wrapper(counter):
            response = self.get_response(request)

        user = getattr(request, "user", None)
        # The user id joins the log line (DRF propagates it onto the raw
        # request during authentication) — then leaves the context, because
        # contextvars survive the request in a thread pool.
        user_token = set_user_id(str(user.email) if getattr(user, "is_authenticated", False) else "")
        try:
            extra = {
                "path": request.path,
                "status": getattr(response, "status_code", 0),
                "duration_ms": round((time.perf_counter() - start) * 1000, 1),
                "db_ms": round(counter.db_seconds * 1000, 1),
                "queries": counter.queries,
            }
            # Escalate the line — same fields, WARNING level — so a slow or
            # chatty request is greppable without a log pipeline.
            if counter.queries > MANY_QUERIES or counter.db_seconds > SLOW_DB_SECONDS:
                logger.warning("request", extra=extra)
            else:
                logger.info("request", extra=extra)
        finally:
            reset_user_id(user_token)
        return response


# The browser-facing hardening headers, kept literal: they are the boring
# defaults from the security checklist, reviewed with the site, not per-env
# tuning knobs.
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
# Trial run for the admin surface only — report-only, so promoting it to a
# real CSP cannot break the admin's inline scripts/styles on day one. The
# phase that enforces it owns the inline cleanup first.
ADMIN_CSP_REPORT_ONLY = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; frame-ancestors 'none'"
)


class HardeningHeadersMiddleware(MiddlewareMixin):
    """Permissions-Policy on every response; a report-only CSP on /admin/."""

    def process_response(self, request, response):
        response.headers.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        if request.path.startswith("/admin/"):
            response.headers.setdefault("Content-Security-Policy-Report-Only", ADMIN_CSP_REPORT_ONLY)
        return response


# Response prefixes that are per-user or privileged: neither the browser nor
# any shared cache may keep them (cache-strategy §2). Public read endpoints
# get their caching headers per view instead (features/common/http_cache.py).
PRIVATE_CACHE_PREFIXES = (
    "/api/dashboard/",
    "/api/auth/me",
    "/api/auth/sessions",
    "/api/admin/",
    "/api/videos",
    "/api/stream",
)


class PrivateCacheMiddleware(MiddlewareMixin):
    """`Cache-Control: private, no-store` on every per-user/privileged route."""

    def process_response(self, request, response):
        if request.path.startswith(PRIVATE_CACHE_PREFIXES):
            response.headers.setdefault("Cache-Control", "private, no-store")
        return response
