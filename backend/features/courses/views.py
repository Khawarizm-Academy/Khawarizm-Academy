"""Course detail, problems, related, enroll, progress, and certificate endpoints."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.courses.models import Course, CourseProblem
from features.courses.serializers import course_catalog_item, course_detail, course_problem

NOT_FOUND = {"detail": "الدورة غير موجودة"}


@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).first()
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
    related = Course.objects.filter(slug__in=course.related_ids)
    return Response([course_catalog_item(item) for item in related])


@api_view(["POST"])
def course_enroll_view(request: Any, slug: str) -> Response:
    """Enroll the demo learner; a no-op acknowledgement for now."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response({"enrolled": True, "courseId": course.slug})


@api_view(["POST"])
def course_progress_view(request: Any, slug: str) -> Response:
    """Accept a progress sync; persistence is added when auth lands."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response({"courseId": course.slug, "completedLessonIds": request.data.get("completedLessonIds", [])})


@api_view(["GET"])
def course_certificate_view(request: Any, slug: str) -> Response:
    """Certificate metadata for a completed course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    return Response(
        {
            "courseId": course.slug,
            "courseTitle": course.title,
            "credentialId": f"KHM-2026-{course.slug.upper()}",
            "isOfficial": True,
        }
    )
