"""Staff-only analytics, account control, and content management endpoints.

Thin handlers: resolve the caller/row, call one service function, serialize.
The rules live in `features/adminconsole/services.py`.
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.adminconsole import serializers, services
from features.adminconsole.serializers import USER_FIELDS
from features.auth import services as auth_services
from features.auth.models import AuthEvent, User, UserSession
from features.auth.permissions import IsAdminRole
from features.auth.serializers import session_with_user, user_profile
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.common.errors import InvalidParameter, NotFound
from features.common.messages import (
    ADMIN_CONTENT_NOT_FOUND,
    ADMIN_USER_NOT_FOUND,
    SESSION_NOT_FOUND,
)
from features.common.throttling import scoped_throttle

PAGE_SIZE = 20


def _int_param(request, name: str, default: int, low: int) -> int:
    """Floored int query param; a non-numeric value is a 400 instead of a 500."""
    raw = request.query_params.get(name, str(default))
    try:
        value = int(raw)
    except ValueError:
        raise InvalidParameter(f"قيمة غير رقمية في «{name}»: {raw}") from None
    return max(value, low)


def _breakdown(field: str) -> list[dict]:
    """Group sessions by a footprint field, biggest first."""
    rows = UserSession.objects.values(field).annotate(count=Count("id")).order_by("-count")
    return [{"key": row[field] or "unknown", "count": row["count"]} for row in rows]


def _page(queryset, request):
    """The standard paged envelope body for a list endpoint."""
    page = _int_param(request, "page", 1, 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return {"total": total, "page": page, "pageSize": PAGE_SIZE, "results": rows}


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def overview(request):
    """Headline numbers for the console home, including content totals."""
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
                "rejectedLast7d": AuthEvent.objects.filter(
                    kind=AuthEventKind.REJECTED, created_at__gte=week_ago
                ).count(),
                "revocationsLast7d": AuthEvent.objects.filter(
                    kind=AuthEventKind.REVOKED, created_at__gte=week_ago
                ).count(),
            },
            "content": {key: model.objects.count() for key, model in services.CONTENT_COUNTS.items()},
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def users(request):
    """Paged, filterable user list (GET) or a new account (POST)."""
    if request.method == "POST":
        user = services.create_user_account(request.data or {})
        return Response(serializers.user_row(user), status=status.HTTP_201_CREATED)
    queryset = User.objects.all()
    role = request.query_params.get("role")
    if role in Role.values:
        queryset = queryset.filter(role=role)
    query = request.query_params.get("q")
    if query:
        queryset = queryset.filter(Q(email__icontains=query) | Q(full_name__icontains=query))
    page = _int_param(request, "page", 1, 1)
    total = queryset.count()
    # The active-session count rides as an annotation on the page slice only —
    # a per-row subquery in the list used to make this an N+1.
    rows = queryset.annotate(active_sessions=Count("sessions", filter=Q(sessions__is_active=True)))[
        (page - 1) * PAGE_SIZE : page * PAGE_SIZE
    ]
    return Response(
        {"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [serializers.user_row(u) for u in rows]}
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def user_detail(request, user_id):
    """One user's detail (GET), an account edit (PATCH), or removal (DELETE)."""
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise NotFound(ADMIN_USER_NOT_FOUND)
    if request.method == "PATCH":
        services.update_user_account(user, request.data or {}, acting_user=request.user)
        return Response(serializers.user_row(user))
    if request.method == "DELETE":
        services.delete_user_account(user, acting_user=request.user)
        return Response({"deleted": True, "id": str(user_id)})
    return Response(serializers.admin_user_detail(user, request.auth.id))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def set_role(request, user_id):
    """Promote or demote a role; an admin cannot change their own."""
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise NotFound(ADMIN_USER_NOT_FOUND)
    updated = services.set_role(user, (request.data or {}).get("role"), acting_user=request.user)
    return Response(user_profile(updated))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def sessions(request):
    """Every session across every user, active first."""
    queryset = UserSession.objects.select_related("user")
    active = request.query_params.get("active")
    if active in {"true", "false"}:
        queryset = queryset.filter(is_active=active == "true")
    query = request.query_params.get("q")
    if query:
        queryset = queryset.filter(Q(user__email__icontains=query) | Q(ip_address__icontains=query))
    body = _page(queryset, request)
    body["results"] = [session_with_user(s, request.auth.id) for s in body["results"]]
    return Response(body)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def revoke_session(request, session_id):
    """Force-logout one device anywhere in the fleet."""
    session = UserSession.objects.select_related("user").filter(pk=session_id).first()
    if session is None:
        raise NotFound(SESSION_NOT_FOUND)
    session.revoke(SessionRevokeReason.REVOKED_BY_ADMIN)
    auth_services.record_event(
        AuthEventKind.REVOKED,
        user=session.user,
        session=session,
        request=request,
        detail=f"revoked by admin {request.user.email}",
    )
    return Response(session_with_user(session, request.auth.id))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def logins_series(request):
    """Daily login counts for the activity chart."""
    days = min(_int_param(request, "days", 14, 1), 90)
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
@scoped_throttle("admin_burst")
def devices(request):
    """Session footprint breakdown by OS / browser / device type."""
    return Response({"os": _breakdown("os"), "browser": _breakdown("browser"), "deviceType": _breakdown("device_type")})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def events(request):
    """The most recent audit rows, optionally filtered by kind."""
    queryset = AuthEvent.objects.select_related("user")
    kind = request.query_params.get("kind")
    if kind in AuthEventKind.values:
        queryset = queryset.filter(kind=kind)
    return Response({"results": [serializers.event_row(e, include_email=True) for e in queryset[:100]]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def content_schema(request):
    """The managed content types and their editable fields."""
    return Response({"types": serializers.content_types_payload(), "userFields": list(USER_FIELDS)})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def content_items(request, type_key):
    """Paged content rows (GET) or a new row (POST) for one managed type."""
    spec = services.require_content_type(type_key)
    if request.method == "POST":
        row = services.create_content_row(spec, request.data or {})
        return Response(serializers.content_row(spec, row), status=status.HTTP_201_CREATED)
    queryset = spec["model"].objects.all()
    query = request.query_params.get("q")
    if query:
        conditions = Q()
        for field in spec["search"]:
            conditions |= Q(**{f"{field}__icontains": query})
        queryset = queryset.filter(conditions)
    body = _page(queryset, request)
    body["results"] = [serializers.content_row(spec, r) for r in body["results"]]
    return Response(body)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def content_detail(request, type_key, pk):
    """Edit (PATCH) or delete (DELETE) one content row."""
    spec = services.require_content_type(type_key)
    row = spec["model"].objects.filter(pk=pk).first()
    if row is None:
        raise NotFound(ADMIN_CONTENT_NOT_FOUND)
    if request.method == "DELETE":
        row.delete()
        return Response({"deleted": True, "id": str(pk)})
    updated = services.save_content_row(spec, row, request.data or {})
    return Response(serializers.content_row(spec, updated))
