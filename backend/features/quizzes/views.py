"""Learner quiz endpoints; grading and disclosure policy stay in services."""

from __future__ import annotations

from typing import Any

from django.db.models import Count, Max, Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from features.access.services import has_perm
from features.common.choices import CourseStatus
from features.common.errors import NotEntitled, NotFound, PermissionDenied
from features.common.throttling import scoped_throttle
from features.courses.models import Course, CourseProblem
from features.dashboard.models import Enrollment

from . import services
from .models import Attempt, AttemptGrant, AttemptStatus, Question, Quiz, QuizKind
from .serializers import question_payload


class StrictSerializer(ser.Serializer):
    """Reject unknown JSON keys rather than silently accepting mass assignment."""

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise ser.ValidationError("يجب أن يكون جسم الطلب كائنًا.")
        unknown = sorted(set(data) - set(self.fields))
        if unknown:
            raise ser.ValidationError({key: "حقل غير معروف." for key in unknown})
        return super().to_internal_value(data)


class PracticeCheckRequest(StrictSerializer):
    optionIds = ser.ListField(child=ser.CharField(max_length=64), min_length=1, max_length=10)

    def validate_optionIds(self, values):
        if len(values) != len(set(values)):
            raise ser.ValidationError("لا يمكن تكرار الخيار نفسه.")
        return values


class AnswerSelectionRequest(StrictSerializer):
    questionId = ser.CharField(max_length=64)
    optionIds = ser.ListField(child=ser.CharField(max_length=64), max_length=10)

    def validate_optionIds(self, values):
        if len(values) != len(set(values)):
            raise ser.ValidationError("لا يمكن تكرار الخيار نفسه.")
        return values


class SaveAnswersRequest(StrictSerializer):
    answers = AnswerSelectionRequest(many=True, max_length=500)


NO_STORE = "private, no-store"


def _get_course(slug: str) -> Course:
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة.")
    return course


def _require_learner_course(user: Any, course: Course) -> Enrollment | None:
    if course.status not in (CourseStatus.PUBLISHED, CourseStatus.ARCHIVED):
        raise NotFound("الدورة غير موجودة.")
    enrollment = Enrollment.objects.filter(user=user, course=course).first()
    if course.status == CourseStatus.ARCHIVED and enrollment is None:
        raise NotFound("الدورة غير موجودة.")
    return enrollment


def _quiz_summary_rows(user: Any, quizzes: list[Quiz], enrollment: Enrollment | None) -> list[dict[str, Any]]:
    if not quizzes:
        return []
    quiz_ids = [quiz.pk for quiz in quizzes]
    stats = {
        row["quiz_id"]: row
        for row in Attempt.objects.filter(user=user, quiz_id__in=quiz_ids)
        .values("quiz_id")
        .annotate(
            attempts_used=Count("id", filter=Q(status__in=(AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED))),
            best_percent=Max("percent"),
            passed_count=Count("id", filter=Q(passed=True)),
        )
    }
    active_ids = dict(
        Attempt.objects.filter(user=user, quiz_id__in=quiz_ids, status=AttemptStatus.IN_PROGRESS).values_list(
            "quiz_id", "id"
        )
    )
    extra_attempts = dict(AttemptGrant.objects.filter(user=user, quiz_id__in=quiz_ids).values_list("quiz_id", "extra"))
    summaries: list[dict[str, Any]] = []
    for quiz in quizzes:
        row = stats.get(quiz.pk, {})
        used = row.get("attempts_used", 0)
        attempts_left = (
            None if quiz.max_attempts is None else max(0, quiz.max_attempts + extra_attempts.get(quiz.pk, 0) - used)
        )
        locked = None
        if enrollment is None:
            locked = {"reason": "يجب التسجيل في الدورة أولًا.", "needed": "enrollment"}
        elif enrollment.progress < quiz.unlock_progress_percent:
            locked = {
                "reason": f"أكمل {quiz.unlock_progress_percent}% من الدورة لفتح هذا الاختبار.",
                "needed": quiz.unlock_progress_percent,
            }
        elif attempts_left == 0:
            locked = {"reason": "لا توجد محاولات متبقية.", "needed": 0}
        summaries.append(
            {
                "id": str(quiz.pk),
                "kind": quiz.kind,
                "title": quiz.title,
                "instructions": quiz.instructions,
                "timeLimitMinutes": quiz.time_limit_minutes,
                "passThreshold": quiz.pass_threshold,
                "maxAttempts": quiz.max_attempts,
                "attemptsUsed": used,
                "attemptsLeft": attempts_left,
                "bestPercent": row.get("best_percent"),
                "passed": bool(row.get("passed_count", 0)),
                "locked": locked,
                **({"activeAttemptId": str(active_ids[quiz.pk])} if quiz.pk in active_ids else {}),
            }
        )
    return summaries


def _attempt_payload(attempt: Attempt) -> dict[str, Any]:
    attempt = services.expire_attempt_if_needed(attempt)
    if attempt.status == AttemptStatus.IN_PROGRESS:
        return {**services.active_attempt_payload(attempt), "status": attempt.status}
    return {
        "attemptId": str(attempt.pk),
        "serverNow": timezone.now().isoformat(),
        "deadlineAt": attempt.deadline_at.isoformat() if attempt.deadline_at else None,
        "status": attempt.status,
        "result": services.result_view(attempt, attempt.user),
    }


