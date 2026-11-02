from __future__ import annotations

import csv
import io
import json
from typing import Any

from django.db import transaction
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.services import has_object_perm, has_perm
from features.auth.authentication import AccessTokenAuthentication
from features.auth.models import User
from features.common.choices import QuestionKind, QuizKind, RevealPolicy
from features.common.errors import Conflict, InvalidParameter, PermissionDenied
from features.common.throttling import scoped_throttle
from features.courses.models import Course, CourseLesson, CourseStaff

from . import services
from .models import Answer, Attempt, AttemptStatus, Option, Question, Quiz

NO_STORE = "private, no-store"
PAGE_SIZE_CAP = 100
IMPORT_ROW_CAP = 500
QUIZ_FIELDS = {
    "kind",
    "title",
    "instructions",
    "order",
    "timeLimitMinutes",
    "passThreshold",
    "maxAttempts",
    "drawCount",
    "shuffleQuestions",
    "shuffleOptions",
    "revealPolicy",
    "unlockProgressPercent",
    "lessonId",
}
QUESTION_FIELDS = {"kind", "prompt", "code", "explanation", "hint", "points", "order", "partialCredit", "options"}
OPTION_FIELDS = {"id", "label", "isCorrect", "order"}
PROTECTED_QUIZ_FIELDS = {
    "kind",
    "timeLimitMinutes",
    "passThreshold",
    "maxAttempts",
    "drawCount",
    "shuffleQuestions",
    "shuffleOptions",
    "revealPolicy",
    "unlockProgressPercent",
    "lessonId",
}


def _private(response: Response | StreamingHttpResponse):
    response["Cache-Control"] = NO_STORE
    return response


def _body(request) -> dict[str, Any]:
    if not isinstance(request.data, dict):
        raise InvalidParameter("يجب أن يكون جسم الطلب كائنًا.")
    return request.data


def _strict(data: dict[str, Any], allowed: set[str]) -> None:
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise InvalidParameter(f"حقول غير معروفة: {', '.join(unknown)}")


def _int(value: Any, name: str, *, minimum: int = 0, maximum: int | None = None) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < minimum
        or (maximum is not None and value > maximum)
    ):
        raise InvalidParameter(f"قيمة غير صالحة للحقل {name}.")
    return value


def _course(slug: str) -> Course:
    return get_object_or_404(Course.objects.select_related("owner"), slug=slug)


def _quiz(pk: Any) -> Quiz:
    return get_object_or_404(Quiz.objects.select_related("course", "lesson"), pk=pk)


def _question(pk: Any) -> Question:
    return get_object_or_404(Question.objects.select_related("quiz", "quiz__course"), pk=pk)


def _author(actor: Any, quiz_or_course: Any) -> None:
    if not services.can_author(actor, quiz_or_course):
        raise PermissionDenied("لا تملك صلاحية تحرير هذا الاختبار.")


def _results(actor: Any, quiz: Quiz) -> None:
    if has_perm(actor, "quizzes.results_any"):
        return
    if not has_perm(actor, "quizzes.results_own"):
        raise PermissionDenied("لا تملك صلاحية عرض نتائج هذا الاختبار.")
    kinds = list(CourseStaff.objects.filter(course=quiz.course, user=actor).values_list("kind", flat=True))
    if not has_object_perm(actor, "quizzes.results_own", kinds):
        raise PermissionDenied("لا تملك صلاحية عرض نتائج هذا الاختبار.")


def _quiz_row(quiz: Quiz, *, include_questions: bool = True) -> dict[str, Any]:
    row = {
        "id": str(quiz.pk),
        "courseId": str(quiz.course_id),
        "lessonId": str(quiz.lesson_id) if quiz.lesson_id else None,
        "kind": quiz.kind,
        "title": quiz.title,
        "instructions": quiz.instructions,
        "isPublished": quiz.is_published,
        "order": quiz.order,
        "timeLimitMinutes": quiz.time_limit_minutes,
        "passThreshold": quiz.pass_threshold,
        "maxAttempts": quiz.max_attempts,
        "drawCount": quiz.draw_count,
        "shuffleQuestions": quiz.shuffle_questions,
        "shuffleOptions": quiz.shuffle_options,
        "revealPolicy": quiz.reveal_policy,
        "unlockProgressPercent": quiz.unlock_progress_percent,
    }
    if include_questions:
        row["questions"] = [_question_row(q) for q in quiz.questions.prefetch_related("options").all()]
    return row


