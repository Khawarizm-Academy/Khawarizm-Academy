"""Authenticated instructor Studio video-library and upload handlers.

The parent Studio URL module wires these functions.  This module deliberately
keeps provider session URLs server-side and contains no public playback changes.
"""

from __future__ import annotations

import hashlib
import re
import threading
import uuid
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch, Q, Sum
from django.http import HttpRequest
from django.utils import timezone
from django.utils.text import get_valid_filename
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiRequest,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.services import has_perm
from features.common.choices import VideoStatus
from features.common.errors import (
    Conflict,
    InvalidParameter,
    NotFound,
    PayloadTooLarge,
    PermissionDenied,
    ProviderRequiresPackaging,
    UploadOffsetMismatch,
    UploadSessionExpired,
)
from features.common.messages import INVALID_VIDEO_LINK, UPLOAD_FILE_MISMATCH
from features.videohosting.diagnostics import provider_available, provider_reason
from features.videohosting.models import UploadSession, VideoAsset, VideoProvider, VideoSystemConfig
from features.videohosting.playback_plan import Plan, resolve_playback_plan
from features.videohosting.providers import SPECS, ensure_defaults, spec_for
from features.videohosting.providers.base import ProviderUploadError, ProviderUploadUnavailable
from features.videohosting.services import host_capabilities

PAGE_SIZE = 20
MAX_PAGE = 10_000
ALLOWED_EXTENSIONS = frozenset({"mp4", "mov", "m4v", "webm", "mkv"})
CONTENT_RANGE = re.compile(r"\Abytes ([0-9]+)-([0-9]+)/([0-9]+)\Z")
MP4_MAGIC = b"ftyp"
EBML_MAGIC = b"\x1a\x45\xdf\xa3"


def _setting(name: str, default: int | str) -> int | str:
    return getattr(settings, name, default)


def _chunk_size() -> int:
    return int(_setting("VIDEO_UPLOAD_CHUNK_BYTES", 4 * 1024 * 1024))


