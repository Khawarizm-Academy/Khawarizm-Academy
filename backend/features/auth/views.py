"""Auth endpoints: Firebase login, refresh, me, logout, and device sessions."""

from __future__ import annotations

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from features.auth import firebase, services
from features.auth.models import UserSession
from features.auth.serializers import session_payload, user_profile
from features.auth.tokens import hash_refresh_token
from features.common.choices import AuthEventKind, SessionRevokeReason
from features.common.serializers import compact


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_config(request):
    """Everything the SPA needs to initialize its Firebase client."""
    return Response(
        {
            # The web config `initializeApp()` takes; Auth needs exactly these three.
            "firebase": compact(
                apiKey=settings.FIREBASE_API_KEY,
                authDomain=settings.FIREBASE_AUTH_DOMAIN,
                projectId=settings.FIREBASE_PROJECT_ID,
            ),
            "providers": ["password", "google", "facebook"],
            "devAuth": settings.FIREBASE_ALLOW_DEV_TOKENS and not settings.FIREBASE_PROJECT_ID,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def firebase_login(request):
    """Exchange a Firebase ID token for our access/refresh pair."""
    id_token = (request.data or {}).get("idToken", "")
    if not id_token:
        return Response({"detail": "idToken مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        identity = firebase.verify_id_token(id_token)
    except firebase.FirebaseError as exc:
        services.record_event(AuthEventKind.REJECTED, request=request, detail=str(exc)[:200])
        return Response({"detail": "تعذر التحقق من الهوية."}, status=status.HTTP_401_UNAUTHORIZED)
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


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    """Rotate a refresh token into a new access token (and a new refresh token)."""
    raw = (request.data or {}).get("refreshToken", "")
    if not raw:
        return Response({"detail": "refreshToken مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
    session = UserSession.objects.select_related("user").filter(refresh_token_hash=hash_refresh_token(raw)).first()
    if session is None or not session.is_active:
        return Response({"code": "session_invalid", "detail": "الجلسة غير صالحة."}, status=status.HTTP_401_UNAUTHORIZED)
    if session.expires_at and session.expires_at < timezone.now():
        session.revoke(SessionRevokeReason.EXPIRED)
        return Response({"code": "expired", "detail": "انتهت صلاحية الجلسة."}, status=status.HTTP_401_UNAUTHORIZED)
    access, new_refresh = services.rotate_session(session, request)
    return Response({"accessToken": access, "refreshToken": new_refresh, "user": user_profile(session.user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(user_profile(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    request.auth.revoke(SessionRevokeReason.LOGOUT)
    services.record_event(AuthEventKind.LOGOUT, user=request.user, session=request.auth, request=request)
    return Response({"loggedOut": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_sessions(request):
    sessions = UserSession.objects.filter(user=request.user)[:50]
    return Response({"sessions": [session_payload(s, request.auth.id) for s in sessions]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    session = UserSession.objects.filter(pk=session_id, user=request.user).first()
    if session is None:
        return Response({"detail": "الجلسة غير موجودة."}, status=status.HTTP_404_NOT_FOUND)
    session.revoke(SessionRevokeReason.LOGOUT)
    services.record_event(AuthEventKind.LOGOUT, user=request.user, session=session, request=request, detail="revoked from devices list")
    return Response(session_payload(session, request.auth.id))
