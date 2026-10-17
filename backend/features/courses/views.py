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
    """Enroll the signed-in learner; anonymous callers get the plain acknowledgement."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    if request.user.is_authenticated:
        # Imported here so the courses feature never depends on dashboard at module load.
        from features.dashboard.models import Enrollment

        Enrollment.objects.get_or_create(user=request.user, course=course)
    return Response({"enrolled": True, "courseId": course.slug})


@api_view(["POST"])
def course_progress_view(request: Any, slug: str) -> Response:
    """Persist a progress sync for the signed-in learner, or echo it back for a visitor."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    completed = request.data.get("completedLessonIds", [])
    if request.user.is_authenticated:
        from features.dashboard.models import Enrollment

        enrollment, _ = Enrollment.objects.get_or_create(user=request.user, course=course)
        enrollment.progress = int(request.data.get("progress", enrollment.progress))
        enrollment.last_lesson = request.data.get("lastLesson", enrollment.last_lesson)
        enrollment.is_completed = bool(request.data.get("isCompleted", enrollment.is_completed))
        enrollment.save(update_fields=["progress", "last_lesson", "is_completed", "updated_at"])
    return Response({"courseId": course.slug, "completedLessonIds": completed})


@api_view(["POST"])
def course_favorite_view(request: Any, slug: str) -> Response:
    """Toggle a course in the learner's favorites; a visitor gets a sign-in hint."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)
    if not request.user.is_authenticated:
        return Response({"favorited": False, "requiresAuth": True})
    from features.dashboard.models import FavoriteCourse

    favorite = FavoriteCourse.objects.filter(user=request.user, course=course).first()
    if favorite is None:
        FavoriteCourse.objects.create(user=request.user, course=course)
        return Response({"favorited": True, "courseId": course.slug})
    favorite.delete()
    return Response({"favorited": False, "courseId": course.slug})



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
