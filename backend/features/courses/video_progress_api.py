"""Learner-facing video progress heartbeat API."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.common.schemas import ErrorSerializer
from features.common.throttling import scoped_throttle
from features.courses.models import CourseLesson
from features.courses.video_progress import record_lesson_progress


@extend_schema(
    operation_id="lesson_progress_update",
    summary="Update one enrolled learner's lesson heartbeat.",
    request=OpenApiTypes.OBJECT,
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("lesson_id", OpenApiTypes.STR, OpenApiParameter.PATH),
    ],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Clamped progress and completion state."),
        403: OpenApiResponse(
            response=ErrorSerializer, description="The learner is not enrolled or lacks watch permission."
        ),
    },
)
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
@scoped_throttle("video_progress")
def lesson_progress_update(request: Any, slug: str, lesson_id: str) -> Response:
    """Persist a bounded, monotonic heartbeat without recomputing course totals."""
    lesson = (
        CourseLesson.objects.select_related("module__course", "video_asset")
        .filter(module__course__slug=slug, lesson_id=lesson_id)
        .first()
    )
    if lesson is None:
        from features.common.errors import NotFound

        raise NotFound("الدرس غير موجود.")
    progress = record_lesson_progress(request.user, lesson, request.data)
    response = Response(
        {
            "lessonId": lesson.lesson_id,
            "positionSeconds": progress.position_seconds,
            "durationSeconds": progress.duration_seconds,
            "watchedSeconds": progress.watched_seconds,
            "completed": progress.completed,
            "completedAt": progress.completed_at.isoformat() if progress.completed_at else None,
        }
    )
    response["Cache-Control"] = "private, no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response
