"""Account services — Firebase upsert, session lifecycle, and audit events."""

from __future__ import annotations

import math
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from features.auth.device import client_ip, parse_user_agent
from features.auth.models import AuthEvent, InstructorProfile, StudentProfile, User, UserSession
from features.auth.tokens import make_access_token, make_refresh_token, refresh_expiry
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.common.throttling import LOCKOUT_THRESHOLD, LOCKOUT_WINDOW_SECONDS


def ensure_profile(user: User) -> None:
    """Every user gets the profile row its role expects."""
    if user.role == Role.INSTRUCTOR:
        InstructorProfile.objects.get_or_create(user=user)
    elif user.role == Role.STUDENT:
        StudentProfile.objects.get_or_create(user=user)


def upsert_firebase_user(identity: dict) -> User:
    """Link a verified Firebase identity to a User, creating one if needed."""
    uid = identity["uid"]
    email = identity.get("email") or f"{uid}@firebase.local"
    user = User.objects.filter(firebase_uid=uid).first() or User.objects.filter(email=email).first()
    if user is None:
        user = User.objects.create_user(email=email, password=None, role=identity.get("role") or Role.STUDENT)
    user.firebase_uid = uid
    user.full_name = user.full_name or identity.get("name", "")
    if identity.get("picture"):
        user.avatar_url = user.avatar_url or identity["picture"]
    user.last_seen_at = timezone.now()
    user.save()
    ensure_profile(user)
    return user


def revoke_other_sessions(user: User, keep: UserSession | None = None) -> int:
    """Single-device rule: the newest login kills every other active session."""
    others = UserSession.objects.filter(user=user, is_active=True)
    if keep is not None:
        others = others.exclude(pk=keep.pk)
    return others.update(is_active=False, revoked_reason=SessionRevokeReason.SIGNED_IN_ELSEWHERE)


def record_event(
    kind: str, *, user=None, session=None, request=None, provider: str = "", email: str = "", detail: str = ""
) -> None:
    """Append one audit row; safe to call without a request (e.g. tests)."""
    footprint = parse_user_agent(request.META.get("HTTP_USER_AGENT", "")) if request else {}
    AuthEvent.objects.create(
        user=user,
        session=session,
        kind=kind,
        provider=provider,
        email=email or (user.email if user else ""),
        os=footprint.get("os", ""),
        browser=footprint.get("browser", ""),
        device_type=footprint.get("device_type", ""),
        ip_address=client_ip(request) if request else None,
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
        detail=detail,
    )


def login_lockout_seconds(email: str = "", ip: str | None = None) -> int:
    """Seconds this identity must wait before logging in again, 0 when clear.

    Counted from REJECTED auth events matching the email or the source IP
    inside the lockout window (either identifier alone is enough). Past the
    threshold the wait is the time until the newest reject leaves the window —
    waiting clears it, and callers of the blocked path record nothing new, so
    a retry storm cannot extend its own lockout.
    """
    if not email and not ip:
        return 0
    now = timezone.now()
    rejects = AuthEvent.objects.filter(
        kind=AuthEventKind.REJECTED, created_at__gte=now - timedelta(seconds=LOCKOUT_WINDOW_SECONDS)
    )
    if email and ip:
        rejects = rejects.filter(Q(email=email) | Q(ip_address=ip))
    else:
        rejects = rejects.filter(email=email) if email else rejects.filter(ip_address=ip)
    if rejects.count() < LOCKOUT_THRESHOLD:
        return 0
    newest = rejects.order_by("-created_at").first()
    remaining = LOCKOUT_WINDOW_SECONDS - (now - newest.created_at).total_seconds()
    return max(1, math.ceil(remaining))


def open_session(user: User, request, provider: str) -> tuple[UserSession, str, str]:
    """Create a session, enforce one device, and mint an access/refresh pair."""
    footprint = parse_user_agent(request.META.get("HTTP_USER_AGENT", ""))
    raw_refresh, refresh_hash = make_refresh_token()
    session = UserSession.objects.create(
        user=user,
        refresh_token_hash=refresh_hash,
        expires_at=refresh_expiry(),
        ip_address=client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        **footprint,
    )
    killed = revoke_other_sessions(user, keep=session)
    if killed:
        record_event(
            AuthEventKind.REVOKED,
            user=user,
            session=session,
            request=request,
            provider=provider,
            detail=f"ended {killed} other session(s) on this login",
        )
    record_event(AuthEventKind.LOGIN, user=user, session=session, request=request, provider=provider)
    return session, make_access_token(user, session), raw_refresh


def rotate_session(session: UserSession, request) -> tuple[str, str]:
    """Issue a fresh token pair for an existing session after a refresh."""
    raw_refresh, refresh_hash = make_refresh_token()
    session.refresh_token_hash = refresh_hash
    session.expires_at = refresh_expiry()
    session.save(update_fields=["refresh_token_hash", "expires_at"])
    record_event(AuthEventKind.REFRESH, user=session.user, session=session, request=request)
    return make_access_token(session.user, session), raw_refresh
