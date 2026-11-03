from __future__ import annotations

import logging
import random
import time
from collections.abc import Mapping
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q
from django.utils import timezone

from features.access.registry import OWN_KINDS
from features.access.services import has_object_perm, has_perm, record_audit
from features.common.choices import AuditAction
from features.common.errors import Conflict, InvalidParameter, PermissionDenied
from features.common.observability import log_event

from .models import (
    Answer,
    Attempt,
    AttemptGrant,
    AttemptStatus,
    Question,
    QuestionKind,
    Quiz,
    QuizKind,
    RevealPolicy,
)
from .serializers import attempt_payload, result_payload
from .signals import on_exam_passed, on_quiz_submitted

LOGGER = logging.getLogger(__name__)

GRACE_SECONDS = 10


def can_author(user: Any, quiz_or_course: Any) -> bool:
    course = getattr(quiz_or_course, "course", quiz_or_course)
    if has_perm(user, "quizzes.edit_any"):
        return True
    kinds = course.staff.filter(user=user).values_list("kind", flat=True)
    return has_object_perm(user, "quizzes.edit_own", list(kinds)) and bool(set(kinds) & OWN_KINDS["quizzes.edit_own"])


def validate_quiz(quiz: Quiz) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    questions = list(quiz.questions.prefetch_related("options").all())
    if not questions:
        issues.append({"code": "no_questions", "detail": "يجب إضافة سؤال واحد على الأقل."})
    for question in questions:
        options = list(question.options.all())
        correct = [option for option in options if option.is_correct]
        valid = (
            len(correct) == 1
            if question.kind in (QuestionKind.SINGLE, QuestionKind.TRUE_FALSE)
            else len(correct) >= 1 and len(options) >= 2
        )
        if question.kind == QuestionKind.TRUE_FALSE and len(options) != 2:
            valid = False
        if question.partial_credit and question.kind != QuestionKind.MULTIPLE:
            valid = False
        if not valid:
            issues.append(
                {"code": "invalid_options", "questionId": str(question.pk), "detail": "بنية خيارات السؤال غير صالحة."}
            )
    if quiz.draw_count and quiz.draw_count > len(questions):
        issues.append({"code": "draw_count", "detail": "عدد الأسئلة المسحوبة يتجاوز بنك الأسئلة."})
    if quiz.kind == QuizKind.EXAM and not 1 <= quiz.pass_threshold <= 100:
        issues.append({"code": "pass_threshold", "detail": "نسبة النجاح يجب أن تكون بين 1 و100."})
    if quiz.time_limit_minutes is not None and not 1 <= quiz.time_limit_minutes <= 600:
        issues.append({"code": "time_limit", "detail": "مدة الاختبار يجب أن تكون بين دقيقة و600 دقيقة."})
    if not 0 <= quiz.unlock_progress_percent <= 100:
        issues.append({"code": "unlock_progress", "detail": "نسبة فتح الاختبار غير صالحة."})
    return issues


def _enrollment(user: Any, quiz: Quiz):
    from features.dashboard.models import Enrollment

    return Enrollment.objects.filter(
        user=user, course=quiz.course, course__status__in=("published", "archived")
    ).first()


def _attempts_left(user: Any, quiz: Quiz) -> int | None:
    if quiz.max_attempts is None:
        return None
    used = Attempt.objects.filter(
        user=user, quiz=quiz, status__in=(AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED)
    ).count()
    extra = AttemptGrant.objects.filter(user=user, quiz=quiz).values_list("extra", flat=True).first() or 0
    return max(0, quiz.max_attempts + extra - used)


def _expire_if_needed(attempt: Attempt, now=None) -> Attempt:
    now = now or timezone.now()
    if (
        attempt.status == AttemptStatus.IN_PROGRESS
        and attempt.deadline_at
        and now > attempt.deadline_at + timedelta(seconds=GRACE_SECONDS)
    ):
        return submit_attempt(attempt, expired=True, now=now)
    return attempt


@transaction.atomic
def expire_attempt_if_needed(attempt: Attempt, now=None) -> Attempt:
    """Refresh and deadline-check an attempt before any learner read/submit."""
    current = Attempt.objects.select_for_update().select_related("quiz").get(pk=attempt.pk)
    return _expire_if_needed(current, now)


