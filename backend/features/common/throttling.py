"""Throttling scopes and the login lockout — the abuse surface in one module.

A rate is what a scope allows per source IP; the scope is tagged onto a view
with `scoped_throttle`, and DRF's ScopedRateThrottle (wired globally in
settings) enforces it from the shared cache. The lockout is the auth-failure
backoff: distinct from request throttling, counted from REJECTED audit events
in the database so it survives restarts and worker churn.
"""

from __future__ import annotations

# Named rates — the one place that says how fast each surface may be hit.
AUTH_BURST_RATE = "10/min"  # login + refresh token exchanges
CATALOG_RATE = "120/min"  # the SPA's catalog browsing
VIDEO_TOKEN_RATE = "60/min"  # playback grant minting
ADMIN_BURST_RATE = "60/min"  # the admin console

SCOPED_RATES: dict[str, str] = {
    "auth_burst": AUTH_BURST_RATE,
    "catalog": CATALOG_RATE,
    "video_token": VIDEO_TOKEN_RATE,
    "admin_burst": ADMIN_BURST_RATE,
}


def scoped_throttle(scope: str):
    """Tag a function-based view with a throttle scope.

    Sits BELOW `@api_view`: the decorator copies `throttle_scope` off the
    wrapped function onto the wrapping APIView, which is what the scoped
    throttle reads.
    """

    def decorator(view):
        view.throttle_scope = scope
        return view

    return decorator


# Login lockout: past this many rejected sign-ins from one email/IP inside the
# window, the login endpoint answers 429 + Retry-After until the newest reject
# leaves the window. Waiting clears it; a retry storm cannot extend it (the
# 429 path records no new events).
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW_SECONDS = 900  # 15 minutes
