"""Staff-only analytics, account control, and content management endpoints."""

from __future__ import annotations

import json
import threading
import uuid
from datetime import timedelta
from pathlib import Path
from tempfile import gettempdir

from django.db import IntegrityError
from django.db import connections
from django.http import HttpResponse
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import APIException
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from features.adminconsole import serializers
from features.adminconsole.serializers import CONTENT_TYPES, USER_FIELDS
from features.auth import services
from features.auth.models import AuthEvent, User, UserSession
from features.auth.permissions import IsAdminRole
from features.auth.serializers import session_with_user, user_profile
from features.common.choices import AuthEventKind, Role, SessionRevokeReason
from features.competitions.models import Competition
from features.courses.models import Course
from features.events.models import EventItem
from features.scholarships.models import Scholarship

PAGE_SIZE = 20

# The content types the console manages, and where their headline counts come from.
CONTENT_COUNTS = {"courses": Course, "scholarships": Scholarship, "events": EventItem, "competitions": Competition}


class InvalidParameter(APIException):
    """A malformed query parameter; carries the same `detail` shape as every other error."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_parameter"


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
        except (TypeError, ValueError):
            errors.append(f"قيمة غير صالحة في «{field['label']}».")
    if errors:
        raise InvalidParameter(" ".join(errors))
    return values


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
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
                "rejectedLast7d": AuthEvent.objects.filter(kind=AuthEventKind.REJECTED, created_at__gte=week_ago).count(),
                "revocationsLast7d": AuthEvent.objects.filter(kind=AuthEventKind.REVOKED, created_at__gte=week_ago).count(),
            },
            "content": {key: model.objects.count() for key, model in CONTENT_COUNTS.items()},
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
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
    return Response({"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [serializers.user_row(u) for u in rows]})


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
    page = _int_param(request, "page", 1, 1)
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
    return Response({"results": [serializers.event_row(e, include_email=True) for e in queryset[:100]]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def content_schema(request):
    """The managed content types and their editable fields."""
    return Response({"types": serializers.content_types_payload(), "userFields": list(USER_FIELDS)})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def content_items(request, type_key):
    """Paged content rows (GET) or a new row (POST) for one managed type."""
    spec = _require_content_type(type_key)
    if request.method == "POST":
        values = _values_for(spec, request.data or {}, create=True)
        try:
            row = spec["model"].objects.create(**values)
        except (IntegrityError, ValueError):
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
    return Response({"total": total, "page": page, "pageSize": PAGE_SIZE, "results": [serializers.content_row(spec, r) for r in rows]})


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
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
    except (IntegrityError, ValueError):
        return Response({"detail": "تعذّر الحفظ: بيانات غير صالحة أو مكرّرة."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializers.content_row(spec, row))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_providers(request):
    from features.videohosting import diagnostics as vh_diagnostics
    from features.videohosting.models import VideoProvider
    from features.videohosting.serializers import provider_payload
    providers = VideoProvider.objects.all()
    if not providers.exists():
        from features.videohosting import providers as vh_providers
        vh_providers.ensure_defaults()
        providers = VideoProvider.objects.all()
    # `available` greys the select when a provider's own env checks fail.
    return Response({"results": [
        {
            **provider_payload(p),
            "available": vh_diagnostics.provider_available(p.code),
            "reason": "" if vh_diagnostics.provider_available(p.code) else vh_diagnostics.provider_reason(p.code),
        }
        for p in providers
    ]})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_assets(request):
    from features.videohosting.models import VideoAsset
    from features.videohosting import providers as vh_providers
    vh_providers.ensure_defaults()
    if request.method == "POST":
        data = request.data or {}
        slug = data.get("slug")
        if not slug:
            return Response({"detail": "slug مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
        provider, refusal = resolve_provider(data.get("provider"))
        if refusal is not None:
            return refusal
        try:
            asset = VideoAsset.objects.create(
                slug=slug,
                title=data.get("title") or "",
                provider=provider,
                created_by=request.user,
            )
            return Response(
                {"id": str(asset.id), "slug": asset.slug, "title": asset.title, "status": asset.status,
                 "provider": asset.provider.code if asset.provider else None},
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            return Response({"detail": "تعذّر الإنشاء."}, status=status.HTTP_400_BAD_REQUEST)
    assets = VideoAsset.objects.select_related("provider").prefetch_related("renditions").all()[:100]
    return Response({"results": [asset_row(a, include_error=True) for a in assets]})


def resolve_provider(provider_code: str | None):
    """Resolve one provider code against the registry and its env checks.

    Data-driven — every provider is gated the same way, and an unknown code
    fails loudly instead of silently falling back to the default. Returns
    (provider, None) on success or (None, a ready Response) to send as-is.
    """
    from features.videohosting import diagnostics
    from features.videohosting.models import VideoProvider

    if not provider_code:
        provider = VideoProvider.objects.filter(is_default=True, is_enabled=True).first()
        return provider, None
    provider = VideoProvider.objects.filter(code=provider_code).first()
    if provider is None:
        return None, Response(
            {"detail": f"مزود غير معروف: {provider_code}."}, status=status.HTTP_400_BAD_REQUEST
        )
    # The provider becomes selectable the moment its own env checks pass.
    if not diagnostics.provider_available(provider.code):
        return None, Response(
            {"detail": f"الرفع عبر {provider.name} غير جاهز — {diagnostics.provider_reason(provider.code)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return provider, None


# One asset row for list / detail / upload responses — the tracker reads the same shape.
def asset_row(asset, *, include_error: bool = False) -> dict:
    row = {
        "id": str(asset.id),
        "slug": asset.slug,
        "title": asset.title,
        "status": asset.status,
        "provider": asset.provider.code if asset.provider else None,
        "progress": asset.progress,
        "stage": asset.stage,
        "qualities": asset.renditions.count(),
        "createdAt": asset.created_at.isoformat(),
    }
    if include_error:
        row["error"] = asset.error_message[:300]
    return row


# Bot uploads cap at ~2GB; anything larger must go through the split path anyway.
VIDEO_UPLOAD_MAX_BYTES = 2 ** 31


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_start(request):
    """Open the consent dance — Google's URL for the admin's browser.

    The single-use CSRF state banks server-side; React receives the URL only
    (it carries the public client id, not a secret).
    """
    from features.videohosting import oauthdrive
    try:
        return Response({"authUrl": oauthdrive.consent_url()})
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def video_drive_oauth_callback(request):
    """Google's redirect target — validates the state, mints the grant.

    The code exchanges here on the backend and only the outcome (plus the
    account email) persists; the browser lands on a neutral page because
    there is no admin session to hand it to.
    """
    from features.videohosting import oauthdrive
    okay, email, detail = oauthdrive.complete(
        request.query_params.get("state") or "", request.query_params.get("code") or ""
    )
    return HttpResponseLoginPage(okay, detail)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_status(request):
    """The admin-safe connection state — account email and status, no tokens."""
    from features.videohosting import oauthdrive
    grant = oauthdrive.connected()
    # camelCase payload per the JSON contract; the tokens never leave Django.
    return Response({
        "connected": grant["connected"],
        "accountEmail": grant["account_email"],
        "status": grant["status"],
        "error": grant["error_message"],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_disconnect(request):
    """Revoke the grant at Google and drop the persisted credential."""
    from features.videohosting import oauthdrive
    oauthdrive.revoke()
    return Response({"connected": False})


def HttpResponseLoginPage(okay: bool, detail: str) -> HttpResponse:
    """The tiny neutral landing page Google's redirect ends on."""
    body = (
        "<!doctype html><html lang=ar dir=rtl><meta charset=utf-8><title>تخويل Google Drive</title>"
        f"<body style='font-family:sans-serif;text-align:center;padding:4rem'>"
        f"<h2>{'✓ تم ربط حساب Google' if okay else '✗ فشل التخويل'}</h2>"
        f"<p>{detail[:200]}</p>"
        "<p>أغلق هذه الصفحة، ثم أعد «فحص المنظومة» من لوحة الإدارة.</p>"
        "<script>setTimeout(close,4000)</script></body></html>"
    )
    return HttpResponse(body, content_type="text/html; charset=utf-8")


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_asset_upload(request):
    """Accept the actual video file, then ingest it in a worker thread.

    The HTTP leg ends as soon as the file is on disk: the response carries the
    asset id and the admin's tracker polls its progress/stage/status while the
    provider upload, packaging, and segment publishing run in the background.
    """
    from features.videohosting import providers as vh_providers
    from features.videohosting.models import VideoAsset
    vh_providers.ensure_defaults()

    uploaded = request.data.get("file")
    slug = (request.data.get("slug") or "").strip()
    if uploaded is None or not slug:
        return Response({"detail": "الملف و معرّف الفيديو مطلوبان."}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded.size > VIDEO_UPLOAD_MAX_BYTES:
        return Response({"detail": "الملف أكبر من 2GB — قسّمه أو استخدم ingest_video من الخادم."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    provider, refusal = resolve_provider(request.data.get("provider"))
    if refusal is not None:
        return refusal

    existing = VideoAsset.objects.filter(slug=slug).first()
    if existing is not None and existing.status in ("uploading", "processing"):
        return Response({"detail": "هذا المعرّف في منتصف رفع آخر — انتظر انتهاء المعالجة."}, status=status.HTTP_409_CONFLICT)

    # Persist the stream to a stable temp path: the request dies here, the worker lives on.
    file_name = getattr(uploaded, "name", "") or "video.bin"
    temp_path = Path(gettempdir()) / f"kh-video-{uuid.uuid4().hex}{Path(file_name).suffix or '.bin'}"
    with temp_path.open("wb") as destination:
        for chunk in uploaded.chunks():
            destination.write(chunk)

    asset = existing or VideoAsset.objects.create(slug=slug, created_by=request.user)
    asset.title = asset.title or (request.data.get("title") or Path(file_name).stem)
    asset.provider = provider
    asset.source_file_name = file_name
    asset.status = "uploading"
    asset.error_message = ""
    asset.progress = 0
    asset.stage = "uploading"
    asset.save(update_fields=["title", "provider", "source_file_name", "status", "error_message", "progress", "stage", "updated_at"])

    worker = threading.Thread(target=_run_ingest_worker, args=(slug, str(temp_path)), daemon=True)
    worker.start()
    return Response(asset_row(asset), status=status.HTTP_202_ACCEPTED)


def _run_ingest_worker(slug: str, file_path: str) -> None:
    """The background half of an admin upload: ingest, then drop this thread's DB connection.

    ingest_file lands status+error on the row for its own failures; anything
    that dies before or around it (imports, a lost DB) must still fail the row
    loudly — a stuck `uploading` would spin the admin's tracker forever.
    """
    from features.videohosting import ingest
    from features.videohosting.models import VideoAsset
    from features.videohosting.models import VideoStatus

    try:
        ingest.ingest_file(file_path, slug, remove_source=True, track_progress=True)
    except Exception as exc:
        VideoAsset.objects.filter(slug=slug).exclude(
            status__in=(VideoStatus.READY, VideoStatus.STAGED, VideoStatus.ERROR)
        ).update(status=VideoStatus.ERROR, error_message=f"عامل الرفع توقّف: {exc}"[:2000], stage="")
    finally:
        connections.close_all()


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_asset_detail(request, asset_id):
    from features.videohosting.models import VideoAsset
    asset = VideoAsset.objects.filter(pk=asset_id).first()
    if asset is None:
        return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        asset.delete()
        return Response({"deleted": True, "id": str(asset_id)})
    # The poller's shape: live status, progress bar, stage, and error detail.
    return Response(asset_row(asset, include_error=True))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_diagnostics(request):
    """The staged validation of every part the video pipeline relies on.

    Shallow (default) stays offline; `?deep=true` also calls the providers'
    own APIs so the admin sees exactly which stage breaks and why.
    """
    from features.videohosting import diagnostics

    deep = (request.query_params.get("deep") or "").lower() in {"1", "true", "yes"}
    return Response(diagnostics.run(deep=deep))