def start_attempt(user: Any, quiz: Quiz, *, now=None) -> Attempt:
    now = now or timezone.now()
    if not has_perm(user, "quizzes.attempt"):
        raise PermissionDenied("لا تملك صلاحية حل الاختبار.")
    with transaction.atomic():
        quiz = Quiz.objects.select_for_update().select_related("course").get(pk=quiz.pk)
        if not quiz.is_published or quiz.course.status not in ("published", "archived"):
            raise PermissionDenied("لا يمكنك بدء هذا الاختبار.")
        enrollment = _enrollment(user, quiz)
        if enrollment is None:
            raise PermissionDenied("لا يمكنك بدء هذا الاختبار.")
        enrollment = type(enrollment).objects.select_for_update().get(pk=enrollment.pk)
        if enrollment.progress < quiz.unlock_progress_percent:
            raise Conflict("لم تفتح الاختبار بعد.", code="quiz_locked")
        live = (
            Attempt.objects.select_for_update().filter(user=user, quiz=quiz, status=AttemptStatus.IN_PROGRESS).first()
        )
        if live:
            return _expire_if_needed(live, now)
        left = _attempts_left(user, quiz)
        if left == 0:
            raise Conflict("لا توجد محاولات متبقية.")
        questions = list(quiz.questions.prefetch_related("options").all())
        rng = random.Random()
        if quiz.draw_count:
            questions = rng.sample(questions, quiz.draw_count)
        if quiz.shuffle_questions:
            rng.shuffle(questions)
        option_order = {}
        for question in questions:
            ids = [str(option.pk) for option in question.options.all()]
            if quiz.shuffle_options:
                rng.shuffle(ids)
            option_order[str(question.pk)] = ids
        deadline = now + timedelta(minutes=quiz.time_limit_minutes) if quiz.time_limit_minutes else None
        try:
            with transaction.atomic():
                return Attempt.objects.create(
                    quiz=quiz,
                    user=user,
                    started_at=now,
                    deadline_at=deadline,
                    pass_threshold=quiz.pass_threshold,
                    reveal_policy=quiz.reveal_policy,
                    question_order=[str(q.pk) for q in questions],
                    option_order=option_order,
                    max_score=sum(q.points for q in questions),
                )
        except IntegrityError:
            live = (
                Attempt.objects.select_for_update()
                .filter(user=user, quiz=quiz, status=AttemptStatus.IN_PROGRESS)
                .first()
            )
            if live is None:
                raise
            return _expire_if_needed(live, now)


@transaction.atomic
def save_answers(attempt: Attempt, items: list[Mapping[str, Any]], *, now=None) -> Attempt:
    now = now or timezone.now()
    attempt = Attempt.objects.select_for_update().get(pk=attempt.pk)
    attempt = _expire_if_needed(attempt, now)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise Conflict("انتهت المحاولة.")
    allowed = set(attempt.question_order)
    for item in items:
        question_id = str(item.get("questionId", item.get("question_id", "")))
        selected = item.get("optionIds", item.get("option_ids", []))
        if question_id not in allowed or not isinstance(selected, list) or len(selected) != len(set(selected)):
            raise InvalidParameter("إجابات المحاولة غير صالحة.")
        question = Question.objects.get(pk=question_id)
        valid_options = set(str(value) for value in question.options.values_list("id", flat=True))
        if not set(map(str, selected)) <= valid_options:
            raise InvalidParameter("الخيار لا ينتمي إلى السؤال.")
        Answer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={"selected": list(map(str, selected)), "is_correct": None, "points_awarded": 0},
        )
    return attempt


def _grade(question: Question, selected: set[str]) -> tuple[bool, Decimal]:
    correct = {str(option.pk) for option in question.options.all() if option.is_correct}
    points = Decimal(question.points)
    if question.kind != QuestionKind.MULTIPLE or not question.partial_credit:
        return selected == correct, points if selected == correct else Decimal(0)
    right = len(selected & correct)
    wrong = len(selected - correct)
    awarded = max(Decimal(0), points * Decimal(right - wrong) / Decimal(len(correct)))
    return selected == correct, awarded.quantize(Decimal("0.01"))


