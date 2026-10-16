"""Staff-only analytics and control endpoints backing the admin console."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth import services
from features.auth.models import AuthEvent, User, UserSession
from features.auth.permissions import IsAdminRole
from features.auth.serializers import session_payload, session_with_user, user_profile
from features.common.choices import AuthEventKind, Role, SessionRevokeReason

PAGE_SIZE = 20


def _user_row(user: User) -> dict:
    """A compact user row for the users table."""
    return {
        "id": str(user.id),
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "isActive": user.is_active,
        "isStaff": user.is_staff,
        "activeSessions": user.sessions.filter(is_active=True).count(),
        "joinedAt": user.date_joined.isoformat(),
        "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }


def _breakdown(field: str) -> list[dict]:
    """Group sessions by a footprint field, biggest first."""
    rows = UserSession.objects.values(field).annotate(count=Count("id")).order_by("-count")
    return [{"key": row[field] or "unknown", "count": row["count"]} for row in rows]


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def overview(request):
    """Headline numbers for the console home."""
    now = timezone.now()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    return Response(
        {
            "users": {
                "total": User.objects.count(),
                "students": User.objects.filter(role=Role.STUDENT).count(),
                "instructors": User.objects.filter(role=Role.INSTRUCTOR).count(),
                "admins": User.objects.filter(role=Role.ADMIN).count(),
                "newLast7Days": User.objects.filter(date_joined__gte=week_ago).count(),
            },
            "sessions": {
                "active": UserSession.objects.filter(is_active=True).count(),
                "total": UserSession.objects.count(),
            },
            "activity": {
                "loginsLast24h": AuthEvent.objects.filter(kind=AuthEventKind.LOGIN, created_at__gte=day_ago).count(),
                "loginsLast7d": AuthEvent.objects.filter(kind=AuthEventKind.LOGIN, created_at__gte=week_ago).count(),
                "rejectedLast7d": AuthEvent.objects.filter(kind=AuthEventKind.REJECTED, created_at__gte=week_ago).count(),
                "revocationsLast7d": AuthEvent.objects.filter(kind=AuthEventKind.REVOKED, created_at__gte=week_ago).count(),
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def users(request):
    """Paged, filterable user list."""
    queryset = User.objects.all()
    role = request.query_params.get("role")
    if role in Role.values:
        queryset = queryset.filter(role=role)
    query = request.query_params.get("q")
    if query:
        queryset = queryset.filter(Q(email__icontains=query) | Q(full_name__icontains=query))
    page = max(int(request.query_params.get("page", 1)), 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return Response({"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [_user_row(u) for u in rows]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def user_detail(request, user_id):
    """One user with their full profile, sessions, and recent audit trail."""
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    sessions = user.sessions.all()[:50]
    events = user.auth_events.all()[:50]
    return Response(
        {
            "profile": user_profile(user),
            "sessions": [session_payload(s) for s in sessions],
            "events": [
                {
                    "id": str(e.id),
                    "kind": e.kind,
                    "provider": e.provider,
                    "deviceType": e.device_type,
                    "os": e.os,
                    "browser": e.browser,
                    "ipAddress": e.ip_address or "",
                    "detail": e.detail,
                    "createdAt": e.created_at.isoformat(),
                }
                for e in events
            ],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def set_role(request, user_id):
    """Promote or demote a role; an admin cannot change their own."""
    if str(request.user.id) == str(user_id):
        return Response({"detail": "لا يمكنك تغيير دورك الخاص."}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    role = (request.data or {}).get("role")
    if role not in Role.values:
        return Response({"detail": "دور غير صالح."}, status=status.HTTP_400_BAD_REQUEST)
    user.role = role
    user.is_staff = role == Role.ADMIN
    user.save(update_fields=["role", "is_staff"])
    services.ensure_profile(user)
    return Response(user_profile(user))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def sessions(request):
    """Every session across every user, active first."""
    queryset = UserSession.objects.select_related("user")
    active = request.query_params.get("active")
    if active in {"true", "false"}:
        queryset = queryset.filter(is_active=active == "true")
    query = request.query_params.get("q")
    if query:
        queryset = queryset.filter(Q(user__email__icontains=query) | Q(ip_address__icontains=query))
    page = max(int(request.query_params.get("page", 1)), 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return Response({"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [session_with_user(s, request.auth.id) for s in rows]})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def revoke_session(request, session_id):
    """Force-logout one device anywhere in the fleet."""
    session = UserSession.objects.select_related("user").filter(pk=session_id).first()
    if session is None:
        return Response({"detail": "الجلسة غير موجودة."}, status=status.HTTP_404_NOT_FOUND)
    session.revoke(SessionRevokeReason.REVOKED_BY_ADMIN)
    services.record_event(AuthEventKind.REVOKED, user=session.user, session=session, request=request, detail=f"revoked by admin {request.user.email}")
    return Response(session_with_user(session, request.auth.id))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def logins_series(request):
    """Daily login counts for the activity chart."""
    days = min(max(int(request.query_params.get("days", 14)), 1), 90)
    start = timezone.now() - timedelta(days=days)
    rows = (
        AuthEvent.objects.filter(kind=AuthEventKind.LOGIN, created_at__gte=start)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    return Response({"days": days, "points": [{"date": row["day"].isoformat(), "count": row["count"]} for row in rows]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def devices(request):
    """Session footprint breakdown by OS / browser / device type."""
    return Response({"os": _breakdown("os"), "browser": _breakdown("browser"), "deviceType": _breakdown("device_type")})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def events(request):
    """The most recent audit rows, optionally filtered by kind."""
    queryset = AuthEvent.objects.select_related("user")
    kind = request.query_params.get("kind")
    if kind in AuthEventKind.values:
        queryset = queryset.filter(kind=kind)
    rows = queryset[:100]
    return Response(
        {
            "results": [
                {
                    "id": str(e.id),
                    "kind": e.kind,
                    "provider": e.provider,
                    "email": e.email,
                    "deviceType": e.device_type,
                    "os": e.os,
                    "browser": e.browser,
                    "ipAddress": e.ip_address or "",
                    "detail": e.detail,
                    "createdAt": e.created_at.isoformat(),
                }
                for e in rows
            ]
        }
    )
