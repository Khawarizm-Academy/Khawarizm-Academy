"""Staff-only analytics, account control, and content management endpoints."""

from __future__ import annotations

import json
from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.adminconsole import serializers
from features.adminconsole.serializers import CONTENT_TYPES, USER_FIELDS
from features.auth import services
from features.auth.models import AuthEvent, User, UserSession
from features.auth.permissions import IsAdminRole
from features.auth.serializers import session_with_user, user_profile
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.common.errors import InvalidParameter
from features.common.throttling import scoped_throttle
from features.competitions.models import Competition
from features.courses.models import Course
from features.events.models import EventItem
from features.scholarships.models import Scholarship

PAGE_SIZE = 20

# The content types the console manages, and where their headline counts come from.
CONTENT_COUNTS = {"courses": Course, "scholarships": Scholarship, "events": EventItem, "competitions": Competition}


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


def _require_content_type(type_key: str) -> dict:
    """Resolve a managed content type or 404 with the standard envelope."""
    spec = CONTENT_TYPES.get(type_key)
    if spec is None:
        raise InvalidParameter(f"نوع محتوى غير معروف: {type_key}")
    return spec


def _coerce(field: dict, value):
    """Turn a submitted JSON value into the Python type the column expects."""
    kind = field["kind"]
    if kind == "number":
        return int(value)
    if kind == "decimal":
        return float(value)
    if kind == "bool":
        return value in (True, "true", "1", 1)
    if kind == "json":
        return value if not isinstance(value, str) else json.loads(value)
    return str(value)


def _values_for(spec: dict, data: dict, create: bool) -> dict:
    """Validate and coerce the submitted fields into model kwargs."""
    values: dict = {}
    errors: list[str] = []
    for field in spec["fields"]:
        if field["name"] not in data:
            if create and field.get("required"):
                errors.append(f"الحقل «{field['label']}» مطلوب.")
            continue
        value = data[field["name"]]
        is_empty = value is None or value == ""
        if is_empty:
            # Clearing a text column is fine; a numeric one keeps its current value.
            if create and field.get("required"):
                errors.append(f"الحقل «{field['label']}» مطلوب.")
            elif not create and field["kind"] in ("text", "textarea", "url", "select"):
                values[field["attr"]] = ""
            continue
        try:
            values[field["attr"]] = _coerce(field, value)
        except TypeError, ValueError:
            errors.append(f"قيمة غير صالحة في «{field['label']}».")
    if errors:
        raise InvalidParameter(" ".join(errors))
    return values


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
            "content": {key: model.objects.count() for key, model in CONTENT_COUNTS.items()},
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def users(request):
    """Paged, filterable user list (GET) or a new account (POST)."""
    if request.method == "POST":
        return _create_user(request)
    queryset = User.objects.all()
    role = request.query_params.get("role")
    if role in Role.values:
        queryset = queryset.filter(role=role)
    query = request.query_params.get("q")
    if query:
        queryset = queryset.filter(Q(email__icontains=query) | Q(full_name__icontains=query))
    page = _int_param(request, "page", 1, 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return Response(
        {"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [serializers.user_row(u) for u in rows]}
    )


def _create_user(request) -> Response:
    """Create an account from the console's user form."""
    data = request.data or {}
    values = _values_for({"fields": USER_FIELDS}, data, create=True)
    email = str(values.get("email", "")).strip().lower()
    if not email:
        return Response({"detail": "البريد الإلكتروني مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "البريد الإلكتروني مستخدم بالفعل."}, status=status.HTTP_400_BAD_REQUEST)
    password = data.get("password") or None
    user = User.objects.create_user(email=email, password=password, **{k: v for k, v in values.items() if k != "email"})
    user.is_staff = user.role == Role.ADMIN
    user.save(update_fields=["is_staff"])
    services.ensure_profile(user)
    return Response(serializers.user_row(user), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def user_detail(request, user_id):
    """One user's detail (GET), an account edit (PATCH), or removal (DELETE)."""
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "PATCH":
        return _update_user(request, user)
    if request.method == "DELETE":
        if str(request.user.id) == str(user.id):
            return Response({"detail": "لا يمكنك حذف حسابك الخاص."}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({"deleted": True, "id": str(user_id)})
    return Response(serializers.admin_user_detail(user, request.auth.id))


def _update_user(request, user: User) -> Response:
    """Apply the console's account edits, keeping Django staff rights in sync."""
    values = _values_for({"fields": USER_FIELDS}, request.data or {}, create=False)
    # Email is immutable: console edits can never change the account's identity.
    values.pop("email", None)
    for attr, value in values.items():
        setattr(user, attr, value)
    if "role" in values:
        if str(request.user.id) == str(user.id) and values["role"] != Role.ADMIN:
            return Response({"detail": "لا يمكنك خفض دورك الخاص."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_staff = values["role"] == Role.ADMIN
    try:
        user.save()
    except IntegrityError:
        return Response({"detail": "تعذّر حفظ التعديلات: قيمة مكرّرة."}, status=status.HTTP_400_BAD_REQUEST)
    services.ensure_profile(user)
    return Response(serializers.user_row(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
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
    page = _int_param(request, "page", 1, 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return Response(
        {
            "total": total,
            "page": page,
            "pageSize": PAGE_SIZE,
            "results": [session_with_user(s, request.auth.id) for s in rows],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def revoke_session(request, session_id):
    """Force-logout one device anywhere in the fleet."""
    session = UserSession.objects.select_related("user").filter(pk=session_id).first()
    if session is None:
        return Response({"detail": "الجلسة غير موجودة."}, status=status.HTTP_404_NOT_FOUND)
    session.revoke(SessionRevokeReason.REVOKED_BY_ADMIN)
    services.record_event(
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
    spec = _require_content_type(type_key)
    if request.method == "POST":
        values = _values_for(spec, request.data or {}, create=True)
        try:
            row = spec["model"].objects.create(**values)
        except IntegrityError, ValueError:
            return Response({"detail": "تعذّر الإنشاء: بيانات غير صالحة أو مكرّرة."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializers.content_row(spec, row), status=status.HTTP_201_CREATED)
    queryset = spec["model"].objects.all()
    query = request.query_params.get("q")
    if query:
        conditions = Q()
        for field in spec["search"]:
            conditions |= Q(**{f"{field}__icontains": query})
        queryset = queryset.filter(conditions)
    page = _int_param(request, "page", 1, 1)
    total = queryset.count()
    rows = queryset[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return Response(
        {
            "total": total,
            "page": page,
            "pageSize": PAGE_SIZE,
            "results": [serializers.content_row(spec, r) for r in rows],
        }
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def content_detail(request, type_key, pk):
    """Edit (PATCH) or delete (DELETE) one content row."""
    spec = _require_content_type(type_key)
    row = spec["model"].objects.filter(pk=pk).first()
    if row is None:
        return Response({"detail": "العنصر غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        row.delete()
        return Response({"deleted": True, "id": str(pk)})
    values = _values_for(spec, request.data or {}, create=False)
    for attr, value in values.items():
        setattr(row, attr, value)
    try:
        row.save()
    except IntegrityError, ValueError:
        return Response({"detail": "تعذّر الحفظ: بيانات غير صالحة أو مكرّرة."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializers.content_row(spec, row))
