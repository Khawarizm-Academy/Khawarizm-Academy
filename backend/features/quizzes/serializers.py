"""Small safe quiz payload builders shared by learner endpoints and services."""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from .models import Attempt, Option, Question


def option_payload(option: Option) -> dict[str, Any]:
    """A learner option contains its label and opaque ID, never correctness."""
    return {"id": str(option.pk), "label": option.label}


def question_payload(question: Question, option_ids: list[str] | None = None) -> dict[str, Any]:
    options = {str(option.pk): option for option in question.options.all()}
    ordered = option_ids or [str(option.pk) for option in question.options.all()]
    return {
        "id": str(question.pk),
        "kind": question.kind,
        "prompt": question.prompt,
        "code": question.code,
        "points": question.points,
        "options": [option_payload(options[option_id]) for option_id in ordered if option_id in options],
    }


def attempt_payload(attempt: Attempt) -> dict[str, Any]:
    """Serialize an active attempt without keys, hints, or explanations.

    Persisted snapshots, not live model ordering, determine the question/option
    sequence. `serverNow` is generated on every response so a reload computes a
    correct offset instead of comparing against the original start time.
    """
    questions = {str(question.pk): question for question in attempt.quiz.questions.prefetch_related("options").all()}
    answers = [
        {"questionId": str(answer.question_id), "optionIds": list(answer.selected)}
        for answer in attempt.answers.all().order_by("question_id")
    ]
    return {
        "attemptId": str(attempt.pk),
        "serverNow": timezone.now().isoformat(),
        "deadlineAt": attempt.deadline_at.isoformat() if attempt.deadline_at else None,
        "status": attempt.status,
        "questions": [
            question_payload(questions[question_id], attempt.option_order.get(question_id, []))
            for question_id in attempt.question_order
            if question_id in questions
        ],
        "answers": answers,
    }


def result_payload(attempt: Attempt, *, feedback: bool) -> dict[str, Any]:
    """Build the only finished-attempt payload that may disclose correctness."""
    payload: dict[str, Any] = {
        "attemptId": str(attempt.pk),
        "status": attempt.status,
        "score": str(attempt.score),
        "maxScore": str(attempt.max_score),
        "percent": attempt.percent,
        "passed": attempt.passed,
        "revealPolicy": attempt.quiz.reveal_policy,
        "feedbackAvailable": feedback,
    }
    if not feedback:
        return payload

    answers = {str(answer.question_id): answer for answer in attempt.answers.select_related("question")}
    questions = {
        str(question.pk): question
        for question in Question.objects.filter(pk__in=attempt.question_order).prefetch_related("options")
    }
    result_questions = []
    for question_id in attempt.question_order:
        question = questions.get(question_id)
        if question is None:
            continue
        answer = answers.get(question_id)
        result_questions.append(
            {
                "questionId": question_id,
                "optionIds": list(answer.selected) if answer else [],
                "correctOptionIds": answer.correct_option_ids
                if answer and answer.correct_option_ids
                else [str(option.pk) for option in question.options.all() if option.is_correct],
                "correct": bool(answer.is_correct) if answer else False,
                "explanation": question.explanation,
            }
        )
    payload["questions"] = result_questions
    return payload
