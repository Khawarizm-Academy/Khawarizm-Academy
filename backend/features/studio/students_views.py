"""Private Studio roster, learner-detail, action, and instructor-note APIs."""

from __future__ import annotations

import csv
import hashlib
import io
import uuid
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.db.models import (
    F,
    Avg,
    Case,
    CharField,
    Count,
    DateTimeField,
    DecimalField,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce, Greatest, Lower
from django.db.models import Prefetch
from django.http import StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.registry import OWN_KINDS
from features.access.services import has_perm
from features.common.choices import CourseStatus, NotificationType
from features.common.errors import Conflict, InvalidParameter, NotFound, PermissionDenied
from features.common.throttling import scoped_throttle
from features.courses.models import Course, CourseLesson, LessonProgress
from features.dashboard.models import DashboardNotification, Enrollment
from features.quizzes.models import Attempt, AttemptStatus, Quiz
from features.quizzes import services as quiz_services
from features.auth.models import User
from features.studio.students_serializers import (
    ExtraAttemptRequest,
    StudentActionRequest,
    StudentNoteRequest,
    StudentsRosterRequest,
    course_option,
    grant_response,
    mask_email,
    nudge_response,
    roster_row,
    student_detail,
    student_note_payload,
)
from features.studio.models import InstructorStudentNote

PAGE_SIZE = 20
NO_STORE = "private, no-store"
NUDGE_WINDOW = timedelta(hours=24)


def _response(data: Any = None, *, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = NO_STORE
    return response


def _visible_courses(actor: Any):
    if has_perm(actor, "students.view_any"):
        return Course.objects.all()
    if not has_perm(actor, "students.view_own"):
        raise PermissionDenied("لا تملك صلاحية عرض الطلاب.")
    return Course.objects.filter(
        staff__user=actor,
        staff__kind__in=OWN_KINDS["students.view_own"],
    ).distinct()


def _course_for_actor(actor: Any, slug: str) -> Course:
    course = _visible_courses(actor).filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة أو لا تملك صلاحية عرض طلابها.")
    return course


def _validated_query(request: Any) -> dict[str, Any]:
    serializer = StudentsRosterRequest(data={key: request.query_params[key] for key in request.query_params})
    serializer.is_valid(raise_exception=True)
    values = dict(serializer.validated_data)
    values.setdefault("sort", "name")
    values.setdefault("page", 1)
    return values


def _roster_queryset(actor: Any, values: dict[str, Any]):
    visible = _visible_courses(actor)
    course_slug = values.get("course")
    if course_slug:
        visible = visible.filter(slug=course_slug)

    now = timezone.now()
    cutoff = now - timedelta(days=14)
    completed_lessons = (
        LessonProgress.objects.filter(
            user_id=OuterRef("user_id"),
            lesson__module__course_id=OuterRef("course_id"),
            completed=True,
        )
        .order_by()
        .values("user_id")
        .annotate(value=Count("pk"))
        .values("value")[:1]
    )
    total_lessons = (
        CourseLesson.objects.filter(module__course_id=OuterRef("course_id"))
        .order_by()
        .values("module__course_id")
        .annotate(value=Count("pk"))
        .values("value")[:1]
    )
    quiz_average = (
        Attempt.objects.filter(
            user_id=OuterRef("user_id"),
            quiz__course_id=OuterRef("course_id"),
            status__in=(AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED),
            percent__isnull=False,
        )
        .order_by()
        .values("user_id")
        .annotate(value=Avg("percent"))
        .values("value")[:1]
    )
    last_progress = (
        LessonProgress.objects.filter(
            user_id=OuterRef("user_id"), lesson__module__course_id=OuterRef("course_id")
        )
        .order_by("-updated_at")
        .values("updated_at")[:1]
    )
    last_attempt = (
        Attempt.objects.filter(user_id=OuterRef("user_id"), quiz__course_id=OuterRef("course_id"))
        .order_by("-updated_at")
        .values("updated_at")[:1]
    )
    enrollment_updated = Coalesce(
        Subquery(last_progress, output_field=DateTimeField()),
        F("updated_at"),
        output_field=DateTimeField(),
    )
    attempt_updated = Coalesce(
        Subquery(last_attempt, output_field=DateTimeField()),
        F("updated_at"),
        output_field=DateTimeField(),
    )
    return (
        Enrollment.objects.filter(course__in=visible)
        .select_related("user", "course")
        .annotate(
            completed_lessons=Coalesce(
                Subquery(completed_lessons, output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
            total_lessons=Coalesce(
                Subquery(total_lessons, output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
            quiz_average=Subquery(
                quiz_average,
                output_field=DecimalField(max_digits=8, decimal_places=2),
            ),
            last_progress_at=enrollment_updated,
            last_attempt_at=attempt_updated,
        )
        .annotate(
            last_active_at=Greatest(
                F("updated_at"),
                F("last_progress_at"),
                F("last_attempt_at"),
                output_field=DateTimeField(),
            )
        )
        .annotate(
            roster_status=Case(
                When(Q(is_completed=True) | Q(progress__gte=100), then=Value("completed")),
                When(last_active_at__lt=cutoff, then=Value("struggling")),
                default=Value("active"),
                output_field=CharField(),
            )
        )
    )


def _sort_roster(rows: Any, sort: str):
    return rows.order_by(
        {
            "name": (Lower("user__full_name"), "user_id"),
            "progress": ("-progress", Lower("user__full_name"), "user_id"),
            "lastActive": ("-last_active_at", Lower("user__full_name"), "user_id"),
            "quizAverage": ("-quiz_average", Lower("user__full_name"), "user_id"),
        }.get(sort, (Lower("user__full_name"), "user_id"))
    )


def _csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


@extend_schema(
    operation_id="studio_students_courses",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_courses(request: Any) -> Response:
    courses = (
        _visible_courses(request.user)
        .filter(status__in=(CourseStatus.PUBLISHED, CourseStatus.ARCHIVED, CourseStatus.DRAFT, CourseStatus.IN_REVIEW))
        .annotate(student_count=Count("enrollments", distinct=True))
        .order_by(Lower("title"), "slug")
    )
    return _response({"items": [course_option(course) for course in courses]})


@extend_schema(
    operation_id="studio_students_roster",
    parameters=[
        OpenApiParameter("course", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("sort", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def students(request: Any) -> Response:
    values = _validated_query(request)
    rows = _roster_queryset(request.user, values)
    query = values.get("q", "").strip()
    if query:
        search = Q(user__full_name__icontains=query)
        if has_perm(request.user, "students.view_any"):
            search |= Q(user__email__icontains=query)
        rows = rows.filter(search)
    if values.get("status"):
        rows = rows.filter(roster_status=values["status"])
    total = rows.count()
    page = values["page"]
    rows = _sort_roster(rows, values["sort"])[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    can_view_any = has_perm(request.user, "students.view_any")
    now = timezone.now()
    return _response(
        {
            "items": [roster_row(row, can_view_any=can_view_any, now=now) for row in rows],
            "total": total,
            "page": page,
            "pageSize": PAGE_SIZE,
        }
    )


@extend_schema(
    operation_id="studio_students_csv",
    parameters=[OpenApiParameter("course", OpenApiTypes.STR, OpenApiParameter.QUERY)],
    responses={(200, "text/csv"): OpenApiResponse(response=OpenApiTypes.BINARY)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def students_csv(request: Any) -> StreamingHttpResponse:
    values = _validated_query(request)
    rows = _roster_queryset(request.user, values)
    query = values.get("q", "").strip()
    if query:
        search = Q(user__full_name__icontains=query)
        if has_perm(request.user, "students.view_any"):
            search |= Q(user__email__icontains=query)
        rows = rows.filter(search)
    if values.get("status"):
        rows = rows.filter(roster_status=values["status"])
    rows = _sort_roster(rows, values["sort"])
    can_view_any = has_perm(request.user, "students.view_any")

    def stream():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            ["studentId", "name", "email", "course", "progress", "completedLessons", "lastActive", "quizAverage", "status"]
        )
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        for row in rows.iterator(chunk_size=200):
            payload = roster_row(row, can_view_any=can_view_any, now=timezone.now())
            course_payload = payload.get("course") or {}
            writer.writerow(
                _csv_cell(value)
                for value in (
                    payload.get("id"),
                    payload.get("name"),
                    payload.get("email"),
                    course_payload.get("title"),
                    payload.get("progress"),
                    payload.get("completedLessons"),
                    payload.get("lastActive"),
                    payload.get("quizAverage"),
                    payload.get("status"),
                )
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    response = StreamingHttpResponse(stream(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="studio-students.csv"'
    response["Cache-Control"] = NO_STORE
    return response


def _student_enrollment(actor: Any, student_id: Any, course_slug: str) -> Enrollment:
    course = _course_for_actor(actor, course_slug)
    try:
        return Enrollment.objects.select_related("user", "course").get(user_id=student_id, course=course)
    except (Enrollment.DoesNotExist, ValueError, TypeError):
        raise NotFound("الطالب غير موجود في هذه الدورة.") from None


@extend_schema(
    operation_id="studio_student_detail",
    parameters=[OpenApiParameter("course", OpenApiTypes.STR, OpenApiParameter.QUERY)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_detail_view(request: Any, student_id: Any) -> Response:
    course_slug = request.query_params.get("course", "").strip()
    if not course_slug:
        raise InvalidParameter("الدورة مطلوبة لعرض تفاصيل الطالب.")
    enrollment = _student_enrollment(request.user, student_id, course_slug)
    progress_rows = LessonProgress.objects.filter(user_id=enrollment.user_id).order_by("lesson__module__order", "lesson__order")
    lessons = list(
        CourseLesson.objects.filter(module__course_id=enrollment.course_id)
        .select_related("module")
        .prefetch_related(
            Prefetch(
                "progress_rows",
                queryset=progress_rows,
                to_attr="_student_progress_rows",
            )
        )
        .order_by("module__order", "order", "lesson_id")
    )
    for lesson in lessons:
        lesson._student_progress = next(iter(getattr(lesson, "_student_progress_rows", [])), None)
    attempts = list(
        Attempt.objects.filter(
            user_id=enrollment.user_id,
            quiz__course_id=enrollment.course_id,
        )
        .select_related("quiz")
        .exclude(status=AttemptStatus.IN_PROGRESS)
        .order_by("quiz__order", "quiz__title", "-started_at", "pk")
    )
    notes = list(
        InstructorStudentNote.objects.filter(course=enrollment.course, student_id=enrollment.user_id)
        .order_by("-created_at", "pk")[:100]
    )
    return _response(
        student_detail(
            enrollment,
            lessons=lessons,
            attempts=attempts,
            can_view_any=has_perm(request.user, "students.view_any"),
            notes=[student_note_payload(note) for note in notes],
        )
    )


@extend_schema(
    methods=["GET"],
    operation_id="studio_student_notes_list",
    parameters=[OpenApiParameter("course", OpenApiTypes.STR, OpenApiParameter.QUERY, required=True)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["POST"],
    operation_id="studio_student_notes_create",
    request=StudentNoteRequest,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_notes(request: Any, student_id: Any) -> Response:
    if request.method == "GET":
        course_slug = request.query_params.get("course", "").strip()
        if not course_slug:
            raise InvalidParameter("الدورة مطلوبة لعرض الملاحظات.")
        enrollment = _student_enrollment(request.user, student_id, course_slug)
        notes = InstructorStudentNote.objects.filter(course=enrollment.course, student_id=enrollment.user_id)
        return _response({"items": [student_note_payload(note) for note in notes[:100]]})

    body = StudentNoteRequest(data=request.data)
    body.is_valid(raise_exception=True)
    values = body.validated_data
    enrollment = _student_enrollment(request.user, student_id, values["course"])
    author_name = (getattr(request.user, "full_name", "") or "").strip() or "فريق التدريس"
    note = InstructorStudentNote.objects.create(
        course=enrollment.course,
        student_id=enrollment.user_id,
        author=request.user,
        author_name=author_name[:160],
        body=values["body"],
    )
    return _response(student_note_payload(note), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_student_nudge",
    request=StudentActionRequest,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def student_nudge(request: Any, student_id: Any) -> Response:
    body = StudentActionRequest(data=request.data)
    body.is_valid(raise_exception=True)
    values = body.validated_data
    course = _course_for_actor(request.user, values["course"])
    with transaction.atomic():
        try:
            enrollment = Enrollment.objects.select_for_update().get(user_id=student_id, course=course)
        except (Enrollment.DoesNotExist, ValueError, TypeError):
            raise NotFound("الطالب غير موجود في هذه الدورة.") from None
        now = timezone.now()
        key = hashlib.sha256(f"{course.pk}:{student_id}".encode()).hexdigest()[:24]
        recent = DashboardNotification.objects.filter(
            user_id=student_id,
            notification_id__startswith=f"studio-nudge-{key}-",
            created_at__gte=now - NUDGE_WINDOW,
        ).order_by("-created_at").first()
        if recent:
            raise Conflict("تم إرسال تنبيه لهذا الطالب خلال آخر 24 ساعة.", code="nudge_rate_limited")
        message = values.get("message") or "استمرّ في التعلّم، أنت قادر على إكمال مسارك."
        notification_id = f"studio-nudge-{key}-{uuid.uuid4().hex[:16]}"
        from features.dashboard.notifications import notify

        notify(
            [student_id],
            "instructor_nudge",
            {
                "title": f"رسالة من مدرّبك في {course.title}: {message}"[:200],
                "message": f"رسالة من مدرّبك في {course.title}: {message}"[:200],
                "notificationType": NotificationType.LESSON,
                "link": f"/courses/{course.slug}",
            },
            notification_id,
        )
        notification = DashboardNotification.objects.get(user_id=student_id, notification_id=notification_id)
    return _response(
        nudge_response(notification, next_allowed_at=notification.created_at + NUDGE_WINDOW),
        code=status.HTTP_201_CREATED,
    )


@extend_schema(
    operation_id="studio_student_extra_attempt",
    request=ExtraAttemptRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def student_extra_attempt(request: Any, student_id: Any) -> Response:
    body = ExtraAttemptRequest(data=request.data)
    body.is_valid(raise_exception=True)
    values = body.validated_data
    course = _course_for_actor(request.user, values["course"])
    if not Enrollment.objects.filter(user_id=student_id, course=course).exists():
        raise NotFound("الطالب غير موجود في هذه الدورة.")
    quiz = Quiz.objects.filter(pk=values["quizId"], course=course).first()
    if quiz is None:
        raise NotFound("الاختبار غير موجود في هذه الدورة.")
    try:
        user = User.objects.get(pk=student_id)
    except (User.DoesNotExist, ValueError, TypeError):
        raise NotFound("الطالب غير موجود.") from None
    grant = quiz_services.grant_extra_attempt(
        request.user,
        quiz,
        user,
        values.get("count", 1),
        values.get("note", ""),
    )
    return _response(grant_response(grant, quiz, user))
