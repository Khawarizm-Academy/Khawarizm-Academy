"""Auth endpoints: Firebase login, refresh, me, logout, and device sessions."""

from __future__ import annotations

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import exceptions
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from features.auth import firebase, services
from features.auth.authentication import SessionAuthError
from features.auth.device import client_ip
from features.auth.models import UserSession
from features.auth.serializers import session_payload, user_profile
from features.auth.tokens import hash_refresh_token
from features.common.choices import AuthEventKind, SessionRevokeReason
from features.common.errors import InvalidParameter, NotFound, error_payload
from features.common.http_cache import etag_response
from features.common.messages import (
    LOGIN_FAILED,
    LOGIN_FAILED_CLOCK,
    MISSING_ID_TOKEN,
    MISSING_REFRESH_TOKEN,
    SESSION_NOT_FOUND,
    login_locked,
)
from features.common.schemas import ErrorSerializer
from features.common.serializers import compact
from features.common.throttling import scoped_throttle

inline_login = inline_serializer("FirebaseLoginRequest", fields={"idToken": ser.CharField()})
inline_refresh = inline_serializer("RefreshRequest", fields={"refreshToken": ser.CharField()})


def login_failure_detail(error: Exception) -> str:
    """The one-line Arabic rejection reason; the clock story names its fix."""
    text = str(error).lower()
    if "too early" in text or "clock" in text or "used while invalid" in text:
        return LOGIN_FAILED_CLOCK
    return LOGIN_FAILED


@extend_schema(
    operation_id="auth_config",
    summary="Firebase client config, provider list, and the dev-auth flag.",
    description="Settings-derived and DB-free; short must-revalidate cache lifetime.",
    auth=None,
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{firebase: {apiKey, authDomain, projectId}, providers: [...], devAuth}`",
        ),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def auth_config(request):
    """Everything the SPA needs to initialize its Firebase client.

    Settings-derived and DB-free, so it carries a short must-revalidate
    cache lifetime instead of an app-cache entry.
    """
    payload = {
        # The web config `initializeApp()` takes; Auth needs exactly these three.
        "firebase": compact(
            apiKey=settings.FIREBASE_API_KEY,
            authDomain=settings.FIREBASE_AUTH_DOMAIN,
            projectId=settings.FIREBASE_PROJECT_ID,
        ),
        "providers": ["password", "google", "facebook"],
        "devAuth": settings.FIREBASE_ALLOW_DEV_TOKENS and not settings.FIREBASE_PROJECT_ID,
    }
    return etag_response(request, payload, max_age=15, s_maxage=60, swr=0, must_revalidate=True)


@extend_schema(
    operation_id="auth_login",
    summary="Exchange a Firebase ID token for the session's access/refresh pair.",
    description="Burst-throttled per IP. Failure modes: 400 `invalid_parameter`, 429 `login_locked` with "
    "`Retry-After`, 401 `login_failed` naming the clock fix when verification fails.",
    auth=None,
    request=inline_login,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{accessToken, refreshToken, user, session}`"),
        429: OpenApiResponse(response=ErrorSerializer, description="`login_locked` — the lockout backoff."),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
@scoped_throttle("auth_burst")
def firebase_login(request):
    """Exchange a Firebase ID token for our access/refresh pair."""
    id_token = (request.data or {}).get("idToken", "")
    if not id_token:
        raise InvalidParameter(MISSING_ID_TOKEN)
    # The lockout is the auth-failure backoff (REJECTED audit events); it sits
    # before verification, and the blocked path records nothing, so waiting
    # clears it instead of a retry storm extending it.
    wait = services.login_lockout_seconds(ip=client_ip(request))
    if wait:
        return Response(
            error_payload(login_locked(wait), "login_locked"),
            status=429,
            headers={"Retry-After": str(wait)},
        )
    try:
        identity = firebase.verify_id_token(id_token)
    except firebase.FirebaseError as exc:
        services.record_event(AuthEventKind.REJECTED, request=request, detail=str(exc)[:200])
        # The lags-behind-realtime dev clock (NTP-blocked networks) reads as a
        # mystery otherwise — name it.
        raise exceptions.AuthenticationFailed(login_failure_detail(exc), code="login_failed") from exc
    user = services.upsert_firebase_user(identity)
    session, access, refresh = services.open_session(user, request, identity.get("provider", ""))
    return Response(
        {
            "accessToken": access,
            "refreshToken": refresh,
            "user": user_profile(user),
            "session": session_payload(session, session.id),
        }
    )


@extend_schema(
    operation_id="auth_refresh",
    summary="Rotate a refresh token into a new access/refresh pair.",
    description="Rotation invalidates the presented refresh token; dead ones are 401 `session_invalid`.",
    auth=None,
    request=inline_refresh,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{accessToken, refreshToken, user}`"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
@scoped_throttle("auth_burst")
def refresh(request):
    """Rotate a refresh token into a new access token (and a new refresh token)."""
    raw = (request.data or {}).get("refreshToken", "")
    if not raw:
        raise InvalidParameter(MISSING_REFRESH_TOKEN)
    session = UserSession.objects.select_related("user").filter(refresh_token_hash=hash_refresh_token(raw)).first()
    if session is None or not session.is_active:
        raise SessionAuthError("session_invalid")
    if session.expires_at and session.expires_at < timezone.now():
        session.revoke(SessionRevokeReason.EXPIRED)
        raise SessionAuthError("expired")
    access, new_refresh = services.rotate_session(session, request)
    return Response({"accessToken": access, "refreshToken": new_refresh, "user": user_profile(session.user)})


@extend_schema(
    operation_id="auth_me",
    summary="The signed-in user's profile.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The user profile shape.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(user_profile(request.user))


@extend_schema(
    operation_id="auth_logout",
    summary="Revoke the presenting session.",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{loggedOut: true}`")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    request.auth.revoke(SessionRevokeReason.LOGOUT)
    services.record_event(AuthEventKind.LOGOUT, user=request.user, session=request.auth, request=request)
    return Response({"loggedOut": True})


@extend_schema(
    operation_id="auth_sessions",
    summary="The signed-in user's device sessions (latest 50).",
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{items: [Session]}` — the current one is flagged."
        ),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_sessions(request):
    sessions = UserSession.objects.filter(user=request.user)[:50]
    return Response({"items": [session_payload(s, request.auth.id) for s in sessions]})


@extend_schema(
    operation_id="auth_session_revoke",
    summary="Revoke one of the user's device sessions.",
    request=None,
    parameters=[OpenApiParameter("session_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The revoked session's payload."),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    session = UserSession.objects.filter(pk=session_id, user=request.user).first()
    if session is None:
        raise NotFound(SESSION_NOT_FOUND)
    session.revoke(SessionRevokeReason.LOGOUT)
    services.record_event(
        AuthEventKind.LOGOUT, user=request.user, session=session, request=request, detail="revoked from devices list"
    )
    return Response(session_payload(session, request.auth.id))
