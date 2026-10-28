"""Course views — thin handlers over the service.

Each one resolves the caller/row, calls one service function, serializes.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Prefetch
from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.courses import services
from features.courses.models import Course, CourseModule, CourseProblem
from features.courses.serializers import course_detail, course_problem

NOT_FOUND = {"detail": "الدورة غير موجودة"}

# The landing record walks course -> modules -> lessons + live sessions; the
# prefetch keeps it at a constant 4 queries however many modules exist.
DETAIL_PREFETCH = (
    Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lessons")),
    "live_sessions",
)


@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).prefetch_related(*DETAIL_PREFETCH).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(course_detail(course))


def _problems_payload() -> list[dict[str, Any]]:
    """The practice set, reused by both problem routes."""
    problems = CourseProblem.objects.prefetch_related("options").all()
    return [course_problem(problem) for problem in problems]


@api_view(["GET"])
def problems_list(request: Any) -> Response:
    """The shared practice problem set (not scoped to a course yet)."""
    return Response(_problems_payload())


@api_view(["GET"])
def course_problems_view(request: Any, slug: str) -> Response:
    """The practice problem set for a course (shared today)."""
    return Response(_problems_payload())


@api_view(["GET"])
def course_related_view(request: Any, slug: str) -> Response:
    """Related course cards for the landing rail."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(services.related_for(course))


@api_view(["POST"])
def course_enroll_view(request: Any, slug: str) -> Response:
    """Enroll the signed-in learner; anonymous callers get the plain acknowledgement."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    if request.user.is_authenticated:
        services.enroll(request.user, course)
    return Response({"enrolled": True, "courseId": course.slug})


@api_view(["POST"])
def course_progress_view(request: Any, slug: str) -> Response:
    """Persist a progress sync for the signed-in learner, or echo it back for a visitor."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    completed = request.data.get("completedLessonIds", [])
    if request.user.is_authenticated:
        services.save_progress(request.user, course, request.data)
    return Response({"courseId": course.slug, "completedLessonIds": completed})


@api_view(["POST"])
def course_favorite_view(request: Any, slug: str) -> Response:
    """Toggle a course in the learner's favorites; a visitor gets a sign-in hint."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    if not request.user.is_authenticated:
        return Response({"favorited": False, "requiresAuth": True})
    favorited = services.toggle_favorite(request.user, course)
    return Response({"favorited": favorited, "courseId": course.slug})


@api_view(["GET"])
def course_certificate_view(request: Any, slug: str) -> Response:
    """Certificate metadata for a completed course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(services.certificate_payload(course))
