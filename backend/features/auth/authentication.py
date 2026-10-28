"""DRF authentication: our HS256 access token plus the session it belongs to."""

from __future__ import annotations

import jwt
from django.utils import timezone
from rest_framework import authentication, exceptions

from features.auth.models import UserSession
from features.auth.tokens import decode_access_token
from features.common.choices import SessionRevokeReason
from features.common.messages import REASON_MESSAGES, SESSION_INVALID


class SessionAuthError(exceptions.AuthenticationFailed):
    """401 carrying a machine-readable `code` the SPA reacts to."""

    def __init__(self, code: str):
        super().__init__(REASON_MESSAGES.get(code, SESSION_INVALID))
        # The handler reads this instead of DRF's `not_authenticated` default.
        self.code = code


class AccessTokenAuthentication(authentication.BaseAuthentication):
    """Reads `Authorization: Bearer <access>` and resolves its live session."""

    keyword = "Bearer"

    def authenticate_header(self, request):
        """Advertise the scheme so DRF keeps 401 (not 403) on a failed token."""
        return self.keyword

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header or header[0].lower() != self.keyword.lower().encode():
            return None
        if len(header) != 2:
            raise SessionAuthError("token_invalid")
        try:
            payload = decode_access_token(header[1].decode())
        except jwt.ExpiredSignatureError as exc:
            raise SessionAuthError("token_expired") from exc
        except jwt.PyJWTError as exc:
            raise SessionAuthError("token_invalid") from exc
        if payload.get("typ") != "access":
            raise SessionAuthError("token_invalid")
        session = UserSession.objects.select_related("user").filter(pk=payload.get("sid")).first()
        if session is None:
            raise SessionAuthError("session_missing")
        if not session.is_active:
            raise SessionAuthError(session.revoked_reason or "session_missing")
        if session.expires_at and session.expires_at < timezone.now():
            session.revoke(SessionRevokeReason.EXPIRED)
            raise SessionAuthError("expired")
        if not session.user.is_active:
            raise SessionAuthError("revoked_by_admin")
        session.touch()
        return (session.user, session)
