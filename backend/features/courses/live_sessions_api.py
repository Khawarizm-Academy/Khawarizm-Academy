"""Studio live-session API and private course-calendar endpoints for Phase 10."""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.registry import OWN_KINDS
from features.access.services import has_perm
from features.courses import services
from features.courses.models import Course, CourseLiveSession
from features.courses.serializers import live_session
from features.courses.live_sessions_signals import emit_live_session_hook
from features.videohosting.models import VideoAsset

_SESSION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
_ALLOWED_FIELDS = {
    "sessionId", "title", "startsAt", "durationMinutes", "timezone", "meetUrl",
    "dateLabel", "timeLabel", "recordingUrl", "recordingAssetId", "notes", "order",
}


def _course(slug: str) -> Course:
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise services.NotFound(services.COURSE_NOT_FOUND)
    return course


def _can_manage(user: Any, course: Course) -> None:
    services._require_action(user, course, "live_sessions.manage_own", "live_sessions.manage_any")


def _body(request: Any) -> dict[str, Any]:
    if not isinstance(request.data, dict):
        raise ser.ValidationError("يجب أن يكون جسم الطلب كائنًا.")
    unknown = sorted(set(request.data) - _ALLOWED_FIELDS)
    if unknown:
        raise ser.ValidationError({key: "حقل غير معروف." for key in unknown})
    return request.data


def _timezone_name(value: Any, current: str | None = None) -> str:
    candidate = str(value if value is not None else (current or "")).strip()
    if not candidate:
        return current or "UTC"
    try:
        ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError):
        raise ser.ValidationError({"timezone": "المنطقة الزمنية غير صالحة."})
    return candidate


def _starts_at(value: Any, timezone_name: str) -> datetime | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ser.ValidationError({"startsAt": "أدخل وقتًا بصيغة ISO."})
    parsed = parse_datetime(value)
    if parsed is None:
        raise ser.ValidationError({"startsAt": "أدخل وقتًا بصيغة ISO."})
    if timezone.is_naive(parsed):
        session_zone = services.live_session_timezone(timezone_name)
        first_fold = parsed.replace(tzinfo=session_zone, fold=0)
        second_fold = parsed.replace(tzinfo=session_zone, fold=1)
        if first_fold.utcoffset() != second_fold.utcoffset():
            raise ser.ValidationError({"startsAt": "هذا الوقت ملتبس أو غير موجود في المنطقة الزمنية المحددة."})
        parsed = first_fold
    return parsed


def _duration(value: Any, current: int | None = None) -> int:
    if value is None:
        return current if current is not None else 60
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 1_440:
        raise ser.ValidationError({"durationMinutes": "المدة يجب أن تكون بين دقيقة و١٤٤٠ دقيقة."})
    return value


def _https_url(value: Any, field: str) -> str:
    value = (value or "").strip() if isinstance(value, str) else ""
    if value:
        try:
            parsed = urlparse(value)
            hostname = parsed.hostname
        except ValueError:
            raise ser.ValidationError({field: "يجب أن يكون الرابط HTTPS صالحًا."}) from None
        if (
            len(value) > 400
            or any(ord(character) < 32 for character in value)
            or parsed.scheme != "https"
            or not hostname
            or parsed.username
            or parsed.password
        ):
            raise ser.ValidationError({field: "يجب أن يكون الرابط HTTPS صالحًا."})
    return value


def _recording_asset(value: Any, actor: Any) -> VideoAsset | None:
    if value in (None, ""):
        return None
    try:
        asset_id = uuid.UUID(str(value))
    except (AttributeError, TypeError, ValueError):
        raise ser.ValidationError({"recordingAssetId": "معرّف أصل التسجيل غير صالح."}) from None
    asset = VideoAsset.objects.filter(pk=asset_id).first()
    if asset is None:
        raise ser.ValidationError({"recordingAssetId": "الأصل المسجل غير موجود."})
    owns_asset = asset.created_by_id == actor.pk and has_perm(actor, "videos.manage_own")
    if not has_perm(actor, "videos.manage_any") and not owns_asset:
        raise services.PermissionDenied("لا تملك صلاحية ربط أصل التسجيل بهذه الجلسة.")
    if asset.status != "ready":
        raise ser.ValidationError({"recordingAssetId": "يجب أن يكون أصل التسجيل جاهزًا للتشغيل."})
    return asset


def _apply(row: CourseLiveSession, data: dict[str, Any], *, partial: bool, actor: Any) -> CourseLiveSession:
    if not partial or "title" in data:
        title = data.get("title", row.title).strip() if isinstance(data.get("title", row.title), str) else ""
        if not title or len(title) > 160:
            raise ser.ValidationError({"title": "أدخل عنوانًا بين حرف واحد و١٦٠ حرفًا."})
        row.title = title
    tz_name = _timezone_name(data.get("timezone") if "timezone" in data else None, row.timezone)
    if "startsAt" in data or not partial:
        row.starts_at = _starts_at(data.get("startsAt"), tz_name)
    if "timezone" in data or not partial:
        row.timezone = tz_name
    if "durationMinutes" in data or not partial:
        row.duration_minutes = _duration(data.get("durationMinutes"), row.duration_minutes if partial else None)
    if "meetUrl" in data:
        row.meet_url = services.validate_live_meet_url(data.get("meetUrl"))
    if "recordingUrl" in data:
        row.recording_url = _https_url(data.get("recordingUrl"), "recordingUrl")
    if "recordingAssetId" in data:
        row.recording_asset = _recording_asset(data.get("recordingAssetId"), actor)
    if "notes" in data:
        notes = data.get("notes") or ""
        if not isinstance(notes, str) or len(notes) > 10_000:
            raise ser.ValidationError({"notes": "الملاحظات طويلة جدًا."})
        row.notes = notes
    if "order" in data:
        if isinstance(data["order"], bool) or not isinstance(data["order"], int) or data["order"] < 0:
            raise ser.ValidationError({"order": "الترتيب غير صالح."})
        row.order = data["order"]
    if "sessionId" in data:
        session_id = data.get("sessionId")
        if not isinstance(session_id, str) or not _SESSION_ID_RE.fullmatch(session_id):
            raise ser.ValidationError({"sessionId": "معرّف الجلسة غير صالح."})
        if CourseLiveSession.objects.filter(course=row.course, session_id=session_id).exclude(pk=row.pk).exists():
            raise ser.ValidationError({"sessionId": "معرّف الجلسة مستخدم من قبل في هذه الدورة."})
        row.session_id = session_id
    if "dateLabel" in data and row.starts_at is None:
        row.date_label = str(data.get("dateLabel") or "")[:60]
    if "timeLabel" in data and row.starts_at is None:
        row.time_label = str(data.get("timeLabel") or "")[:60]
    return row


