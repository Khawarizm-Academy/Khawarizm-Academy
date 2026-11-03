from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.common.errors import InvalidParameter
from features.common.throttling import scoped_throttle

from . import services
from .serializers import review_page_payload, review_payload, studio_page_payload

NO_STORE = "private, no-store"


def _private(data: Any = None, *, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = NO_STORE
    return response


def _review(course_slug: str, review_id: Any):
    course = services.resolve_course(course_slug)
    return course, services._review(course, review_id)


@extend_schema(
    methods=["GET"],
    operation_id="course_reviews_list",
    auth=None,
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY),
        OpenApiParameter("pageSize", OpenApiTypes.INT, OpenApiParameter.QUERY),
        OpenApiParameter("sort", OpenApiTypes.STR, OpenApiParameter.QUERY),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@scoped_throttle("catalog")
def course_reviews(request: Any, slug: str) -> Response:
    """Return the public summary and paged visible reviews for a course."""
    course = services.resolve_course(slug)
    page, page_size, sort = services.parse_page_params(request.query_params)
    result = services.list_reviews(request.user, course, page=page, page_size=page_size, sort=sort)
    return _private(review_page_payload(result))


@extend_schema(
    operation_id="course_review_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def course_review_create(request: Any, slug: str) -> Response:
    course = services.resolve_course(slug)
    row = services.create_review(request.user, course, services.validate_payload(request.data))
    return _private(review_payload(row), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="course_review_update",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def course_review_update(request: Any, slug: str, review_id: Any) -> Response:
    course = services.resolve_course(slug)
    row = services.update_review(
        request.user,
        services._review(course, review_id),
        services.validate_payload(request.data, partial=True),
    )
    return _private(review_payload(row))


@extend_schema(
    operation_id="course_review_reply",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def course_review_reply(request: Any, slug: str, review_id: Any) -> Response:
    _course, row = _review(slug, review_id)
    updated = services.reply_review(request.user, row, services.validate_reply(request.data))
    return _private(review_payload(updated), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="course_review_moderate",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("admin_burst")
def course_review_moderate(request: Any, review_id: Any) -> Response:
    course = services.resolve_course(request.data.get("courseSlug", "")) if isinstance(request.data, dict) else None
    row = services._review_for_id(review_id) if course is None else services._review(course, review_id)
    if not isinstance(request.data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    hidden = request.data.get("hidden", True)
    if not isinstance(hidden, bool):
        raise InvalidParameter("حالة الإخفاء غير صالحة.")
    reason = services._text(request.data.get("reason"), "سبب الإخفاء", 1000, required=hidden)
    updated = services.moderate_review(request.user, row, hidden=hidden, reason=reason)
    return _private(review_payload(updated, include_moderation=True))


@extend_schema(
    operation_id="studio_review_inbox",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def studio_review_inbox(request: Any) -> Response:
    page, page_size, _sort = services.parse_page_params(request.query_params)
    result = services.list_studio_reviews(request.user, page=page, page_size=page_size)
    return _private(studio_page_payload(result))