def _question_row(question: Question) -> dict[str, Any]:
    return {
        "id": str(question.pk),
        "kind": question.kind,
        "prompt": question.prompt,
        "code": question.code,
        "explanation": question.explanation,
        "hint": question.hint,
        "points": question.points,
        "order": question.order,
        "partialCredit": question.partial_credit,
        "options": [
            {"id": str(o.pk), "label": o.label, "isCorrect": o.is_correct, "order": o.order}
            for o in question.options.all()
        ],
        "previousAnswerCount": Answer.objects.filter(question=question).count(),
    }


def _validate_options(kind: str, options: Any, partial: bool) -> list[dict[str, Any]]:
    if not isinstance(options, list) or len(options) < 2:
        raise InvalidParameter("خيارات السؤال غير صالحة.")
    if kind == QuestionKind.TRUE_FALSE and len(options) != 2:
        raise InvalidParameter("سؤال الصواب والخطأ يحتاج خيارين.")
    if kind != QuestionKind.MULTIPLE and partial:
        raise InvalidParameter("التصحيح الجزئي متاح لأسئلة الاختيار المتعدد فقط.")
    seen: set[str] = set()
    seen_orders: set[int] = set()
    rows = []
    for index, item in enumerate(options):
        if not isinstance(item, dict):
            raise InvalidParameter("الخيار غير صالح.")
        _strict(item, OPTION_FIELDS)
        label = item.get("label")
        if not isinstance(label, str) or not label.strip() or len(label) > 300:
            raise InvalidParameter("نص الخيار غير صالح.")
        ident = item.get("id")
        if ident is not None:
            ident = str(ident)
            if ident in seen:
                raise InvalidParameter("معرّفات الخيارات مكررة.")
            seen.add(ident)
        is_correct = item.get("isCorrect", False)
        if not isinstance(is_correct, bool):
            raise InvalidParameter("حالة صحة الخيار غير صالحة.")
        order = _int(item.get("order", index), "order", maximum=100_000)
        if order in seen_orders:
            raise InvalidParameter("ترتيب الخيارات مكرر.")
        seen_orders.add(order)
        rows.append(
            {
                "id": ident,
                "label": label,
                "is_correct": is_correct,
                "order": order,
            }
        )
    correct = sum(row["is_correct"] for row in rows)
    if kind in (QuestionKind.SINGLE, QuestionKind.TRUE_FALSE) and correct != 1:
        raise InvalidParameter("يجب تحديد خيار صحيح واحد.")
    if kind == QuestionKind.MULTIPLE and correct < 1:
        raise InvalidParameter("يجب تحديد خيار صحيح واحد على الأقل.")
    return rows


def _question_values(
    data: dict[str, Any], *, default_kind: str = QuestionKind.SINGLE
) -> tuple[dict[str, Any], list[dict[str, Any]] | None]:
    _strict(data, QUESTION_FIELDS)
    values: dict[str, Any] = {}
    mapping = {"partialCredit": "partial_credit"}
    for key, value in data.items():
        if key == "options":
            continue
        field = mapping.get(key, key)
        if field in {"points", "order"}:
            value = _int(value, key)
        values[field] = value
    if "kind" in values and values["kind"] not in QuestionKind.values:
        raise InvalidParameter("نوع السؤال غير صالح.")
    if "prompt" in values and (not isinstance(values["prompt"], str) or not values["prompt"].strip()):
        raise InvalidParameter("نص السؤال مطلوب.")
    if "points" in values and values["points"] < 0:
        raise InvalidParameter("النقاط غير صالحة.")
    if "partial_credit" in values and not isinstance(values["partial_credit"], bool):
        raise InvalidParameter("قيمة التصحيح الجزئي غير صالحة.")
    options = data.get("options")
    if options is not None:
        kind = values.get("kind", default_kind)
        options = _validate_options(kind, options, values.get("partial_credit", False))
    return values, options


