"""Atomic learner watch-progress recording for course lessons."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone

from features.access.services import has_perm
from features.common.choices import CourseStatus
from features.common.errors import InvalidParameter, NotFound, PermissionDenied
from features.courses.models import CourseLesson, LessonProgress
from features.dashboard.models import Enrollment

_PROGRESS_KEYS = frozenset({"positionSeconds", "durationSeconds", "watchedDeltaSeconds"})
_MAX_WATCHED_DELTA_SECONDS = 45
_MAX_REQUEST_DURATION_SECONDS = 12 * 60 * 60


def _authenticated(user: Any) -> bool:
    state = getattr(user, "_state", None)
    return bool(
        user is not None
        and getattr(user, "is_authenticated", False)
        and getattr(user, "pk", None) is not None
        and not getattr(state, "adding", False)
    )


def _nonnegative_int(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise InvalidParameter(f"قيمة {field} غير صالحة.")
    return value


def _payload_values(payload: Any) -> tuple[int, int, int]:
    if not isinstance(payload, Mapping) or set(payload) != _PROGRESS_KEYS:
        raise InvalidParameter("حقول تقدّم الفيديو غير صالحة.")
    return (
        _nonnegative_int(payload["positionSeconds"], "positionSeconds"),
        _nonnegative_int(payload["durationSeconds"], "durationSeconds"),
        _nonnegative_int(payload["watchedDeltaSeconds"], "watchedDeltaSeconds"),
    )


def _lesson_for_progress(lesson: CourseLesson) -> CourseLesson:
    try:
        return CourseLesson.objects.select_related("module__course", "video_asset").get(pk=lesson.pk)
    except (CourseLesson.DoesNotExist, ValueError, TypeError) as exc:
        raise NotFound("الدرس غير موجود.") from exc


def _require_access(user: Any, lesson: CourseLesson) -> None:
    if not _authenticated(user) or not has_perm(user, "lessons.watch"):
        raise PermissionDenied()
    course = lesson.module.course
    if course.status not in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED} or not lesson.is_published:
        raise PermissionDenied()
    if not Enrollment.objects.filter(user_id=user.pk, course_id=course.pk).exists():
        raise PermissionDenied()


def _linked_duration(lesson: CourseLesson) -> int:
    """Prefer provider metadata, then the lesson's persisted duration."""
    asset_duration = getattr(lesson.video_asset, "duration_seconds", 0) or 0
    if asset_duration > 0:
        return asset_duration
    return lesson.duration_seconds or 0


def _duration_for(progress: LessonProgress | None, lesson: CourseLesson, requested: int) -> int:
    stored = _linked_duration(lesson)
    if stored > 0:
        return stored
    if progress is not None and progress.duration_seconds > 0:
        return progress.duration_seconds
    return min(requested, _MAX_REQUEST_DURATION_SECONDS)


def _get_or_create_locked(user_id: Any, lesson_id: Any, defaults: dict[str, Any]) -> tuple[LessonProgress, bool]:
    """Get one locked ledger row, tolerating a concurrent first heartbeat."""
    try:
        progress, created = LessonProgress.objects.select_for_update().get_or_create(
            user_id=user_id,
            lesson_id=lesson_id,
            defaults=defaults,
        )
    except IntegrityError:
        # A concurrent request may win creation between get_or_create's read and
        # insert; the surrounding transaction makes the retry read consistent.
        progress = LessonProgress.objects.select_for_update().get(user_id=user_id, lesson_id=lesson_id)
        created = False
    return progress, created


@transaction.atomic
def record_lesson_progress(user: Any, lesson: CourseLesson, payload: Mapping[str, Any]) -> LessonProgress:
    """Record one learner heartbeat without touching course-level aggregates."""
    position, requested_duration, delta = _payload_values(payload)
    resolved_lesson = _lesson_for_progress(lesson)
    _require_access(user, resolved_lesson)

    existing = LessonProgress.objects.select_for_update().filter(user_id=user.pk, lesson_id=resolved_lesson.pk).first()
    was_completed = bool(existing and existing.completed)
    duration = _duration_for(existing, resolved_lesson, requested_duration)
    clamped_position = min(position, duration)
    capped_delta = min(delta, _MAX_WATCHED_DELTA_SECONDS)

    if existing is None:
        progress, created = _get_or_create_locked(
            user.pk,
            resolved_lesson.pk,
            {
                "position_seconds": clamped_position,
                "duration_seconds": duration,
                "watched_seconds": min(capped_delta, duration),
            },
        )
        # A concurrent creator leaves an existing row, so only its delta is
        # applied below; a row created here already includes this heartbeat.
        if not created:
            existing = progress
    else:
        progress = existing

    duration = _duration_for(progress, resolved_lesson, requested_duration)
    progress.position_seconds = min(position, duration)
    progress.duration_seconds = duration
    if existing is not None:
        progress.watched_seconds = min(duration, max(progress.watched_seconds, 0) + capped_delta)

    if not progress.completed and duration > 0 and progress.watched_seconds * 100 >= duration * 90:
        progress.completed = True
    if progress.completed and progress.completed_at is None:
        progress.completed_at = timezone.now()

    progress.save(
        update_fields=[
            "position_seconds",
            "duration_seconds",
            "watched_seconds",
            "completed",
            "completed_at",
            "updated_at",
        ]
    )
    if progress.completed and not was_completed:
        from features.courses.services import recompute_enrollment

        course = resolved_lesson.module.course
        enrollment = recompute_enrollment(user, course)
        if enrollment is not None:
            total = CourseLesson.objects.filter(module__course_id=course.pk, is_published=True).count()
            completed = (
                LessonProgress.objects.filter(
                    user_id=user.pk,
                    lesson__module__course_id=course.pk,
                    lesson__is_published=True,
                    completed=True,
                )
                .values("lesson_id")
                .distinct()
                .count()
            )
            milestone = round(100 * completed / total) if total else 0
            if milestone in {25, 50, 75, 100}:
                from features.dashboard.event_receiver import receive_lesson_milestone

                transaction.on_commit(
                    lambda: receive_lesson_milestone(
                        user.pk,
                        course,
                        f"{milestone}% من الدروس",
                        lesson_id=f"{milestone}%",
                    )
                )
    return progress