def _row_or_404(course: Course, session_uuid: Any) -> CourseLiveSession:
    row = CourseLiveSession.objects.select_related("recording_asset").filter(course=course, pk=session_uuid).first()
    if row is None:
        raise services.NotFound("الجلسة غير موجودة.")
    return row


@extend_schema(
    operation_id="studio_live_sessions_global",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_live_sessions(request: Any) -> Response:
    """Read-only aggregate for the instructor's global calendar."""
    items: list[dict[str, Any]] = []
    if has_perm(request.user, "live_sessions.manage_any"):
        courses = Course.objects.all()
    elif has_perm(request.user, "live_sessions.manage_own"):
        courses = Course.objects.filter(
            Q(owner_id=request.user.pk)
            | Q(staff__user_id=request.user.pk, staff__kind__in=OWN_KINDS["live_sessions.manage_own"])
        ).distinct()
    else:
        courses = Course.objects.none()
    sessions = CourseLiveSession.objects.select_related("recording_asset").order_by("starts_at", "order", "session_id")
    courses = courses.order_by("slug").prefetch_related(Prefetch("live_sessions", queryset=sessions, to_attr="_calendar_sessions"))
    for course in courses:
        for row in course._calendar_sessions:
            item = live_session(row, include_private=True)
            item.update({"courseSlug": course.slug, "courseTitle": course.title})
            items.append(item)
    return Response({"items": items})


@extend_schema(
    methods=["GET"],
    operation_id="studio_live_sessions_list",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="studio_live_sessions_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def live_sessions_collection(request: Any, slug: str) -> Response:
    course = _course(slug)
    _can_manage(request.user, course)
    if request.method == "GET":
        rows = course.live_sessions.select_related("recording_asset").order_by("starts_at", "order", "session_id")
        return Response({"items": [live_session(row, include_private=True) for row in rows]})
    data = _body(request)
    row = CourseLiveSession(course=course, session_id=f"live-{uuid.uuid4().hex[:12]}", title="")
    with transaction.atomic():
        _apply(row, data, partial=False, actor=request.user)
        row.full_clean(exclude=["course"])
        row.save()
    emit_live_session_hook(row, "created")
    return Response(live_session(row, include_private=True), status=201)


@extend_schema(
    methods=["GET"],
    operation_id="studio_live_session_retrieve",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PUT"],
    operation_id="studio_live_session_replace",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="studio_live_session_update",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_live_session_delete",
    responses={204: OpenApiResponse(description="The live session was deleted.")},
)
@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def live_session_detail(request: Any, slug: str, session_uuid: Any) -> Response:
    course = _course(slug)
    _can_manage(request.user, course)
    row = _row_or_404(course, session_uuid)
    if request.method == "GET":
        return Response(live_session(row, include_private=True))
    if request.method == "DELETE":
        row.delete()
        emit_live_session_hook(row, "deleted")
        return Response(status=204)
    data = _body(request)
    before = row.starts_at
    with transaction.atomic():
        _apply(row, data, partial=request.method == "PATCH", actor=request.user)
        row.full_clean(exclude=["course"])
        row.save()
    if before != row.starts_at:
        emit_live_session_hook(row, "rescheduled")
    else:
        emit_live_session_hook(row, "updated")
    return Response(live_session(row, include_private=True))


@extend_schema(
    operation_id="studio_live_session_cancel",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_live_session(request: Any, slug: str, session_uuid: Any) -> Response:
    course = _course(slug)
    _can_manage(request.user, course)
    row = _row_or_404(course, session_uuid)
    row.status = CourseLiveSession.STATUS_CANCELLED
    row.state = "past"
    row.save(update_fields=["status", "state"])
    emit_live_session_hook(row, "cancelled")
    return Response(live_session(row, include_private=True))


@extend_schema(
    operation_id="studio_live_session_add_recording",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_live_session_recording(request: Any, slug: str, session_uuid: Any) -> Response:
    course = _course(slug)
    _can_manage(request.user, course)
    row = _row_or_404(course, session_uuid)
    data = _body(request)
    if not data.get("recordingUrl") and not data.get("recordingAssetId"):
        raise ser.ValidationError("أضف رابط التسجيل أو أصلًا مستضافًا.")
    _apply(
        row,
        {key: data[key] for key in ("recordingUrl", "recordingAssetId") if key in data},
        partial=True,
        actor=request.user,
    )
    row.save(update_fields=["recording_url", "recording_asset"])
    emit_live_session_hook(row, "recording_added")
    return Response(live_session(row, include_private=True))
