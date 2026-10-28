"""Staff-only analytics, account control, and content management endpoints.

Thin handlers: resolve the caller/row, call one service function, serialize.
The rules live in `features/adminconsole/services.py`.
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import exceptions, status
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from features.adminconsole import serializers, services
from features.adminconsole.serializers import USER_FIELDS
from features.auth import services as auth_services
from features.auth.authentication import AccessTokenAuthentication, CronSecretAuthentication
from features.auth.models import AuthEvent, User, UserSession
from features.auth.permissions import IsAdminRole
from features.auth.serializers import session_with_user, user_profile
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.common.errors import InvalidParameter, NotFound
from features.common.maintenance import run_cleanup
from features.common.messages import (
    ADMIN_CONTENT_NOT_FOUND,
    ADMIN_USER_NOT_FOUND,
    SESSION_NOT_FOUND,
)
from features.common.schemas import ErrorSerializer
from features.common.throttling import scoped_throttle

# The cron/staff trigger's 202 body — a job status resource, not a content row.
inline_cleanup_status = inline_serializer(
    "MaintenanceCleanupStatus",
    fields={
        "id": ser.UUIDField(help_text="The MaintenanceRun row id."),
        "status": ser.ChoiceField(choices=["done", "skipped"]),
        "deleted": ser.DictField(required=False, child=ser.IntegerField(), help_text="Per-family delete counts."),
    },
)

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


@extend_schema(
    operation_id="admin_overview",
    summary="Headline counts: users, sessions, activity, content totals.",
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{users, sessions, activity, content}`")
    },
)
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


@extend_schema(
    methods=["GET"],
    operation_id="admin_users_list",
    summary="Paged, filterable user list.",
    parameters=[
        OpenApiParameter("role", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter(
            "q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description="Email/full-name search."
        ),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{total, page, pageSize, results: [UserRow]}`"),
    },
)
@extend_schema(
    methods=["POST"],
    operation_id="admin_users_create",
    summary="Create a user account.",
    request=inline_serializer(
        "AdminUserCreateRequest",
        fields={
            "email": ser.EmailField(),
            "fullName": ser.CharField(),
            "role": ser.ChoiceField(choices=["student", "instructor", "admin"], required=False),
            "password": ser.CharField(required=False),
        },
    ),
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The created UserRow.")},
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


@extend_schema(
    methods=["GET"],
    operation_id="admin_user_read",
    summary="One account's detail.",
    parameters=[OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The UserRow.")},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="admin_user_update",
    summary="Edit a subset of one account.",
    description="Moves through the account services (role sync, session revocation, audit events).",
    parameters=[OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=inline_serializer(
        "AdminUserPatchRequest",
        fields={
            "fullName": ser.CharField(required=False, allow_blank=True),
            "phone": ser.CharField(required=False, allow_blank=True),
            "language": ser.CharField(required=False, allow_blank=True),
            "timezone": ser.CharField(required=False, allow_blank=True),
            "isStaff": ser.BooleanField(required=False),
        },
    ),
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The updated UserRow.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="admin_user_delete",
    summary="Delete an account.",
    parameters=[OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{deleted: true, id}`"),
        204: OpenApiResponse(description="Deleted."),
    },
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


@extend_schema(
    operation_id="admin_user_set_role",
    summary="Promote or demote a role (an admin cannot change their own).",
    parameters=[OpenApiParameter("user_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    request=inline_serializer(
        "AdminRoleChange", fields={"role": ser.ChoiceField(choices=["student", "instructor", "admin"])}
    ),
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The updated user profile."),
        400: OpenApiResponse(
            response=ErrorSerializer, description="`invalid_parameter` — unknown role or self-change."
        ),
    },
)
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


@extend_schema(
    operation_id="admin_sessions",
    summary="Every device session across every user, active first.",
    parameters=[
        OpenApiParameter(
            "active", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description="`true|false`"
        ),
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{total, page, pageSize, results: [Session]}`"),
    },
)
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


@extend_schema(
    operation_id="admin_session_revoke",
    summary="Force-logout one device anywhere in the fleet.",
    request=None,
    parameters=[OpenApiParameter("session_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The revoked session's payload."),
    },
)
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


@extend_schema(
    operation_id="admin_analytics_logins",
    summary="Daily login counts for the activity chart.",
    parameters=[
        OpenApiParameter(
            "days", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description="1–90, default 14."
        )
    ],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{days, points: [{date, count}]}`"),
    },
)
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


@extend_schema(
    operation_id="admin_analytics_devices",
    summary="Session footprint breakdown by OS / browser / device type.",
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{os: [...], browser: [...], deviceType: [...]}`"
        ),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def devices(request):
    """Session footprint breakdown by OS / browser / device type."""
    return Response({"os": _breakdown("os"), "browser": _breakdown("browser"), "deviceType": _breakdown("device_type")})


@extend_schema(
    operation_id="admin_events",
    summary="The most recent audit rows.",
    parameters=[
        OpenApiParameter(
            "kind",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="`login|logout|refresh|revoked|rejected`",
        )
    ],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{results: [AuditEvent]}` — latest 100."),
    },
)
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


@extend_schema(
    operation_id="admin_content_schema",
    summary="The managed content types and their editable fields.",
    description="Drives every admin form — the SPA renders from this, so field lists live here only.",
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{types: {...}, userFields: [...]}`"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
@scoped_throttle("admin_burst")
def content_schema(request):
    """The managed content types and their editable fields."""
    return Response({"types": serializers.content_types_payload(), "userFields": list(USER_FIELDS)})


@extend_schema(
    methods=["GET"],
    operation_id="admin_content_list",
    summary="Paged content rows for one managed type.",
    description="`type_key` is `courses|scholarships|events|competitions`; unknown keys are 400s "
    "naming the valid ones.",
    parameters=[
        OpenApiParameter("type_key", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{total, page, pageSize, results: [Row]}`"),
    },
)
@extend_schema(
    methods=["POST"],
    operation_id="admin_content_create",
    summary="Create a content row.",
    description="The body is the type's editable fields — the schema endpoint owns the list.",
    parameters=[OpenApiParameter("type_key", OpenApiTypes.STR, OpenApiParameter.PATH)],
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The created row.")},
)
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


@extend_schema(
    methods=["PATCH"],
    operation_id="admin_content_update",
    summary="Edit one content row.",
    description="Partial: the body carries only the changed editable fields — the schema endpoint owns the list.",
    parameters=[
        OpenApiParameter("type_key", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("pk", OpenApiTypes.UUID, OpenApiParameter.PATH),
    ],
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The updated row.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="admin_content_delete",
    summary="Delete one content row.",
    parameters=[
        OpenApiParameter("type_key", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("pk", OpenApiTypes.UUID, OpenApiParameter.PATH),
    ],
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{deleted: true, id}`"),
        204: OpenApiResponse(description="Deleted."),
    },
)
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


@extend_schema(
    methods=["GET"],
    operation_id="admin_maintenance_cleanup_status",
    summary="Run the retention cleanup inline (the cron's method).",
    description="Staff session bearer or the platform cron's `Bearer $CRON_SECRET`; anything else 401/403. "
    "Idempotent; a still-running previous pass answers `status: skipped`.",
    request=None,
    responses={
        202: OpenApiResponse(response=inline_cleanup_status, description="`{id, status: done|skipped, deleted?}`"),
        403: OpenApiResponse(response=ErrorSerializer, description="`permission_denied` — neither staff nor cron."),
    },
)
@extend_schema(
    methods=["POST"],
    operation_id="admin_maintenance_cleanup_trigger",
    summary="Trigger the retention cleanup inline.",
    description="Same gate and body as the GET — both exist because platform crons send GET and dashboards send POST.",
    request=None,
    responses={
        202: OpenApiResponse(response=inline_cleanup_status, description="`{id, status: done|skipped, deleted?}`"),
        403: OpenApiResponse(response=ErrorSerializer, description="`permission_denied` — neither staff nor cron."),
    },
)
@api_view(["POST", "GET"])
@authentication_classes([CronSecretAuthentication, AccessTokenAuthentication])
@permission_classes([AllowAny])
def maintenance_cleanup(request):
    """Run `cleanup_expired` inline — 202 with the run's status body.

    Two callers share it: an admin (session bearer) and the platform cron
    (Vercel sends `Authorization: Bearer $CRON_SECRET`, which cannot hold a
    user session). `CronSecretAuthentication` marks the cron path as
    `request.auth == "cron"`; everything else must be staff, so the gate
    stays explicit here instead of trusting `AllowAny`.
    """
    is_cron = request.auth == "cron"
    if not is_cron and not (request.user and request.user.is_staff):
        raise exceptions.PermissionDenied()
    trigger = "cron" if is_cron else "endpoint"
    # 202 per the job pattern: the caller gets a status resource immediately;
    # the work itself is inline (chunked deletes finish well inside the
    # serverless runtime), so there is nothing to poll.
    return Response(run_cleanup(trigger), status=status.HTTP_202_ACCEPTED)