@extend_schema(
    operation_id="course_quizzes",
    summary="Published quiz summaries for an enrolled learner.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [QuizSummary]}`")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_quizzes(request: Any, slug: str) -> Response:
    if not has_perm(request.user, "quizzes.attempt"):
        raise PermissionDenied("لا تملك صلاحية عرض الاختبارات.")
    course = _get_course(slug)
    enrollment = _require_learner_course(request.user, course)
    quizzes = list(Quiz.objects.filter(course=course, is_published=True).order_by("order", "created_at", "id"))
    return Response({"items": _quiz_summary_rows(request.user, quizzes, enrollment)})


@extend_schema(
    operation_id="quiz_attempt_start",
    summary="Start or resume the learner's in-progress quiz attempt.",
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Safe active-attempt payload or result.")
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("quiz_attempt")
def start_quiz_attempt(request: Any, quiz_id: Any) -> Response:
    quiz = Quiz.objects.select_related("course").filter(pk=quiz_id).first()
    if quiz is None:
        raise NotFound("الاختبار غير موجود.")
    attempt = services.start_attempt(request.user, quiz)
    return Response(_attempt_payload(attempt))


@extend_schema(
    operation_id="quiz_attempt_detail",
    summary="Resume an owned attempt or read its reveal-policy result.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quiz_attempt_detail(request: Any, attempt_id: Any) -> Response:
    attempt = Attempt.objects.select_related("quiz", "user").filter(pk=attempt_id, user=request.user).first()
    if attempt is None:
        raise NotFound("المحاولة غير موجودة.")
    return Response(_attempt_payload(attempt))


@extend_schema(
    operation_id="quiz_attempt_answers_save",
    summary="Idempotently save selections for an active attempt.",
    request=SaveAnswersRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
@scoped_throttle("quiz_save")
def quiz_attempt_answers(request: Any, attempt_id: Any) -> Response:
    attempt = Attempt.objects.filter(pk=attempt_id, user=request.user).first()
    if attempt is None:
        raise NotFound("المحاولة غير موجودة.")
    serializer = SaveAnswersRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    services.save_answers(attempt, serializer.validated_data["answers"])
    return Response({"saved": True, "savedAt": timezone.now().isoformat()})


@extend_schema(
    operation_id="quiz_attempt_submit",
    summary="Submit and grade an owned attempt idempotently.",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("quiz_attempt")
def submit_quiz_attempt(request: Any, attempt_id: Any) -> Response:
    attempt = Attempt.objects.select_related("quiz", "user").filter(pk=attempt_id, user=request.user).first()
    if attempt is None:
        raise NotFound("المحاولة غير موجودة.")
    attempt = services.expire_attempt_if_needed(attempt)
    if attempt.status == AttemptStatus.IN_PROGRESS:
        attempt = services.submit_attempt(attempt)
    return Response(_attempt_payload(attempt))


def _require_practice_permission(user: Any) -> None:
    if not has_perm(user, "quizzes.attempt"):
        raise PermissionDenied("لا تملك صلاحية حلّ المسائل.")


@extend_schema(
    operation_id="quiz_practice_check",
    summary="Check a practice-quiz answer on the server.",
    request=PracticeCheckRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("quiz_check")
def quiz_practice_check(request: Any, question_id: Any) -> Response:
    _require_practice_permission(request.user)
    question = Question.objects.select_related("quiz__course").filter(pk=question_id).first()
    if question is None or not question.quiz.is_published:
        raise NotFound("السؤال غير موجود.")
    _require_learner_course(request.user, question.quiz.course)
    if not Enrollment.objects.filter(user=request.user, course=question.quiz.course).exists():
        raise NotEntitled()
    serializer = PracticeCheckRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(services.check_practice_answer(request.user, question, serializer.validated_data["optionIds"]))


@extend_schema(
    operation_id="legacy_problem_check",
    summary="Check a retained legacy practice problem on the server.",
    request=PracticeCheckRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("quiz_check")
def legacy_problem_check(request: Any, problem_id: str) -> Response:
    _require_practice_permission(request.user)
    problem = CourseProblem.objects.filter(problem_id=problem_id).first()
    if problem is None:
        raise NotFound("المسألة غير موجودة.")
    serializer = PracticeCheckRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(services.check_legacy_problem_answer(request.user, problem, serializer.validated_data["optionIds"]))


def course_practice_items(course: Course) -> list[dict[str, Any]] | None:
    """Return quiz-backed safe practice items, or None when legacy fallback applies."""
    quiz = (
        Quiz.objects.filter(course=course, kind=QuizKind.PRACTICE, is_published=True)
        .prefetch_related("questions__options")
        .order_by("order", "created_at", "id")
        .first()
    )
    if quiz is None:
        return None
    return [{**question_payload(question), "source": "quiz"} for question in quiz.questions.all()]


def legacy_practice_items() -> list[dict[str, Any]]:
    problems = CourseProblem.objects.prefetch_related("options").all()
    return [
        {
            "id": problem.problem_id,
            "prompt": problem.prompt,
            "code": problem.code,
            "options": [{"id": option.option_id, "label": option.label} for option in problem.options.all()],
            "source": "legacy",
            "kind": "single",
        }
        for problem in problems
    ]


@extend_schema(
    operation_id="problems_list",
    summary="The shared practice problem set without answer keys.",
    auth=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [safe problem]}`")},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def problems_list(request: Any) -> Response:
    return Response({"items": legacy_practice_items()})


@extend_schema(
    operation_id="course_problems",
    summary="Quiz-backed course practice, or the retained shared set.",
    auth=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [safe problem]}`")},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def course_problems(request: Any, slug: str) -> Response:
    course = Course.objects.visible_to(request.user).filter(slug=slug).first()
    if course is None:
        raise NotFound("الدورة غير موجودة.")
    quiz_items = course_practice_items(course)
    return Response({"items": quiz_items if quiz_items is not None else legacy_practice_items()})