def _response(data: Any, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = "private, no-store"
    return response


def _body(request: HttpRequest) -> dict[str, Any]:
    data = request.data
    if not isinstance(data, dict):
        raise InvalidParameter("محتوى الطلب غير صالح.")
    return data


def _required_text(data: dict[str, Any], key: str, limit: int) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise InvalidParameter(f"الحقل {key} مطلوب أو طويل جدًا.", code="invalid_field")
    return value.strip()


def _page(request: HttpRequest) -> int:
    raw = request.query_params.get("page", "1")
    try:
        value = int(raw)
    except TypeError, ValueError:
        raise InvalidParameter("قيمة الصفحة غير صالحة.", code="invalid_page") from None
    if value < 1 or value > MAX_PAGE:
        raise InvalidParameter("قيمة الصفحة خارج النطاق.", code="invalid_page")
    return value


def _provider(code: str) -> tuple[VideoProvider, Any]:
    ensure_defaults()
    row = VideoProvider.objects.filter(code=code).first()
    spec = spec_for(code)
    if row is None or spec is None:
        raise InvalidParameter("المزود المطلوب غير معروف.", code="unknown_provider")
    return row, spec


def _asset_row(asset: VideoAsset, viewer: Any | None = None) -> dict[str, Any]:
    lessons = getattr(asset, "_studio_lessons", None)
    if lessons is None:
        lessons = asset.lessons.select_related("module__course").all()
    pending_upload = None
    if viewer is not None and asset.created_by_id == getattr(viewer, "pk", None):
        pending_sessions = getattr(asset, "_studio_pending_uploads", None)
        if pending_sessions is None:
            pending_sessions = list(asset.upload_sessions.filter(status="pending").order_by("-created_at")[:1])
        if pending_sessions:
            pending_upload = _session_payload(pending_sessions[0])
    return {
        "id": str(asset.pk),
        "slug": asset.slug,
        "title": asset.title,
        "status": asset.status,
        "provider": asset.provider.code if asset.provider_id else None,
        "posterUrl": asset.poster_url,
        "durationSeconds": asset.duration_seconds,
        "sizeBytes": asset.source_size_bytes or 0,
        "viewCount": asset.view_count,
        "progress": asset.progress,
        "playbackMode": asset.playback_mode,
        "protection": asset.protection,
        "errorMessage": asset.error_message[-240:] if asset.error_message else "",
        "pendingUpload": pending_upload,
        "lessonsUsing": [
            {
                "course": lesson.module.course.slug,
                "lesson": lesson.lesson_id,
                "title": lesson.title,
            }
            for lesson in lessons
        ],
        "createdAt": asset.created_at,
        "updatedAt": asset.updated_at,
    }


def _asset_for_id(asset_id: str, user: Any, *, write: bool = True) -> VideoAsset:
    queryset = VideoAsset.objects.select_related("provider")
    try:
        asset = queryset.filter(pk=asset_id).first()
    except TypeError, ValueError, ValidationError:
        asset = None
    asset = asset or queryset.filter(slug=asset_id).first()
    if asset is None:
        raise NotFound("الفيديو غير موجود.")
    allowed = has_perm(user, "videos.manage_any") or (
        has_perm(user, "videos.manage_own") and asset.created_by_id == getattr(user, "pk", None)
    )
    if write and not allowed:
        raise PermissionDenied()
    return asset


def _session(session_id: str, user: Any, *, lock: bool = False) -> UploadSession:
    queryset = UploadSession.objects.select_related("asset", "provider")
    if lock:
        queryset = queryset.select_for_update()
    row = queryset.filter(session_key=session_id).first()
    if row is None:
        raise NotFound("جلسة الرفع غير موجودة.")
    is_owner = row.user_id == getattr(user, "pk", None)
    if not is_owner and not has_perm(user, "videos.manage_any"):
        raise PermissionDenied()
    if row.status == "expired":
        raise UploadSessionExpired()
    return row


def _safe_filename(value: str) -> str:
    filename = get_valid_filename(value.strip())
    if not filename or "." not in filename:
        raise InvalidParameter("اسم الملف غير صالح.", code="invalid_file_name")
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise InvalidParameter("امتداد الفيديو غير مدعوم.", code="invalid_extension")
    return filename


def _sha256(value: Any, *, required: bool = False) -> str:
    if value is None and not required:
        return ""
    if not isinstance(value, str) or re.fullmatch(r"[0-9a-fA-F]{64}", value.strip()) is None:
        raise InvalidParameter("بصمة الملف غير صالحة.", code="invalid_file_fingerprint")
    return value.strip().lower()


def _validate_size(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise InvalidParameter("حجم الملف يجب أن يكون موجبًا.", code="invalid_size")
    maximum = int(_setting("VIDEO_UPLOAD_MAX_BYTES", 2**31))
    if value > maximum:
        raise PayloadTooLarge()
    return value


def _needs_available(spec: Any) -> tuple[bool, str]:
    if not provider_available(spec.code):
        return False, provider_reason(spec.code) or "المزود غير متاح حاليًا."
    host = host_capabilities()
    for need in spec.needs:
        if need == "ffmpeg" and not host.get("ffmpeg"):
            return False, "هذا المزود يحتاج FFmpeg."
        if need == "persistent_host" and not host.get("persistentHost"):
            return False, "هذا المزود يحتاج خادمًا دائمًا."
    if spec.upload is not None and not spec.upload.spool_ready():
        return False, "اضبط VIDEO_SPOOL_DIR على مجلد دائم قابل للكتابة."
    return True, ""


def _plan(spec: Any, requested: str | None, provider_row: VideoProvider) -> Plan:
    if requested not in (None, "auto", "always", "never"):
        raise InvalidParameter("خيار التغليف غير صالح.", code="invalid_packaging")
    return resolve_playback_plan(
        spec,
        requested,
        host_capabilities(),
        VideoSystemConfig.get_instance(),
        provider_row,
    )


def _packaging_options(spec: Any, provider_row: VideoProvider, effective: Plan) -> dict[str, Any]:
    """Describe only packaging outcomes the server can accept for this provider."""
    packaged = _plan(spec, "always", provider_row)
    direct = _plan(spec, "never", provider_row)
    allow_package = packaged.mode != "refused" and packaged.package
    allow_direct = direct.mode != "refused" and not direct.package
    return {
        "allowPackage": allow_package,
        "allowDirect": allow_direct,
        "allowOverride": allow_package and allow_direct,
        "effective": "package" if effective.package else "direct",
    }


def _protection(mode: str) -> str:
    return {"hls": "encrypted", "raw": "gated", "embed": "none", "external": "none"}.get(mode, "")


def _session_payload(row: UploadSession) -> dict[str, Any]:
    return {
        "sessionId": row.session_key,
        "chunkSize": row.chunk_size,
        "offset": row.bytes_uploaded,
        "total": row.total_bytes,
        "status": row.status,
        "progress": row.progress,
        "fileName": row.file_name,
        "firstChunkSha256": row.source_sha256_partial,
    }


@extend_schema_view(
    get=extend_schema(
        operation_id="studio_video_library",
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Video library page.")},
    ),
    post=extend_schema(
        operation_id="studio_video_create",
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Created video asset.")},
    ),
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def studio_videos(request: HttpRequest) -> Response:
    if request.method == "POST":
        return _create_video_impl(request)
    if not has_perm(request.user, "videos.manage_own"):
        raise PermissionDenied()
    scope = request.query_params.get("scope", "own")
    if scope not in {"own", "all"}:
        raise InvalidParameter("النطاق غير صالح.", code="invalid_scope")
    if scope == "all" and not has_perm(request.user, "videos.manage_any"):
        raise PermissionDenied()
    queryset = VideoAsset.objects.select_related("provider").prefetch_related(
        "lessons__module__course",
        Prefetch(
            "upload_sessions",
            queryset=UploadSession.objects.filter(status="pending").order_by("-created_at"),
            to_attr="_studio_pending_uploads",
        ),
    )
    if scope == "own":
        queryset = queryset.filter(created_by=request.user)
    if request.query_params.get("status"):
        requested_status = request.query_params["status"]
        if requested_status not in {choice.value for choice in VideoStatus}:
            raise InvalidParameter("حالة الفيديو غير صالحة.", code="invalid_status")
        queryset = queryset.filter(status=requested_status)
    if request.query_params.get("provider"):
        queryset = queryset.filter(provider__code=request.query_params["provider"])
    query = request.query_params.get("q", "").strip()
    if len(query) > 100:
        raise InvalidParameter("عبارة البحث طويلة جدًا.", code="search_too_long")
    if query:
        queryset = queryset.filter(Q(title__icontains=query) | Q(slug__icontains=query))
    sort = request.query_params.get("sort", "newest")
    ordering = {
        "newest": ("-created_at", "-pk"),
        "oldest": ("created_at", "pk"),
        "title": ("title", "-created_at"),
        "views": ("-view_count", "-created_at"),
        "progress": ("-progress", "-updated_at"),
    }.get(sort)
    if ordering is None:
        raise InvalidParameter("ترتيب الفيديو غير صالح.", code="invalid_sort")
    total = queryset.count()
    page = _page(request)
    rows = list(queryset.order_by(*ordering)[(page - 1) * PAGE_SIZE : page * PAGE_SIZE])
    for row in rows:
        row._studio_lessons = list(row.lessons.all())
    return _response(
        {
            "results": [_asset_row(row, request.user) for row in rows],
            "total": total,
            "page": page,
            "pageSize": PAGE_SIZE,
        }
    )


@extend_schema(
    operation_id="studio_video_providers",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Available video providers.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def studio_video_providers(request: HttpRequest) -> Response:
    if not has_perm(request.user, "studio.access"):
        raise PermissionDenied()
    ensure_defaults()
    rows = []
    for row in VideoProvider.objects.all():
        spec = spec_for(row.code)
        if spec is None:
            continue
        available, reason = _needs_available(spec)
        plan = _plan(spec, None, row)
        packaging_options = _packaging_options(spec, row, plan)
        rows.append(
            {
                "code": row.code,
                "name": row.name,
                "kind": spec.kind,
                "needs": sorted(spec.needs),
                "available": available and plan.mode != "refused",
                "reason": reason or ("المزود يحتاج التغليف قبل الرفع." if plan.mode == "refused" else ""),
                "packagingPolicy": row.packaging_policy,
                "effectivePlan": "سيُغلَّف بـ FFmpeg" if plan.package else "سيُشغَّل مباشرةً بدون تغليف",
                "packagingOptions": packaging_options,
            }
        )
    return _response(rows)


def _create_video_impl(request: HttpRequest) -> Response:
    if not has_perm(request.user, "videos.upload"):
        raise PermissionDenied()
    data = _body(request)
    title = _required_text(data, "title", 200)
    code = _required_text(data, "provider", 32)
    row, spec = _provider(code)
    if spec.kind != "storage":
        raise InvalidParameter("استخدم مسار الرابط لهذا المزود.", code="link_provider")
    available, reason = _needs_available(spec)
    if not available:
        raise InvalidParameter(reason, code="provider_unavailable")
    requested = data.get("packaging", "auto")
    _plan(spec, requested, row)
    asset = VideoAsset.objects.create(
        slug=f"studio-{uuid.uuid4().hex}",
        title=title,
        provider=row,
        created_by=request.user,
        status=VideoStatus.UPLOADING,
        protection="",
        stage=f"packaging:{requested}",
    )
    return _response(_asset_row(asset), status.HTTP_201_CREATED)


@extend_schema(operation_id="studio_video_create")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def studio_video_create(request: HttpRequest) -> Response:
    return _create_video_impl(request)


@extend_schema(
    operation_id="studio_video_link_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Created linked video asset.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def studio_video_link_create(request: HttpRequest) -> Response:
    if not has_perm(request.user, "videos.use_embed"):
        raise PermissionDenied()
    data = _body(request)
    title = _required_text(data, "title", 200)
    url = _required_text(data, "url", 500)
    reference = None
    selected = None
    for spec in SPECS:
        if spec.kind == "link" and spec.parse_reference is not None:
            parsed = spec.parse_reference(url)
            if parsed is not None:
                reference, selected = parsed, spec
                break
    if reference is None or selected is None:
        raise InvalidParameter(INVALID_VIDEO_LINK, code="invalid_video_link")
    row, _ = _provider(selected.code)
    mode = "external" if selected.code == "external" else "embed"
    canonical = reference[2]
    external_id = reference[1]
    asset = VideoAsset.objects.create(
        slug=f"studio-{uuid.uuid4().hex}",
        title=title,
        provider=row,
        created_by=request.user,
        external_ref=external_id if mode == "embed" else canonical,
        status=VideoStatus.READY,
        playback_mode=mode,
        protection="none",
    )
    return _response(_asset_row(asset), status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_upload_init",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Initialized upload session.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def studio_upload_init(request: HttpRequest, asset_id: str) -> Response:
    if not has_perm(request.user, "videos.upload"):
        raise PermissionDenied()
    asset = _asset_for_id(asset_id, request.user)
    data = _body(request)
    original_filename = _required_text(data, "fileName", 255)
    filename = _safe_filename(original_filename)
    size = _validate_size(data.get("sizeBytes"))
    mime_type = _required_text(data, "mimeType", 60)
    first_chunk_sha256 = _sha256(data.get("firstChunkSha256"))
    if asset.provider_id is None:
        raise InvalidParameter("للفيديو مزود مطلوب.", code="provider_required")
    provider_row, spec = _provider(asset.provider.code)
    available, reason = _needs_available(spec)
    if not available:
        raise InvalidParameter(reason, code="provider_unavailable")
    requested = (
        asset.upload_sessions.filter(status="pending")
        .order_by("-created_at")
        .values_list("metadata", flat=True)
        .first()
        or {}
    ).get("packaging", "auto")
    plan = _plan(spec, requested, provider_row)
    if plan.mode == "refused":
        raise ProviderRequiresPackaging()
    if not has_perm(request.user, "videos.manage_any"):
        used = (
            VideoAsset.objects.filter(created_by=request.user).aggregate(total=Sum("source_size_bytes"))["total"] or 0
        )
        pending = (
            UploadSession.objects.filter(user=request.user, status="pending").aggregate(total=Sum("total_bytes"))[
                "total"
            ]
            or 0
        )
        if used + pending + size > int(_setting("VIDEO_USER_QUOTA_BYTES", 20 * 1024**3)):
            raise PayloadTooLarge()
    upload = spec.upload
    if upload is None or upload.start_session is None:
        raise InvalidParameter("المزود لا يدعم الرفع.", code="unsupported_upload_provider")
    session_key = uuid.uuid4().hex
    try:
        started = upload.start_session(filename, mime_type, size, session_key)
    except ProviderUploadUnavailable as exc:
        raise InvalidParameter(str(exc), code="provider_unavailable") from exc
    metadata: dict[str, Any] = {"packaging": data.get("packaging", "auto"), **started.metadata}
    session = UploadSession.objects.create(
        asset=asset,
        provider=provider_row,
        user=request.user,
        session_key=session_key,
        status="pending",
        file_name=original_filename,
        mime_type=mime_type,
        source_sha256_partial=first_chunk_sha256,
        upload_uri=started.upload_uri,
        total_bytes=size,
        chunk_size=_chunk_size(),
        metadata=metadata,
    )
    return _response(
        {
            "sessionId": session.session_key,
            "chunkSize": session.chunk_size,
            "offset": 0,
            "total": session.total_bytes,
            "fileName": session.file_name,
            "firstChunkSha256": session.source_sha256_partial,
        },
        status.HTTP_201_CREATED,
    )


def _magic_ok(filename: str, chunk: bytes) -> bool:
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension in {"mp4", "mov", "m4v"}:
        return len(chunk) >= 8 and chunk[4:8] == MP4_MAGIC
    return chunk.startswith(EBML_MAGIC)


def _range(request: HttpRequest, body: bytes, total: int) -> tuple[int, int]:
    raw = request.headers.get("Content-Range", "")
    match = CONTENT_RANGE.fullmatch(raw)
    if match is None:
        raise InvalidParameter("Content-Range غير صالح.", code="invalid_content_range")
    start, end, declared_total = (int(part) for part in match.groups())
    if declared_total != total or end < start or end - start + 1 != len(body):
        raise InvalidParameter("نطاق المقطع لا يطابق محتواه.", code="invalid_content_range")
    if len(body) > _chunk_size() or (end >= total and end + 1 != total):
        raise InvalidParameter("حجم أو نطاق المقطع غير صالح.", code="invalid_chunk")
    return start, end


@extend_schema(
    operation_id="studio_upload_chunk",
    request={"application/octet-stream": OpenApiRequest(OpenApiTypes.BINARY)},
    parameters=[
        OpenApiParameter(
            "Content-Range",
            OpenApiTypes.STR,
            OpenApiParameter.HEADER,
            required=True,
            description="Byte range in the form `bytes start-end/total`.",
        ),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Updated upload offset.")},
)
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def studio_upload_chunk(request: HttpRequest, session_id: str) -> Response:
    with transaction.atomic():
        session = _session(session_id, request.user, lock=True)
        if session.status == "complete":
            return _response({"offset": session.total_bytes, "complete": True})
        body = bytes(request.body or b"")
        start, _end = _range(request, body, session.total_bytes)
        if start == 0:
            first_chunk_sha256 = hashlib.sha256(body).hexdigest()
            if session.source_sha256_partial and session.source_sha256_partial != first_chunk_sha256:
                raise InvalidParameter(UPLOAD_FILE_MISMATCH, code="upload_file_mismatch")
        spec = spec_for(session.provider.code)
        upload = spec.upload if spec is not None else None
        if upload is None or upload.write_chunk is None:
            raise InvalidParameter("المزود لا يدعم الرفع.", code="unsupported_upload_provider")
        true_offset = int(session.bytes_uploaded)
        try:
            if upload.probe_offset is not None:
                probed = upload.probe_offset(session)
                true_offset = probed.next_offset
                if true_offset != session.bytes_uploaded:
                    session.bytes_uploaded = true_offset
                    session.save(update_fields=["bytes_uploaded", "updated_at"])
        except ProviderUploadUnavailable as exc:
            raise InvalidParameter(str(exc), code="provider_unavailable") from exc
        if start < true_offset and start + len(body) <= true_offset:
            return _response({"offset": true_offset, "complete": true_offset == session.total_bytes})
        if start != true_offset:
            raise UploadOffsetMismatch(true_offset)
        if true_offset == 0 and not _magic_ok(session.file_name, body):
            raise InvalidParameter("صيغة الفيديو لا تطابق امتداد الملف.", code="invalid_video_magic")
        if start == 0 and not session.source_sha256_partial:
            session.source_sha256_partial = first_chunk_sha256
            session.save(update_fields=["source_sha256_partial", "updated_at"])
        try:
            result = upload.write_chunk(session, body, start)
        except Exception:
            if upload.probe_offset is None:
                raise
            probed = upload.probe_offset(session)
            if probed.next_offset != start:
                session.bytes_uploaded = probed.next_offset
                session.save(update_fields=["bytes_uploaded", "updated_at"])
                if probed.next_offset < session.total_bytes:
                    raise UploadOffsetMismatch(probed.next_offset) from None
                return _response({"offset": probed.next_offset, "complete": True})
            raise
        next_offset = result.next_offset
        if next_offset < start or next_offset > session.total_bytes:
            raise Conflict("أعاد المزود إزاحة رفع غير صالحة.")
        if result.file_id:
            session.metadata = {**session.metadata, "fileId": result.file_id}
        session.bytes_uploaded = next_offset
        session.progress = (
            100 if next_offset == session.total_bytes else min(99, int(next_offset * 100 / session.total_bytes))
        )
        session.save(update_fields=["bytes_uploaded", "progress", "metadata", "updated_at"])
        return _response({"offset": next_offset, "complete": next_offset == session.total_bytes})


@extend_schema_view(
    get=extend_schema(
        operation_id="studio_upload_status",
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Upload session status.")},
    ),
    delete=extend_schema(
        operation_id="studio_upload_cancel",
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Cancelled upload session.")},
    ),
)
@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def studio_upload_status(request: HttpRequest, session_id: str) -> Response:
    if request.method == "DELETE":
        return studio_upload_cancel(request, session_id)
    return _response(_session_payload(_session(session_id, request.user)))


@extend_schema(
    operation_id="studio_upload_complete",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Completed video asset.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def studio_upload_complete(request: HttpRequest, session_id: str) -> Response:
    with transaction.atomic():
        session = _session(session_id, request.user, lock=True)
        if session.status in {"complete", "processing"}:
            return _response(_asset_row(session.asset))
        if session.bytes_uploaded != session.total_bytes:
            raise InvalidParameter("لم يكتمل رفع كل بايتات الملف.", code="upload_incomplete")
        data = _body(request)
        duration = data.get("durationSeconds")
        if duration is not None and (
            isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration < 0 or duration > 43_200
        ):
            raise InvalidParameter("مدة الفيديو غير صالحة.", code="invalid_duration")
        asset = VideoAsset.objects.select_related("provider").get(pk=session.asset_id)
        spec = spec_for(session.provider.code)
        upload = spec.upload if spec is not None else None
        if spec is None:
            raise InvalidParameter("المزود غير معروف.", code="unknown_provider")
        if upload is None or upload.complete is None:
            raise InvalidParameter("المزود لا يدعم الرفع.", code="unsupported_upload_provider")
        requested = (session.metadata or {}).get("packaging") or (
            asset.stage.removeprefix("packaging:") if asset.stage.startswith("packaging:") else "auto"
        )
        plan = _plan(spec, requested, session.provider)
        if plan.mode == "refused":
            raise ProviderRequiresPackaging()
        try:
            completion = upload.complete(session, asset, plan)
        except ProviderUploadUnavailable as exc:
            raise InvalidParameter(str(exc), code="provider_unavailable") from exc
        except ProviderUploadError as exc:
            raise InvalidParameter(str(exc), code="provider_completion_failed") from exc
        update_fields = list(completion.asset_updates)
        for field_name, value in completion.asset_updates.items():
            setattr(asset, field_name, value)
        if update_fields:
            asset.save(update_fields=[*update_fields, "updated_at"])
        if duration is not None:
            asset.duration_seconds = min(43_200, int(duration))
            asset.save(update_fields=["duration_seconds", "updated_at"])
        session.status = completion.session_status
        session.progress = completion.session_progress
        session.save(update_fields=["status", "progress", "updated_at"])
        if completion.background is not None:
            threading.Thread(target=completion.background, daemon=True).start()
        return _response(_asset_row(asset))


@extend_schema(operation_id="studio_upload_cancel")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def studio_upload_cancel(request: HttpRequest, session_id: str) -> Response:
    with transaction.atomic():
        session = _session(session_id, request.user, lock=True)
        if session.status == "cancelled":
            return _response({"status": "cancelled"})
        spec = spec_for(session.provider.code)
        upload = spec.upload if spec is not None else None
        if upload is not None and upload.cancel is not None:
            upload.cancel(session)
        VideoAsset.objects.filter(pk=session.asset_id).update(
            status=VideoStatus.ERROR,
            error_message="cancelled",
            updated_at=timezone.now(),
        )
        session.status = "cancelled"
        session.error_message = "cancelled"
        session.save(update_fields=["status", "error_message", "updated_at"])
        return _response({"status": "cancelled"})


# Parent URL wiring may use the shorter names from the API surface.
videos = studio_videos
video_providers = studio_video_providers
create_video = studio_video_create
create_link = studio_video_link_create
init_upload = studio_upload_init
upload_chunk = studio_upload_chunk
upload_status = studio_upload_status
complete_upload = studio_upload_complete
cancel_upload = studio_upload_cancel
