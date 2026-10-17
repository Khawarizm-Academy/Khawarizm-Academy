"""Issues and reads the access/refresh tokens the API hands the SPA.

Access tokens are short-lived HS256 JWTs; refresh tokens are opaque random
strings stored hashed on the `UserSession` row so a leak is harmless.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone

ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30


def make_access_token(user, session) -> str:
    """A signed JWT carrying the user id, session id, and role."""
    now = timezone.now()
    payload = {
        "sub": str(user.pk),
        "sid": str(session.pk),
        "role": user.role,
        "typ": "access",
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Decode and verify an access token; raises `jwt.PyJWTError` on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def hash_refresh_token(raw: str) -> str:
    """The only form of a refresh token we persist."""
    return hashlib.sha256(raw.encode()).hexdigest()


def make_refresh_token() -> tuple[str, str]:
    """Return `(raw, hash)` — the raw value is sent to the client once."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_refresh_token(raw)


def refresh_expiry():
    """When a freshly issued refresh token should die."""
    return timezone.now() + timedelta(days=REFRESH_TOKEN_DAYS)
