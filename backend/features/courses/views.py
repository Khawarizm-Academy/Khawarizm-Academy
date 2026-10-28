"""Course views — thin handlers over the service.

Each one resolves the caller/row, calls one service function, serializes.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Prefetch
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers as ser
from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.common.errors import NotFound
from features.common.messages import COURSE_NOT_FOUND
from features.courses import services
from features.courses.models import Course, CourseModule, CourseProblem
from features.courses.serializers import course_detail, course_problem

# The landing record walks course -> modules -> lessons + live sessions; the
# prefetch keeps it at a constant 4 queries however many modules exist.
DETAIL_PREFETCH = (
    Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lessons")),
    "live_sessions",
)

# The progress sync's body — the service reads `progress`, `lastLesson`,
# `isCompleted`, and echoes `completedLessonIds` back.
inline_progress = inline_serializer(
    "CourseProgressRequest",
    fields={
        "progress": ser.IntegerField(required=False),
        "lastLesson": ser.CharField(required=False, allow_blank=True),
        "isCompleted": ser.BooleanField(required=False),
        "completedLessonIds": ser.ListField(child=ser.CharField(), required=False),
    },
)


@extend_schema(
    operation_id="course_detail",
    summary="The full landing record for one course.",
    description="Modules, lessons, and live sessions in one payload (constant 4 queries via prefetch).",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The CourseDetail shape.")},
)
@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).prefetch_related(*DETAIL_PREFETCH).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    return Response(course_detail(course))


def _problems_payload() -> dict[str, list[dict[str, Any]]]:
    """The practice set, reused by both problem routes."""
    problems = CourseProblem.objects.prefetch_related("options").all()
    return {"items": [course_problem(problem) for problem in problems]}


@extend_schema(
    operation_id="problems_list",
    summary="The shared practice problem set.",
    auth=None,
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{items: [CourseProblem]}` — problem + options."
        ),
    },
)
@api_view(["GET"])
def problems_list(request: Any) -> Response:
    """The shared practice problem set (not scoped to a course yet)."""
    return Response(_problems_payload())


@extend_schema(
    operation_id="course_problems",
    summary="The practice problem set for a course.",
    description="Shared with the global set today — the route exists so scoping stays URL-addressable.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [CourseProblem]}`"),
    },
)
@api_view(["GET"])
def course_problems_view(request: Any, slug: str) -> Response:
    """The practice problem set for a course (shared today)."""
    return Response(_problems_payload())


@extend_schema(
    operation_id="course_related",
    summary="Related course cards for the landing rail.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{items: [CatalogItem]}` — compact course cards."
        ),
    },
)
@api_view(["GET"])
def course_related_view(request: Any, slug: str) -> Response:
    """Related course cards for the landing rail."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    return Response({"items": services.related_for(course)})


@extend_schema(
    operation_id="course_enroll",
    summary="Enroll the signed-in learner in a course.",
    request=None,
    description="The enrollment counter moves inside the transaction; the catalog version bumps on commit only. "
    "Visitors get the same acknowledgement — the SPA gates the button.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{enrolled: true, courseId}`")},
)
@api_view(["POST"])
def course_enroll_view(request: Any, slug: str) -> Response:
    """Enroll the signed-in learner; anonymous callers get the plain acknowledgement."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    if request.user.is_authenticated:
        services.enroll(request.user, course)
    return Response({"enrolled": True, "courseId": course.slug})


@extend_schema(
    operation_id="course_progress",
    summary="Persist a progress sync for a course.",
    description="Signed-in callers save; visitors get their payload echoed back.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    request=inline_progress,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{courseId, completedLessonIds}`"),
    },
)
@api_view(["POST"])
def course_progress_view(request: Any, slug: str) -> Response:
    """Persist a progress sync for the signed-in learner, or echo it back for a visitor."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    completed = request.data.get("completedLessonIds", [])
    if request.user.is_authenticated:
        services.save_progress(request.user, course, request.data)
    return Response({"courseId": course.slug, "completedLessonIds": completed})


@extend_schema(
    operation_id="course_favorite",
    summary="Toggle a course in the learner's favorites.",
    request=None,
    description="Visitors get `{favorited: false, requiresAuth: true}` instead of an error.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{favorited, courseId}` (+ `requiresAuth` for visitors)"
        ),
    },
)
@api_view(["POST"])
def course_favorite_view(request: Any, slug: str) -> Response:
    """Toggle a course in the learner's favorites; a visitor gets a sign-in hint."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    if not request.user.is_authenticated:
        return Response({"favorited": False, "requiresAuth": True})
    favorited = services.toggle_favorite(request.user, course)
    return Response({"favorited": favorited, "courseId": course.slug})


@extend_schema(
    operation_id="course_certificate",
    summary="Certificate metadata for a completed course.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{courseId, courseTitle, credentialId, isOfficial}`"
        ),
    },
)
@api_view(["GET"])
def course_certificate_view(request: Any, slug: str) -> Response:
    """Certificate metadata for a completed course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    return Response(services.certificate_payload(course))
