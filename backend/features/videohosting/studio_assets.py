"""Instructor Studio actions for editing, captioning, and deleting video assets.

These handlers deliberately expose only catalog metadata. Provider URLs, upload
session URIs, and credentials remain server-side in the upload/provider modules.
"""

from __future__ import annotations

import re
from typing import Any

from django.core.validators import URLValidator
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.services import has_perm
from features.common.choices import CourseStatus
from features.common.errors import AssetInUse, InvalidParameter, NotFound, PermissionDenied
from features.common.messages import INVALID_CAPTION, VIDEO_NOT_FOUND
from features.courses.models import CourseLesson
from features.videohosting.models import VideoAsset, VideoCaption

_MAX_VTT_BYTES = 512 * 1024
_LANGUAGE_RE = re.compile(r"^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$")
_WEBVTT_HEADER_RE = re.compile(r"^WEBVTT(?:[ \t].*)?$")
_URL_VALIDATOR = URLValidator(schemes=("http", "https"))


def _response(data: Any = None, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = "private, no-store"
    return response


def _payload(request: HttpRequest) -> dict[str, Any]:
    data = request.data
    if not isinstance(data, dict):
        raise InvalidParameter("محتوى الطلب غير صالح.")
    return data


def _reject_unknown(data: dict[str, Any], allowed: set[str]) -> None:
    unknown = set(data) - allowed
    if unknown:
        raise InvalidParameter("توجد حقول غير معروفة في الطلب.", code="unknown_field")


def _asset(asset_id: str, actor: Any, *, lock: bool = False) -> VideoAsset:
    queryset = VideoAsset.objects.select_related("provider")
    if lock:
        queryset = queryset.select_for_update()
    # Slugs are the stable frontend IDs; UUIDs are also accepted by Studio's
    # upload routes.  Resolve the slug first so arbitrary unknown strings do
    # not get sent through UUIDField's converter.
    row = queryset.filter(slug=asset_id).first()
    if row is None:
        try:
            row = queryset.filter(pk=asset_id).first()
        except TypeError, ValueError:
            row = None
    if row is None:
        raise NotFound(VIDEO_NOT_FOUND)
    if not has_perm(actor, "videos.manage_own"):
        raise PermissionDenied()
    if not has_perm(actor, "videos.manage_any") and row.created_by_id != getattr(actor, "pk", None):
        raise PermissionDenied()
    return row


def _text(value: Any, field: str, maximum: int, *, allow_blank: bool = False) -> str:
    if not isinstance(value, str):
        raise InvalidParameter(f"الحقل {field} غير صالح.", code="invalid_field")
    value = value.strip()
    if (not allow_blank and not value) or len(value) > maximum:
        raise InvalidParameter(f"الحقل {field} غير صالح.", code="invalid_field")
    return value


def _poster(value: Any) -> str:
    if not isinstance(value, str):
        raise InvalidParameter("الحقل posterUrl غير صالح.", code="invalid_field")
    value = value.strip()
    if not value:
        return ""
    try:
        _URL_VALIDATOR(value)
    except Exception as exc:
        raise InvalidParameter("الحقل posterUrl غير صالح.", code="invalid_field") from exc
    if len(value) > 400:
        raise InvalidParameter("الحقل posterUrl غير صالح.", code="invalid_field")
    return value


def _language(value: Any) -> str:
    value = _text(value, "language", 12)
    if not _LANGUAGE_RE.fullmatch(value):
        raise InvalidParameter("لغة الترجمة غير صالحة.", code="invalid_language")
    return value


def _vtt(value: Any) -> str:
    if not isinstance(value, str):
        raise InvalidParameter(INVALID_CAPTION, code="invalid_caption")
    try:
        encoded = value.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise InvalidParameter(INVALID_CAPTION, code="invalid_caption") from exc
    if len(encoded) > _MAX_VTT_BYTES:
        raise InvalidParameter(INVALID_CAPTION, code="caption_too_large")
    first_line = value.splitlines()[0] if value.splitlines() else ""
    if _WEBVTT_HEADER_RE.fullmatch(first_line) is None:
        raise InvalidParameter(INVALID_CAPTION, code="invalid_caption")
    return value


def _asset_payload(asset: VideoAsset) -> dict[str, Any]:
    """Return editable metadata only; never include provider addressing."""
    return {
        "id": str(asset.pk),
        "slug": asset.slug,
        "title": asset.title,
        "posterUrl": asset.poster_url,
    }


def _caption_payload(caption: VideoCaption) -> dict[str, Any]:
    return {
        "id": str(caption.pk),
        "language": caption.language,
        "label": caption.label,
        "isDefault": caption.is_default,
    }


def _published_links(asset: VideoAsset) -> list[dict[str, Any]]:
    lessons = (
        CourseLesson.objects.select_related("module__course")
        .filter(video_asset_id=asset.pk, module__course__status=CourseStatus.PUBLISHED)
        .order_by("module__course__slug", "module__order", "order", "lesson_id")
    )
    return [
        {
            "course": {
                "id": str(lesson.module.course.pk),
                "slug": lesson.module.course.slug,
                "title": lesson.module.course.title,
            },
            "lesson": {"id": lesson.lesson_id, "title": lesson.title},
        }
        for lesson in lessons
    ]


def _update_impl(request: HttpRequest, asset_id: str) -> Response:
    asset = _asset(asset_id, request.user)
    data = _payload(request)
    _reject_unknown(data, {"title", "posterUrl"})
    if "title" in data:
        asset.title = _text(data["title"], "title", 200)
    if "posterUrl" in data:
        asset.poster_url = _poster(data["posterUrl"])
    if not data:
        raise InvalidParameter("أرسل عنوانًا أو صورة غلاف لتعديل الفيديو.", code="empty_patch")
    fields = []
    if "title" in data:
        fields.append("title")
    if "posterUrl" in data:
        fields.append("poster_url")
    asset.save(update_fields=[*fields, "updated_at"])
    return _response(_asset_payload(asset))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def studio_video_update(request: HttpRequest, asset_id: str) -> Response:
    """Update the title and/or poster for an owned Studio video."""
    return _update_impl(request, asset_id)


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Created caption track.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def studio_video_caption_create(request: HttpRequest, asset_id: str) -> Response:
    """Create one WebVTT track, replacing the previous default atomically."""
    with transaction.atomic():
        asset = _asset(asset_id, request.user, lock=True)
        data = _payload(request)
        required = {"language", "label", "isDefault", "vtt"}
        _reject_unknown(data, required)
        if set(data) != required:
            raise InvalidParameter("حقول الترجمة الأربعة مطلوبة.", code="missing_field")
        language = _language(data["language"])
        label = _text(data["label"], "label", 60)
        if type(data["isDefault"]) is not bool:
            raise InvalidParameter("الحقل isDefault يجب أن يكون منطقيًا.", code="invalid_field")
        vtt = _vtt(data["vtt"])
        if VideoCaption.objects.filter(asset=asset, language__iexact=language).exists():
            raise InvalidParameter("لغة الترجمة مستخدمة بالفعل.", code="duplicate_language")
        if data["isDefault"]:
            VideoCaption.objects.filter(asset=asset, is_default=True).update(is_default=False)
        try:
            caption = VideoCaption.objects.create(
                asset=asset,
                language=language,
                label=label,
                is_default=data["isDefault"],
                vtt=vtt,
            )
        except IntegrityError as exc:
            raise InvalidParameter("لغة الترجمة مستخدمة بالفعل.", code="duplicate_language") from exc
    return _response(_caption_payload(caption), status.HTTP_201_CREATED)


@extend_schema(
    request=None,
    responses={204: OpenApiResponse(description="Deleted caption track.")},
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def studio_video_caption_delete(request: HttpRequest, asset_id: str, language: str) -> Response:
    """Delete one language track from an owned Studio video."""
    with transaction.atomic():
        asset = _asset(asset_id, request.user, lock=True)
        language = _language(language)
        caption = VideoCaption.objects.filter(asset=asset, language__iexact=language).first()
        if caption is None:
            raise NotFound("الترجمة غير موجودة.")
        caption.delete()
    return _response(None, status.HTTP_204_NO_CONTENT)


def _delete_impl(request: HttpRequest, asset_id: str) -> Response:
    with transaction.atomic():
        asset = _asset(asset_id, request.user, lock=True)
        links = _published_links(asset)
        if links:
            raise AssetInUse(links)
        # Local import keeps this action usable while cleanup implementations are
        # developed independently and snapshots provider references before CASCADE.
        from features.videohosting import remote_cleanup

        remote_cleanup.schedule_remote_delete(asset, actor=request.user, request=request)
        asset.delete()
    return _response(None, status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def studio_video_delete(request: HttpRequest, asset_id: str) -> Response:
    """Delete an unlinked asset and schedule its provider objects for cleanup."""
    return _delete_impl(request, asset_id)


@extend_schema_view(
    patch=extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Updated video asset.")},
    ),
    delete=extend_schema(
        request=None,
        responses={204: OpenApiResponse(description="Deleted video asset.")},
    ),
)
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def studio_video_detail(request: HttpRequest, asset_id: str) -> Response:
    """Combined route handler for the same asset path's PATCH and DELETE methods."""
    if request.method == "PATCH":
        return _update_impl(request, asset_id)
    return _delete_impl(request, asset_id)


# Descriptive aliases for URL modules that prefer action-oriented names.
studio_video_patch = studio_video_update
studio_caption_create = studio_video_caption_create
studio_caption_delete = studio_video_caption_delete