def _quiz_values(data: dict[str, Any], course: Course, *, creating: bool) -> dict[str, Any]:
    _strict(data, QUIZ_FIELDS)
    kind = data.get("kind", QuizKind.PRACTICE)
    if kind not in QuizKind.values:
        raise InvalidParameter("نوع الاختبار غير صالح.")
    values = {"kind": kind, "title": data.get("title", "")}
    if not isinstance(values["title"], str) or not values["title"].strip() or len(values["title"]) > 160:
        raise InvalidParameter("عنوان الاختبار مطلوب.")
    mapping = {
        "timeLimitMinutes": "time_limit_minutes",
        "passThreshold": "pass_threshold",
        "maxAttempts": "max_attempts",
        "drawCount": "draw_count",
        "shuffleQuestions": "shuffle_questions",
        "shuffleOptions": "shuffle_options",
        "revealPolicy": "reveal_policy",
        "unlockProgressPercent": "unlock_progress_percent",
        "instructions": "instructions",
        "order": "order",
    }
    for key, value in data.items():
        if key in {"kind", "title", "lessonId"}:
            continue
        values[mapping[key]] = value
    for field in (
        "order",
        "time_limit_minutes",
        "pass_threshold",
        "max_attempts",
        "draw_count",
        "unlock_progress_percent",
    ):
        if field in values:
            values[field] = _int(
                values[field],
                field,
                maximum=600
                if field == "time_limit_minutes"
                else 100
                if field in {"pass_threshold", "unlock_progress_percent"}
                else None,
            )
    if values.get("reveal_policy") not in (None, *RevealPolicy.values):
        raise InvalidParameter("سياسة كشف الإجابة غير صالحة.")
    if kind == QuizKind.EXAM:
        values.setdefault("reveal_policy", RevealPolicy.AFTER_CLOSE)
        values.setdefault("unlock_progress_percent", 80)
    else:
        values.setdefault("reveal_policy", RevealPolicy.AFTER_SUBMIT)
    lesson_id = data.get("lessonId")
    if kind == QuizKind.LESSON_QUIZ:
        if not lesson_id:
            raise InvalidParameter("اختبار الدرس يحتاج lessonId.")
        lesson = CourseLesson.objects.filter(pk=lesson_id, module__course=course).first()
        if lesson is None:
            raise InvalidParameter("الدرس لا ينتمي إلى هذه الدورة.")
        values["lesson_id"] = lesson.pk
    elif lesson_id is not None:
        raise InvalidParameter("lessonId متاح لاختبار الدرس فقط.")
    return values


def _update_quiz(quiz_id: Any, data: dict[str, Any]) -> Quiz:
    with transaction.atomic():
        quiz = Quiz.objects.select_for_update().select_related("course", "lesson").get(pk=quiz_id)
        if PROTECTED_QUIZ_FIELDS.intersection(data) and quiz.attempts.exists():
            raise Conflict("لا يمكن تغيير إعدادات التقييم بعد بدء المحاولات.", code="has_attempts")
        current = {
            "kind": quiz.kind,
            "title": quiz.title,
            "instructions": quiz.instructions,
            "order": quiz.order,
            "timeLimitMinutes": quiz.time_limit_minutes,
            "passThreshold": quiz.pass_threshold,
            "maxAttempts": quiz.max_attempts,
            "drawCount": quiz.draw_count,
            "shuffleQuestions": quiz.shuffle_questions,
            "shuffleOptions": quiz.shuffle_options,
            "revealPolicy": quiz.reveal_policy,
            "unlockProgressPercent": quiz.unlock_progress_percent,
            "lessonId": quiz.lesson_id,
        }
        current.update(data)
        for key, value in _quiz_values(current, quiz.course, creating=False).items():
            setattr(quiz, key, value)
        quiz.save()
        return quiz


