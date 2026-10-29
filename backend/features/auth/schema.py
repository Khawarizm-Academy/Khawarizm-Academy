"""Security schemes for the spec — one per custom authenticator.

Imported from `AuthConfig.ready()` so drf-spectacular can resolve both
authenticators on every view instead of warning "could not resolve".
Import side effect is the registration (drf-spectacular's extension hook).
"""

from __future__ import annotations

from drf_spectacular.openapi import OpenApiAuthenticationExtension


class SessionBearerScheme(OpenApiAuthenticationExtension):
    """The SPA's session bearer: `Authorization: Bearer <access>`."""

    target_class = "features.auth.authentication.AccessTokenAuthentication"
    name = "sessionAuth"

    def get_security_definition(self, auto_schema) -> dict:
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Session access token from POST /api/auth/login (one live session per device).",
        }


class CronSecretScheme(OpenApiAuthenticationExtension):
    """The platform cron's shared secret (maintenance endpoint only)."""

    target_class = "features.auth.authentication.CronSecretAuthentication"
    name = "cronAuth"

    def get_security_definition(self, auto_schema) -> dict:
        return {
            "type": "http",
            "scheme": "bearer",
            "description": "Vercel Cron's `$CRON_SECRET` — accepted only by /api/admin/maintenance/cleanup.",
        }