@transaction.atomic
def submit_attempt(attempt: Attempt, *, expired: bool = False, now=None) -> Attempt:
    now = now or timezone.now()
    graded_started = time.perf_counter()
    attempt = Attempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return attempt
    expired = expired or bool(attempt.deadline_at and now > attempt.deadline_at + timedelta(seconds=GRACE_SECONDS))
    answers = {answer.question_id: answer for answer in attempt.answers.select_related("question")}
    total = Decimal(0)
    max_score = Decimal(0)
    for question in Question.objects.filter(pk__in=attempt.question_order).prefetch_related("options"):
        answer = answers.get(question.pk)
        selected = set(answer.selected) if answer else set()
        correct_option_ids = [str(option.pk) for option in question.options.all() if option.is_correct]
        correct, points = _grade(question, selected)
        max_score += Decimal(question.points)
        if answer:
            answer.is_correct, answer.points_awarded = correct, points
            answer.correct_option_ids = correct_option_ids
            answer.save(update_fields=["is_correct", "points_awarded", "correct_option_ids"])
        else:
            Answer.objects.create(
                attempt=attempt,
                question=question,
                selected=[],
                correct_option_ids=correct_option_ids,
                is_correct=correct,
                points_awarded=points,
            )
        total += points
    percent = int((total * 100 / max_score).quantize(Decimal("1"), rounding=ROUND_HALF_UP)) if max_score else 0
    attempt.score, attempt.max_score, attempt.percent = total, max_score, percent
    attempt.passed, attempt.status, attempt.submitted_at = (
        percent >= attempt.pass_threshold,
        AttemptStatus.EXPIRED if expired else AttemptStatus.SUBMITTED,
        now,
    )
    attempt.save(update_fields=["score", "max_score", "percent", "passed", "status", "submitted_at", "updated_at"])
    # Phase 13 §13.4: grading duration is the quiz feature's one performance
    # signal — a slow submit is almost always an N+1 or a huge question order.
    log_event(
        LOGGER,
        "attempt graded",
        attempt=str(attempt.pk),
        quiz=str(attempt.quiz_id),
        questions=len(attempt.question_order),
        expired=bool(expired),
        duration_ms=round((time.perf_counter() - graded_started) * 1000, 1),
    )
    transaction.on_commit(lambda: on_quiz_submitted.send(sender=Attempt, attempt=attempt))
    if attempt.quiz.kind == QuizKind.EXAM and attempt.passed:
        transaction.on_commit(lambda: on_exam_passed.send(sender=Attempt, attempt=attempt))
    return attempt


def result_view(attempt: Attempt, viewer: Any) -> dict[str, Any]:
    policy = attempt.reveal_policy
    left = _attempts_left(viewer, attempt.quiz)
    feedback = (
        policy == RevealPolicy.AFTER_SUBMIT
        or (policy == RevealPolicy.AFTER_PASS and attempt.passed)
        or (policy == RevealPolicy.AFTER_CLOSE and left == 0)
    )
    return result_payload(attempt, feedback=feedback)


def check_practice_answer(user: Any, question: Question, option_ids: list[str]) -> dict[str, Any]:
    if question.quiz.kind != QuizKind.PRACTICE:
        raise PermissionDenied("هذا السؤال ليس للتدريب.", code="not_practice")
    valid = {str(value) for value in question.options.values_list("id", flat=True)}
    selected = set(map(str, option_ids))
    if not selected or not selected <= valid:
        raise InvalidParameter("الخيار لا ينتمي إلى السؤال.")
    correct = [str(value) for value in question.options.filter(is_correct=True).values_list("id", flat=True)]
    return {
        "correct": selected == set(correct),
        "correctOptionIds": correct,
        "explanation": question.explanation,
        "hint": question.hint,
    }


def check_legacy_problem_answer(user: Any, legacy_problem: Any, option_ids: list[str]) -> dict[str, Any]:
    """Grade a retained ``CourseProblem`` without exposing its key in reads."""
    valid = {str(option.option_id) for option in legacy_problem.options.all()}
    selected = {str(option_id) for option_id in option_ids}
    if not selected <= valid:
        raise InvalidParameter("الخيار لا ينتمي إلى المسألة.")
    correct_id = str(legacy_problem.correct_option_id)
    return {
        "correct": selected == {correct_id},
        "correctOptionIds": [correct_id],
        "explanation": legacy_problem.explanation,
        "hint": legacy_problem.hint,
    }


def active_attempt_payload(attempt: Attempt) -> dict[str, Any]:
    """Return the safe in-progress shape without correctness or author hints."""
    return attempt_payload(attempt)