def _replace_options(question: Question, rows: list[dict[str, Any]]) -> None:
    existing = {str(option.pk): option for option in question.options.all()}
    supplied_ids = [row["id"] for row in rows if row["id"] is not None]
    if not set(supplied_ids) <= existing.keys():
        raise InvalidParameter("معرّف الخيار لا ينتمي إلى هذا السؤال.")
    protected_ids = set()
    for selected in Answer.objects.filter(question=question).values_list("selected", flat=True):
        protected_ids.update(map(str, selected))
    for option_order in Attempt.objects.filter(quiz=question.quiz, status=AttemptStatus.IN_PROGRESS).values_list(
        "option_order", flat=True
    ):
        protected_ids.update(map(str, option_order.get(str(question.pk), [])))
    removed_ids = set(existing) - set(supplied_ids)
    if removed_ids & protected_ids:
        raise Conflict("تعتمد إجابات سابقة على خيارات هذا السؤال.", code="question_has_answers")
    for index, option in enumerate(existing.values()):
        Option.objects.filter(pk=option.pk).update(order=2_147_483_647 - index)
    for index, row in enumerate(rows):
        option = existing.get(row["id"]) if row["id"] is not None else None
        if option is None:
            Option.objects.create(
                question=question,
                label=row["label"],
                is_correct=row["is_correct"],
                order=row.get("order", index),
            )
        else:
            option.label = row["label"]
            option.is_correct = row["is_correct"]
            option.order = row.get("order", index)
            option.save(update_fields=["label", "is_correct", "order"])
    if removed_ids:
        question.options.filter(pk__in=removed_ids).delete()


def _parse_import(request) -> tuple[list[dict[str, Any]], str]:
    body = request.data
    if isinstance(body, dict) and "rows" in body:
        rows, fmt = body["rows"], "json"
    elif isinstance(body, dict) and "csv" in body:
        rows, fmt = body["csv"], "csv"
    elif request.content_type == "text/csv":
        rows, fmt = request.body.decode("utf-8"), "csv"
    else:
        raise InvalidParameter("يجب إرسال rows بصيغة JSON أو csv.")
    if fmt == "csv":
        if not isinstance(rows, str) or len(rows.encode()) > 1_000_000:
            raise InvalidParameter("ملف CSV كبير جدًا.")
        parsed = list(csv.DictReader(io.StringIO(rows)))
    else:
        if not isinstance(rows, list) or len(rows) > IMPORT_ROW_CAP:
            raise InvalidParameter("عدد صفوف الاستيراد غير صالح.")
        parsed = rows
    if len(parsed) > IMPORT_ROW_CAP:
        raise InvalidParameter("عدد صفوف الاستيراد غير صالح.")
    return parsed, fmt


def _import_row(row: Any, index: int) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    if not isinstance(row, dict):
        return None, {"row": index, "errors": ["row_not_object"]}
    try:
        options = row.get("options")
        if isinstance(options, str):
            options = json.loads(options)
        data = {
            "kind": row.get("kind", QuestionKind.SINGLE),
            "prompt": row.get("prompt", ""),
            "code": row.get("code", ""),
            "explanation": row.get("explanation", ""),
            "hint": row.get("hint", ""),
            "points": int(row.get("points", 1)),
            "partialCredit": row.get("partialCredit", False) in (True, "true", "1", 1),
            "options": options,
        }
        values, option_rows = _question_values(data)
        values["_options"] = option_rows
        return values, None
    except (InvalidParameter, ValueError, TypeError) as exc:
        return None, {"row": index, "errors": [str(getattr(exc, "detail", exc))]}


