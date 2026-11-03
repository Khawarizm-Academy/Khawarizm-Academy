"""Private course announcement API handlers."""

from __future__ import annotations

import uuid
from typing import Any

from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.common.errors import InvalidParameter

from . import services
from .serializers import announcement_payload

NO_STORE = "private, no-store"


def _private(data: Any = None, *, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = NO_STORE
    return response


def _uuid(value: Any) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except AttributeError, TypeError, ValueError:
        raise InvalidParameter("معرّف الإعلان غير صالح.", code="invalid_uuid") from None


def _row(slug: str, announcement_id: Any):
    course = services.resolve_course(slug)
    row = services.get_for(course, _uuid(announcement_id))
    return course, row


@extend_schema(
    operation_id="studio_announcement_courses",
    summary="List only courses where the caller can post announcements.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def announcement_courses(request: Any) -> Response:
    courses = services.courses_for_posting(request.user)
    return _private(
        {"items": [{"slug": course.slug, "title": course.title, "status": course.status} for course in courses]}
    )


@extend_schema(
    methods=["GET"],
    operation_id="course_announcements_list",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="course_announcements_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def course_announcements(request: Any, slug: str) -> Response:
    """List enrolled-course announcements or create as authorized course staff."""
    course = services.resolve_course(slug)
    if request.method == "GET":
        services.require_reader(request.user, course)
        return _private({"items": [announcement_payload(row) for row in services.list_for(course)]})
    values = services.validate_create(request.data)
    row = services.create(request.user, course, values)
    return _private(announcement_payload(row), code=status.HTTP_201_CREATED)


@extend_schema(
    methods=["GET"],
    operation_id="course_announcement_retrieve",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PUT"],
    operation_id="course_announcement_replace",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="course_announcement_update",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="course_announcement_delete",
    responses={204: OpenApiResponse(description="The announcement was deleted.")},
)
@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def course_announcement_detail(request: Any, slug: str, announcement_id: Any) -> Response:
    """Read one learner-visible announcement or mutate one as course staff."""
    course, row = _row(slug, announcement_id)
    if request.method == "GET":
        services.require_reader(request.user, course)
        return _private(announcement_payload(row))
    if request.method == "DELETE":
        services.delete(request.user, row)
        return _private(code=status.HTTP_204_NO_CONTENT)
    values = services.validate_update(request.data, partial=request.method == "PATCH")
    row = services.update(request.user, row, values)
    return _private(announcement_payload(row))


@extend_schema(
    operation_id="course_announcement_set_pinned",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_announcement_pin(request: Any, slug: str, announcement_id: Any) -> Response:
    """Pin or unpin an announcement without exposing a separate write model."""
    _course, row = _row(slug, announcement_id)
    if not isinstance(request.data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    pinned = request.data.get("pinned", not row.pinned)
    if not isinstance(pinned, bool):
        raise InvalidParameter("قيمة التثبيت غير صالحة.")
    row = services.set_pinned(request.user, row, pinned)
    return _private(announcement_payload(row))