@transaction.atomic
def grant_extra_attempt(actor: Any, quiz: Quiz, user: Any, count: int, note: str = "") -> AttemptGrant:
    staff_kinds = list(quiz.course.staff.filter(user=actor).values_list("kind", flat=True))
    if not has_perm(actor, "quizzes.reset_attempts") or not (
        has_perm(actor, "quizzes.edit_any") or has_object_perm(actor, "quizzes.reset_attempts", staff_kinds)
    ):
        raise PermissionDenied("لا تملك صلاحية منح محاولة إضافية.")
    if not isinstance(count, int) or isinstance(count, bool) or not 1 <= count <= 100:
        raise InvalidParameter("عدد المحاولات غير صالح.")
    if not isinstance(note, str):
        raise InvalidParameter("ملاحظة المنح غير صالحة.")
    if _enrollment(user, quiz) is None:
        raise InvalidParameter("الطالب غير مسجل في الدورة.")
    Quiz.objects.select_for_update().get(pk=quiz.pk)
    grant = AttemptGrant.objects.select_for_update().filter(quiz=quiz, user=user).first()
    if grant is None:
        grant = AttemptGrant.objects.create(quiz=quiz, user=user, extra=count, granted_by=actor, note=note[:200])
    else:
        grant.extra += count
        grant.granted_by = actor
        grant.note = note[:200]
        grant.save(update_fields=["extra", "granted_by", "note", "updated_at"])
    record_audit(
        AuditAction.QUIZ_ATTEMPT_GRANTED,
        actor=actor,
        target_type="quiz",
        target_id=quiz.pk,
        detail={"user": str(user.pk), "extra": count, "note": note},
    )
    return grant


def quiz_stats(quiz: Quiz) -> dict[str, Any]:
    attempts = Attempt.objects.filter(quiz=quiz).exclude(status=AttemptStatus.IN_PROGRESS).exclude(percent__isnull=True)
    aggregates: dict[str, Any] = {
        "attempts": Count("pk"),
        "mean": Avg("percent"),
        "passed": Count("pk", filter=Q(passed=True)),
        "mean_duration": Avg(
            ExpressionWrapper(F("submitted_at") - F("started_at"), output_field=DurationField()),
            filter=Q(submitted_at__isnull=False),
        ),
    }
    for index in range(10):
        low, high = index * 10, 100 if index == 9 else index * 10 + 9
        aggregates[f"band_{index}"] = Count("pk", filter=Q(percent__gte=low, percent__lte=high))
    summary = attempts.aggregate(**aggregates)
    total = summary["attempts"]
    median_values = []
    if total:
        low_index, high_index = (total - 1) // 2, total // 2
        median_values = list(
            attempts.order_by("percent", "pk").values_list("percent", flat=True)[low_index : high_index + 1]
        )
    median = sum(median_values) / len(median_values) if median_values else 0
    histogram = {
        f"{index * 10}-{100 if index == 9 else index * 10 + 9}": summary[f"band_{index}"] for index in range(10)
    }

    questions = list(quiz.questions.prefetch_related("options").all())
    correct_by_question = {
        str(question.pk): {str(option.pk) for option in question.options.all() if option.is_correct}
        for question in questions
    }
    totals: dict[str, int] = {}
    correct_counts: dict[str, int] = {}
    wrong_picks: dict[str, dict[str, int]] = {}
    rows = Answer.objects.filter(
        attempt__quiz=quiz,
        attempt__status__in=(AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED),
    ).values_list("question_id", "is_correct", "selected")
    for question_id, is_correct, selected in rows:
        question_key = str(question_id)
        totals[question_key] = totals.get(question_key, 0) + 1
        if is_correct:
            correct_counts[question_key] = correct_counts.get(question_key, 0) + 1
        else:
            wrong_counts = wrong_picks.setdefault(question_key, {})
            for option_id in selected:
                option_key = str(option_id)
                if option_key not in correct_by_question.get(question_key, set()):
                    wrong_counts[option_key] = wrong_counts.get(option_key, 0) + 1
    per_question = []
    for question in questions:
        question_key = str(question.pk)
        wrong_counts = wrong_picks.get(question_key, {})
        most_wrong = (
            min(wrong_counts, key=lambda option_id: (-wrong_counts[option_id], option_id)) if wrong_counts else None
        )
        per_question.append(
            {
                "questionId": question_key,
                "correctPercent": (
                    round(correct_counts.get(question_key, 0) * 100 / totals[question_key], 2)
                    if totals.get(question_key)
                    else 0
                ),
                "mostChosenWrongOptionId": most_wrong,
            }
        )
    return {
        "attempts": total,
        "completion": total,
        "meanScore": float(summary["mean"] or 0),
        "medianScore": median,
        "passRate": summary["passed"] / total if total else 0,
        "scoreHistogram": histogram,
        "perQuestion": per_question,
        "meanDurationSeconds": summary["mean_duration"].total_seconds() if summary["mean_duration"] else 0,
    }


def expire_overdue() -> int:
    count = 0
    for attempt in Attempt.objects.filter(
        status=AttemptStatus.IN_PROGRESS, deadline_at__lt=timezone.now() - timedelta(seconds=GRACE_SECONDS)
    ):
        refreshed = expire_attempt_if_needed(attempt)
        count += int(refreshed.status == AttemptStatus.EXPIRED)
    return count
