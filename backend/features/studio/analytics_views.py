"""SQL-backed instructor analytics endpoints kept separate from shared Studio views."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from django.db.models import (
    Avg,
    Case,
    CharField,
    Count,
    ExpressionWrapper,
    F,
    FloatField,
    IntegerField,
    Q,
    Value,
    When,
)
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.registry import OWN_KINDS
from features.access.services import has_perm
from features.common.errors import InvalidParameter, NotFound, PermissionDenied
from features.courses.models import Course, CourseLesson, LessonProgress
from features.dashboard.models import Certificate, Enrollment
from features.quizzes.models import Attempt, AttemptStatus, Answer
from features.studio.analytics_serializers import AnalyticsQuerySerializer

NO_STORE = "private, no-store"


def _response(data: dict[str, Any]) -> Response:
    response = Response(data)
    response["Cache-Control"] = NO_STORE
    return response


def _authorized_courses(user: Any):
    """Return only courses visible under the analytics own/any permission pair."""
    if has_perm(user, "analytics.view_any"):
        return Course.objects.all()
    if not has_perm(user, "analytics.view_own"):
        raise PermissionDenied()
    return Course.objects.filter(
        staff__user=user,
        staff__kind__in=OWN_KINDS["analytics.view_own"],
    ).distinct()


def _validated_range(request: Any) -> int:
    serializer = AnalyticsQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return int(serializer.validated_data["range"])


def _period(days: int) -> tuple[datetime, datetime, datetime, datetime]:
    end = timezone.localtime()
    start = (end - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    previous_end = start
    previous_start = previous_end - timedelta(days=days)
    return start, end, previous_start, previous_end


def _date_key(value: date | datetime | None) -> str:
    return value.isoformat() if value is not None else ""


def _series(start: datetime, days: int, rows: Any) -> list[dict[str, Any]]:
    values = {_date_key(row["day"]): int(row["value"]) for row in rows}
    return [
        {"date": (start.date() + timedelta(days=index)).isoformat(), "value": values.get((start.date() + timedelta(days=index)).isoformat(), 0)}
        for index in range(days)
    ]


def _enrollment_series(course_ids: list[Any], start: datetime, end: datetime, days: int) -> list[dict[str, Any]]:
    rows = (
        Enrollment.objects.filter(course_id__in=course_ids, created_at__gte=start, created_at__lt=end)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(value=Count("id"))
        .order_by("day")
    )
    return _series(start, days, rows)


def _active_series(course_ids: list[Any], start: datetime, end: datetime, days: int) -> list[dict[str, Any]]:
    rows = (
        LessonProgress.objects.filter(
            lesson__module__course_id__in=course_ids,
            updated_at__gte=start,
            updated_at__lt=end,
        )
        .annotate(day=TruncDate("updated_at"))
        .values("day")
        .annotate(value=Count("user_id", distinct=True))
        .order_by("day")
    )
    return _series(start, days, rows)


def _metric(current: int | float | None, previous: int | float | None) -> dict[str, Any]:
    if current is None:
        return {"value": None, "delta": None, "deltaPercent": None, "deltaAvailable": False}
    delta = None if previous is None else round(float(current) - float(previous), 2)
    delta_percent = None
    if previous not in (None, 0):
        delta_percent = round((float(current) - float(previous)) * 100 / float(previous), 1)
    return {
        "value": current,
        "delta": delta,
        "deltaPercent": delta_percent,
        "deltaAvailable": previous is not None,
    }


def _watch_expression() -> Any:
    return Case(
        When(
            duration_seconds__gt=0,
            then=ExpressionWrapper(
                Value(100.0) * F("watched_seconds") / F("duration_seconds"),
                output_field=FloatField(),
            ),
        ),
        default=Value(None),
        output_field=FloatField(),
    )


def _lessons(course_ids: list[Any]) -> list[dict[str, Any]]:
    rows = CourseLesson.objects.filter(module__course_id__in=course_ids).values(
        "id",
        "lesson_id",
        "title",
        "order",
        "module__course_id",
        "module__course__slug",
        "module__course__title",
        "module__order",
    ).order_by("module__course__slug", "module__order", "order", "lesson_id")
    return [
        {
            "id": str(row["id"]),
            "lessonId": row["lesson_id"],
            "courseId": str(row["module__course_id"]),
            "courseSlug": row["module__course__slug"],
            "courseTitle": row["module__course__title"],
            "title": row["title"],
            "order": row["order"],
            "moduleOrder": row["module__order"],
        }
        for row in rows
    ]


def _completion_funnel(course_ids: list[Any]) -> list[dict[str, Any]]:
    lessons = _lessons(course_ids)
    enrollment_rows = (
        Enrollment.objects.filter(course_id__in=course_ids)
        .values("course_id")
        .annotate(total=Count("id"))
    )
    enrolled_by_course = {str(row["course_id"]): int(row["total"]) for row in enrollment_rows}
    reached_rows = (
        LessonProgress.objects.filter(lesson__module__course_id__in=course_ids)
        .values("lesson__module__course_id", "lesson_id")
        .annotate(reached=Count("user_id", distinct=True))
    )
    reached_by_id = {
        (str(row["lesson__module__course_id"]), str(row["lesson_id"])): int(row["reached"])
        for row in reached_rows
    }
    return [
        {
            **lesson,
            "reached": reached_by_id.get((lesson["courseId"], lesson["id"]), 0),
            "enrolled": enrolled_by_course.get(lesson["courseId"], 0),
            "percent": round(
                min(
                    100,
                    reached_by_id.get((lesson["courseId"], lesson["id"]), 0)
                    * 100
                    / enrolled_by_course[lesson["courseId"]],
                ),
                1,
            )
            if enrolled_by_course.get(lesson["courseId"], 0)
            else None,
        }
        for lesson in lessons
    ]


def _lesson_watch(course_ids: list[Any], start: datetime, end: datetime) -> list[dict[str, Any]]:
    lessons = _lessons(course_ids)
    rows = (
        LessonProgress.objects.filter(
            lesson__module__course_id__in=course_ids,
            updated_at__gte=start,
            updated_at__lt=end,
        )
        .annotate(watch_percent=_watch_expression())
        .values("lesson_id", "lesson__lesson_id", "lesson__title", "lesson__order", "lesson__module__course__slug")
        .annotate(
            average=Avg("watch_percent"),
            learners=Count("user_id", distinct=True),
        )
        .order_by("lesson__module__course__slug", "lesson__order", "lesson__lesson_id")
    )
    by_lesson = {
        str(row["lesson_id"]): {
            "averageWatchPercent": round(min(100, max(0, float(row["average"]))), 1) if row["average"] is not None else None,
            "learners": int(row["learners"]),
        }
        for row in rows
    }
    return [
        {
            "lessonId": lesson["id"],
            "courseSlug": lesson["courseSlug"],
            "title": lesson["title"],
            "order": lesson["order"],
            "averageWatchPercent": by_lesson.get(lesson["id"], {}).get("averageWatchPercent"),
            "learners": by_lesson.get(lesson["id"], {}).get("learners", 0),
        }
        for lesson in lessons
    ]


def _average_watch(course_ids: list[Any], start: datetime, end: datetime) -> float | None:
    row = (
        LessonProgress.objects.filter(
            lesson__module__course_id__in=course_ids,
            updated_at__gte=start,
            updated_at__lt=end,
        )
        .annotate(watch_percent=_watch_expression())
        .aggregate(average=Avg("watch_percent"))
    )
    return round(min(100, max(0, float(row["average"]))), 1) if row["average"] is not None else None


def _quiz_data(course_ids: list[Any], start: datetime, end: datetime) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    attempts = Attempt.objects.filter(
        quiz__course_id__in=course_ids,
        status=AttemptStatus.SUBMITTED,
        submitted_at__gte=start,
        submitted_at__lt=end,
        percent__isnull=False,
    )
    bucket = Case(
        When(percent__lt=10, then=Value("0–9")),
        When(percent__lt=20, then=Value("10–19")),
        When(percent__lt=30, then=Value("20–29")),
        When(percent__lt=40, then=Value("30–39")),
        When(percent__lt=50, then=Value("40–49")),
        When(percent__lt=60, then=Value("50–59")),
        When(percent__lt=70, then=Value("60–69")),
        When(percent__lt=80, then=Value("70–79")),
        When(percent__lt=90, then=Value("80–89")),
        default=Value("90–100"),
        output_field=CharField(),
    )
    histogram_rows = attempts.annotate(bucket=bucket).values("bucket").annotate(count=Count("id"))
    histogram_counts = {row["bucket"]: int(row["count"]) for row in histogram_rows}
    histogram = [
        {"bucket": label, "count": histogram_counts.get(label, 0)}
        for label in ("0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100")
    ]

    missed_rows = (
        Answer.objects.filter(
            attempt__quiz__course_id__in=course_ids,
            attempt__status=AttemptStatus.SUBMITTED,
            attempt__submitted_at__gte=start,
            attempt__submitted_at__lt=end,
            is_correct=False,
        )
        .values("question_id", "question__prompt")
        .annotate(
            missed=Count("id"),
            attempts=Count("attempt_id", distinct=True),
        )
        .order_by("-missed", "question__prompt")[:8]
    )
    missed = [
        {
            "questionId": str(row["question_id"]),
            "prompt": row["question__prompt"],
            "missed": int(row["missed"]),
            "attempts": int(row["attempts"]),
            "missPercent": round(row["missed"] * 100 / row["attempts"], 1) if row["attempts"] else None,
        }
        for row in missed_rows
    ]
    return histogram, missed


def _analytics_payload(course_ids: list[Any], days: int, *, scope: str, course: Course | None = None) -> dict[str, Any]:
    start, end, previous_start, previous_end = _period(days)
    enrolled = Enrollment.objects.filter(course_id__in=course_ids).count()
    completed = Enrollment.objects.filter(course_id__in=course_ids, is_completed=True).count()
    current_enrollments = Enrollment.objects.filter(course_id__in=course_ids, created_at__gte=start, created_at__lt=end).count()
    previous_enrollments = Enrollment.objects.filter(
        course_id__in=course_ids,
        created_at__gte=previous_start,
        created_at__lt=previous_end,
    ).count()
    current_active = LessonProgress.objects.filter(
        lesson__module__course_id__in=course_ids,
        updated_at__gte=start,
        updated_at__lt=end,
    ).values("user_id").distinct().count()
    previous_active = LessonProgress.objects.filter(
        lesson__module__course_id__in=course_ids,
        updated_at__gte=previous_start,
        updated_at__lt=previous_end,
    ).values("user_id").distinct().count()
    current_watch = _average_watch(course_ids, start, end)
    previous_watch = _average_watch(course_ids, previous_start, previous_end)
    histogram, missed = _quiz_data(course_ids, start, end)
    certificate_count = Certificate.objects.filter(course_id__in=course_ids).count()
    current_certificates = Certificate.objects.filter(course_id__in=course_ids, created_at__gte=start, created_at__lt=end).count()
    previous_certificates = Certificate.objects.filter(
        course_id__in=course_ids,
        created_at__gte=previous_start,
        created_at__lt=previous_end,
    ).count()

    payload: dict[str, Any] = {
        "scope": scope,
        "range": days,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "course": {"slug": course.slug, "title": course.title} if course is not None else None,
        "courseCount": len(course_ids) if scope == "overview" else 1,
        "kpis": {
            "enrollments": _metric(current_enrollments, previous_enrollments),
            "activeLearners": _metric(current_active, previous_active),
            "completionRate": {
                "value": round(completed * 100 / enrolled, 1) if enrolled else None,
                "delta": None,
                "deltaPercent": None,
                "deltaAvailable": False,
            },
            "averageWatchPercent": _metric(current_watch, previous_watch),
            "certificates": _metric(current_certificates, previous_certificates),
        },
        "enrollmentsByDay": _enrollment_series(course_ids, start, end, days),
        "activeLearnersByDay": _active_series(course_ids, start, end, days),
        "completionFunnel": _completion_funnel(course_ids),
        "lessonWatch": _lesson_watch(course_ids, start, end),
        "quizScoreHistogram": histogram,
        "topMissedQuestions": missed,
        "certificates": {"available": True, "count": certificate_count},
        "ratings": {
            "available": False,
            "distribution": [],
            "reason": "لا يوجد مصدر تقييمات موزّع حاليًا؛ سيضاف في مرحلة لاحقة.",
        },
        "dataState": "empty" if not enrolled else ("low" if enrolled < 5 else "ready"),
    }
    return payload


@extend_schema(
    operation_id="studio_analytics_overview",
    summary="Aggregated analytics for courses visible to the instructor.",
    parameters=[OpenApiParameter("range", OpenApiTypes.STR, OpenApiParameter.QUERY, enum=["7", "30", "90"])],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request: Any) -> Response:
    days = _validated_range(request)
    courses = _authorized_courses(request.user)
    course_ids = list(courses.values_list("pk", flat=True))
    return _response(_analytics_payload(course_ids, days, scope="overview"))


@extend_schema(
    operation_id="studio_analytics_course",
    summary="Analytics for one owned or otherwise authorized course.",
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("range", OpenApiTypes.STR, OpenApiParameter.QUERY, enum=["7", "30", "90"]),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course(request: Any, slug: str) -> Response:
    days = _validated_range(request)
    row = _authorized_courses(request.user).filter(slug=slug).first()
    if row is None:
        raise NotFound("الدورة غير موجودة أو لا تملك صلاحية تحليلاتها.")
    return _response(_analytics_payload([row.pk], days, scope="course", course=row))