@extend_schema_view(
    get=extend_schema(
        operation_id="studio_quiz_list",
        parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    ),
    post=extend_schema(
        operation_id="studio_quiz_create",
        parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    ),
)
@api_view(["GET", "POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def course_quizzes(request, slug):
    course = _course(slug)
    _author(request.user, course)
    if request.method == "GET":
        return _private(
            Response({"items": [_quiz_row(q) for q in course.quizzes.prefetch_related("questions__options").all()]})
        )
    if not has_perm(request.user, "quizzes.create"):
        raise PermissionDenied()
    quiz = Quiz.objects.create(
        course=course, created_by=request.user, **_quiz_values(_body(request), course, creating=True)
    )
    return _private(Response(_quiz_row(quiz), status=status.HTTP_201_CREATED))


@extend_schema_view(
    get=extend_schema(
        operation_id="studio_quiz_detail",
        parameters=[OpenApiParameter("quiz_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    ),
    patch=extend_schema(
        operation_id="studio_quiz_update",
        parameters=[OpenApiParameter("quiz_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
        request=OpenApiTypes.OBJECT,
        responses={
            200: OpenApiResponse(response=OpenApiTypes.OBJECT),
            409: OpenApiResponse(response=OpenApiTypes.OBJECT),
        },
    ),
    delete=extend_schema(
        operation_id="studio_quiz_delete",
        parameters=[OpenApiParameter("quiz_id", OpenApiTypes.UUID, OpenApiParameter.PATH)],
        responses={
            200: OpenApiResponse(response=OpenApiTypes.OBJECT),
            409: OpenApiResponse(response=OpenApiTypes.OBJECT),
        },
    ),
)
@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def quiz_detail(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    if request.method == "GET":
        return _private(Response(_quiz_row(quiz)))
    if request.method == "PATCH":
        quiz = _update_quiz(quiz_id, _body(request))
        return _private(Response(_quiz_row(quiz)))
    if quiz.attempts.exists():
        return _private(
            Response(
                {"detail": "لا يمكن حذف اختبار له محاولات.", "code": "has_attempts"}, status=status.HTTP_409_CONFLICT
            )
        )
    quiz.delete()
    return _private(Response({"deleted": True, "id": str(quiz_id)}))


@extend_schema(
    operation_id="studio_quiz_publish",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT), 422: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def publish_quiz(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    issues = services.validate_quiz(quiz)
    if issues:
        response = Response(
            {"detail": "الاختبار غير جاهز للنشر.", "code": "not_publishable", "fields": {"issues": issues}}, status=422
        )
        return _private(response)
    quiz.is_published = True
    quiz.save(update_fields=["is_published", "updated_at"])
    return _private(Response(_quiz_row(quiz)))


@extend_schema(
    operation_id="studio_quiz_unpublish",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def unpublish_quiz(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    quiz.is_published = False
    quiz.save(update_fields=["is_published", "updated_at"])
    return _private(Response(_quiz_row(quiz)))


@extend_schema(
    operation_id="studio_question_create",
    request=OpenApiTypes.OBJECT,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def create_question(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    values, options = _question_values(_body(request))
    if options is None:
        raise InvalidParameter("خيارات السؤال مطلوبة.")
    values["quiz"] = quiz
    question = Question.objects.create(**values)
    _replace_options(question, options)
    return _private(Response(_question_row(question), status=status.HTTP_201_CREATED))


@extend_schema(
    operation_id="studio_questions_reorder",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def reorder_questions(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    data = _body(request)
    _strict(data, {"orderedIds"})
    ids = data.get("orderedIds")
    current = list(quiz.questions.values_list("id", flat=True))
    if not isinstance(ids, list) or {str(x) for x in ids} != {str(x) for x in current}:
        raise InvalidParameter("ترتيب الأسئلة لا يطابق بنك الأسئلة.")
    with transaction.atomic():
        for order, pk in enumerate(ids):
            Question.objects.filter(pk=pk, quiz=quiz).update(order=order)
    return _private(Response({"items": [_question_row(q) for q in quiz.questions.prefetch_related("options").all()]}))


@extend_schema_view(
    put=extend_schema(
        operation_id="studio_question_update",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    ),
    delete=extend_schema(
        operation_id="studio_question_delete",
        responses={
            200: OpenApiResponse(response=OpenApiTypes.OBJECT),
            409: OpenApiResponse(response=OpenApiTypes.OBJECT),
        },
    ),
)
@api_view(["PUT", "DELETE"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def question_detail(request, question_id):
    question = _question(question_id)
    _author(request.user, question.quiz)
    previous = Answer.objects.filter(question=question).count()
    if request.method == "DELETE":
        with transaction.atomic():
            locked_quiz = Quiz.objects.select_for_update().get(pk=question.quiz_id)
            if locked_quiz.attempts.exists():
                raise Conflict("لا يمكن حذف سؤال بعد بدء المحاولات.", code="has_attempts")
            question.delete()
        return _private(Response({"deleted": True, "id": str(question_id), "previousAnswerCount": previous}))
    values, options = _question_values(_body(request), default_kind=question.kind)
    with transaction.atomic():
        Quiz.objects.select_for_update().get(pk=question.quiz_id)
        if options is not None:
            _replace_options(question, options)
        for key, value in values.items():
            setattr(question, key, value)
        question.save()
    row = _question_row(question)
    row["previousAnswerCount"] = previous
    return _private(Response(row))


@extend_schema(
    operation_id="studio_questions_import",
    request={"application/json": OpenApiTypes.OBJECT, "text/csv": OpenApiTypes.STR},
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def import_questions(request, quiz_id):
    quiz = _quiz(quiz_id)
    _author(request.user, quiz)
    rows, _fmt = _parse_import(request)
    valid, errors = [], []
    for index, row in enumerate(rows, 1):
        item, error = _import_row(row, index)
        if error:
            errors.append(error)
        else:
            valid.append(item)
    dry_run = True if not isinstance(request.data, dict) else request.data.get("dryRun", True)
    if not isinstance(dry_run, bool):
        raise InvalidParameter("dryRun غير صالح.")
    committed = 0
    if not dry_run:
        with transaction.atomic():
            for item in valid:
                options = item.pop("_options")
                question = Question.objects.create(quiz=quiz, **item)
                _replace_options(question, options)
                committed += 1
    return _private(Response({"dryRun": dry_run, "committed": committed, "valid": len(valid), "errors": errors}))


@extend_schema(
    operation_id="studio_quiz_stats",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def quiz_stats(request, quiz_id):
    quiz = _quiz(quiz_id)
    _results(request.user, quiz)
    return _private(Response(services.quiz_stats(quiz)))


@extend_schema(
    operation_id="studio_quiz_attempts",
    parameters=[
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("pageSize", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def quiz_attempts(request, quiz_id):
    quiz = _quiz(quiz_id)
    _results(request.user, quiz)
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(PAGE_SIZE_CAP, max(1, int(request.query_params.get("pageSize", 20))))
    except TypeError, ValueError:
        raise InvalidParameter("معامل الصفحة غير صالح.") from None
    qs = (
        Attempt.objects.filter(quiz=quiz)
        .exclude(status=AttemptStatus.IN_PROGRESS)
        .select_related("user")
        .order_by("started_at", "pk")
    )
    total = qs.count()
    rows = qs[(page - 1) * page_size : page * page_size]
    return _private(
        Response(
            {
                "page": page,
                "pageSize": page_size,
                "total": total,
                "results": [
                    {
                        "id": str(a.pk),
                        "userId": str(a.user_id),
                        "name": a.user.full_name,
                        "status": a.status,
                        "startedAt": a.started_at.isoformat(),
                        "submittedAt": a.submitted_at.isoformat() if a.submitted_at else None,
                        "percent": a.percent,
                        "passed": a.passed,
                    }
                    for a in rows
                ],
            }
        )
    )


def _csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@")) else text


@extend_schema(
    operation_id="studio_quiz_results_csv",
    responses={(200, "text/csv"): OpenApiResponse(response=OpenApiTypes.BINARY, description="CSV attempt export.")},
)
@api_view(["GET"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
def quiz_results_csv(request, quiz_id):
    quiz = _quiz(quiz_id)
    _results(request.user, quiz)
    attempts = (
        Attempt.objects.filter(quiz=quiz)
        .exclude(status=AttemptStatus.IN_PROGRESS)
        .select_related("user")
        .order_by("started_at", "pk")
    )

    def stream():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["attemptId", "userId", "name", "status", "percent", "passed"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        for attempt in attempts:
            writer.writerow(
                [
                    _csv_cell(x)
                    for x in (
                        attempt.pk,
                        attempt.user_id,
                        attempt.user.full_name,
                        attempt.status,
                        attempt.percent,
                        attempt.passed,
                    )
                ]
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    response = StreamingHttpResponse(stream(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="quiz-{quiz.pk}-results.csv"'
    response["Cache-Control"] = NO_STORE
    return response


@extend_schema(
    operation_id="studio_quiz_extra_attempts",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["POST"])
@authentication_classes([AccessTokenAuthentication])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def extra_attempts(request, quiz_id):
    quiz = _quiz(quiz_id)
    if not has_perm(request.user, "quizzes.reset_attempts"):
        raise PermissionDenied()
    data = _body(request)
    _strict(data, {"userId", "count", "note"})
    try:
        user = User.objects.get(pk=data.get("userId"))
    except User.DoesNotExist, ValueError, TypeError:
        raise InvalidParameter("المستخدم غير موجود.") from None
    count = _int(data.get("count"), "count", minimum=1)
    grant = services.grant_extra_attempt(request.user, quiz, user, count, data.get("note", ""))
    return _private(
        Response(
            {
                "id": str(grant.pk),
                "quizId": str(quiz.pk),
                "userId": str(user.pk),
                "extra": grant.extra,
                "note": grant.note,
            }
        )
    )
