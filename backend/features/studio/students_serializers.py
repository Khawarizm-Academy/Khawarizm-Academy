"""Serializers and response shaping for the isolated Studio students API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from rest_framework import serializers

from features.common.serializers import compact


class StudentsRosterRequest(serializers.Serializer):
    """Strict query values are validated by the view before ORM work."""

    course = serializers.CharField(required=False, allow_blank=False, max_length=80)
    q = serializers.CharField(required=False, allow_blank=True, max_length=100)
    status = serializers.ChoiceField(required=False, choices=("active", "struggling", "completed"))
    sort = serializers.ChoiceField(
        required=False,
        choices=("name", "progress", "lastActive", "quizAverage"),
        default="name",
    )
    page = serializers.IntegerField(required=False, min_value=1, max_value=10000, default=1)


class StudentActionRequest(serializers.Serializer):
    course = serializers.CharField(required=True, allow_blank=False, max_length=80)
    message = serializers.CharField(required=False, allow_blank=True, max_length=200)


class StudentNoteRequest(serializers.Serializer):
    course = serializers.CharField(required=True, allow_blank=False, max_length=80)
    body = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True, max_length=2000)


class ExtraAttemptRequest(serializers.Serializer):
    course = serializers.CharField(required=True, allow_blank=False, max_length=80)
    quizId = serializers.UUIDField(required=True)
    count = serializers.IntegerField(required=False, min_value=1, max_value=100, default=1)
    note = serializers.CharField(required=False, allow_blank=True, max_length=200)


def mask_email(email: str) -> str:
    """Return a one-character local part plus a complete, safe domain."""
    local, separator, domain = (email or "").partition("@")
    if not separator or not domain:
        return "***"
    first = local[:1] or "*"
    return f"{first}***@{domain}"


def display_name(user: Any) -> str:
    """Fail closed if legacy display data accidentally contains the email."""
    name = (getattr(user, "full_name", "") or "").strip()
    email = (getattr(user, "email", "") or "").strip()
    if name and email and email.casefold() not in name.casefold():
        return name
    return mask_email(email).split("@", 1)[0]


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def roster_row(row: Any, *, can_view_any: bool, now: datetime) -> dict[str, Any]:
    user = row.user
    return compact(
        id=str(user.pk),
        name=display_name(user),
        avatarUrl=user.avatar_url,
        avatarInitials=user.avatar_initials,
        email=user.email if can_view_any else mask_email(user.email),
        progress=int(row.progress or 0),
        completedLessons=int(row.completed_lessons or 0),
        totalLessons=int(row.total_lessons or 0),
        lastActive=_iso(row.last_active_at),
        quizAverage=float(row.quiz_average) if row.quiz_average is not None else None,
        status=row.roster_status,
        course=compact(id=str(row.course.slug), slug=row.course.slug, title=row.course.title),
    )


def course_option(course: Any) -> dict[str, Any]:
    return compact(
        id=course.slug,
        slug=course.slug,
        title=course.title,
        enrolledCount=int(getattr(course, "student_count", 0) or 0),
    )


def lesson_detail(row: Any) -> dict[str, Any]:
    progress = getattr(row, "_student_progress", None)
    return compact(
        id=str(row.pk),
        lessonId=row.lesson_id,
        title=row.title,
        moduleTitle=row.module.title,
        completed=bool(progress.completed) if progress else False,
        watchedSeconds=int(progress.watched_seconds) if progress else 0,
        durationSeconds=int(row.duration_seconds or (progress.duration_seconds if progress else 0) or 0),
        updatedAt=_iso(progress.updated_at if progress else None),
    )


def attempt_detail(attempt: Any) -> dict[str, Any]:
    return compact(
        id=str(attempt.pk),
        quizId=str(attempt.quiz_id),
        quizTitle=attempt.quiz.title,
        status=attempt.status,
        score=float(attempt.score),
        maxScore=float(attempt.max_score),
        percent=attempt.percent,
        passed=attempt.passed,
        startedAt=_iso(attempt.started_at),
        submittedAt=_iso(attempt.submitted_at),
    )


def student_detail(
    enrollment: Any,
    *,
    lessons: list[Any],
    attempts: list[Any],
    can_view_any: bool,
    notes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    user = enrollment.user
    return compact(
        id=str(user.pk),
        name=display_name(user),
        avatarUrl=user.avatar_url,
        avatarInitials=user.avatar_initials,
        email=user.email if can_view_any else mask_email(user.email),
        course=compact(id=enrollment.course.slug, slug=enrollment.course.slug, title=enrollment.course.title),
        progress=int(enrollment.progress or 0),
        completed=enrollment.is_completed or enrollment.progress >= 100,
        lessons=[lesson_detail(row) for row in lessons],
        attempts=[attempt_detail(row) for row in attempts],
        notes=notes or [],
    )


def nudge_response(notification: Any, *, next_allowed_at: datetime) -> dict[str, Any]:
    return compact(
        id=str(notification.pk),
        sentAt=_iso(notification.created_at),
        nextAllowedAt=_iso(next_allowed_at),
    )


def student_note_payload(note: Any) -> dict[str, Any]:
    return compact(
        id=str(note.pk),
        body=note.body,
        authorName=note.author_name,
        createdAt=_iso(note.created_at),
    )


def grant_response(grant: Any, quiz: Any, user: Any) -> dict[str, Any]:
    return compact(
        id=str(grant.pk),
        quizId=str(quiz.pk),
        userId=str(user.pk),
        extra=int(grant.extra),
        note=grant.note,
    )
