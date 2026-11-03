"""Private learner and Studio discussion API handlers."""

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
from .serializers import post_payload, thread_payload

NO_STORE = "private, no-store"


def _private(data: Any = None, *, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = NO_STORE
    return response


def _uuid(value: Any) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (AttributeError, TypeError, ValueError):
        raise InvalidParameter("معرّف النقاش غير صالح.", code="invalid_uuid") from None


@extend_schema(
    methods=["GET"],
    operation_id="course_discussions_list",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="course_discussions_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def course_discussions(request: Any, slug: str) -> Response:
    course = services.resolve_course(slug)
    if request.method == "GET":
        lesson = services.resolve_lesson(course, request.query_params.get("lessonId"))
        rows = services.list_threads(request.user, course, lesson)
        return _private({"items": [thread_payload(row) for row in rows]})
    values = services.validate_thread(request.data)
    row = services.create_thread(request.user, course, values)
    return _private(thread_payload(row), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="course_discussion_detail",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_discussion_detail(request: Any, slug: str, thread_id: Any) -> Response:
    course = services.resolve_course(slug)
    row = services.get_thread(request.user, course, _uuid(thread_id))
    return _private(thread_payload(row))


@extend_schema(
    operation_id="course_discussion_reply",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_discussion_reply(request: Any, slug: str, thread_id: Any) -> Response:
    course = services.resolve_course(slug)
    thread = services.get_thread(request.user, course, _uuid(thread_id))
    post = services.create_post(request.user, thread, services.validate_post(request.data))
    return _private(post_payload(post), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="course_discussion_accept",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_discussion_accept(request: Any, slug: str, thread_id: Any) -> Response:
    course = services.resolve_course(slug)
    thread = services.get_thread(request.user, course, _uuid(thread_id))
    if not isinstance(request.data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    post_id = request.data.get("postId")
    accepted = request.data.get("accepted", True)
    if not isinstance(accepted, bool) or (accepted and not post_id):
        raise InvalidParameter("بيانات الإجابة المعتمدة غير صالحة.")
    row = services.set_accepted(request.user, thread, _uuid(post_id) if post_id else None, accepted)
    return _private(thread_payload(row))


@extend_schema(
    operation_id="course_discussion_moderate",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_discussion_moderate(request: Any, slug: str, thread_id: Any) -> Response:
    course = services.resolve_course(slug)
    thread = services.get_thread(request.user, course, _uuid(thread_id))
    row = services.moderate(request.user, thread, services.validate_moderation(request.data))
    return _private(thread_payload(row))


@extend_schema(
    operation_id="studio_discussions_inbox",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def studio_discussions(request: Any) -> Response:
    rows = services.unanswered_for_staff(request.user)
    return _private({"items": [thread_payload(row, include_posts=False) for row in rows]})
