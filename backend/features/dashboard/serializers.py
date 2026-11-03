"""Dashboard projection serializers — every row reads through to real content."""

from __future__ import annotations

from typing import Any

from django.utils import formats, timezone

from features.common.serializers import compact
from features.dashboard.notifications import relative_arabic_time


def _level_duration(course: Any) -> str:
    """Combine the Arabic level and duration into the rail's subtitle."""
    parts = [part for part in (course.course_level_ar, course.duration) if part]
    return " · ".join(parts)


def _datetime_label(value: Any) -> str:
    if value is None:
        return "—"
    return formats.date_format(timezone.localtime(value), "DATETIME_FORMAT")


def enrolled_course(row: Any) -> dict[str, Any]:
    course = row.course
    return compact(
        id=course.slug,
        title=course.title,
        instructor=course.instructor,
        totalLessons=course.lessons_count,
        track=course.category_label,
        progress=row.progress,
        lastLesson=row.last_lesson,
        exactUnitLesson=row.exact_unit_lesson,
        thumbnail=course.thumbnail_url,
        nextLiveTime=_datetime_label(row.next_live_at) if row.next_live_at else "—",
        iconType=row.icon_type,
        isCompleted=row.is_completed,
        completionDate=row.completion_date,
        slug=course.slug,
    )


def priority_continue(row: Any) -> dict[str, Any]:
    course = row.course
    return compact(
        id=course.slug,
        title=course.title,
        levelDuration=_level_duration(course),
        instructorSubtitle=course.instructor_credential or course.instructor,
        lessonStatus=row.lesson_status,
        progress=row.progress,
        thumbnail=course.thumbnail_url,
    )


def live_session_info(row: Any) -> dict[str, Any]:
    session = row.session
    course = session.course
    return compact(
        id=session.session_id,
        courseTitle=course.title,
        instructor=course.instructor,
        initialRemainingSeconds=row.initial_remaining_seconds,
        thumbnail=course.thumbnail_url,
        meetUrl=row.meet_url or session.meet_url,
    )


def dashboard_stats(row: Any) -> dict[str, Any]:
    return {
        "attendanceRate": row.attendance_rate,
        "attendanceNote": row.attendance_note,
        "gpa": row.gpa,
        "gpaRating": row.gpa_rating,
        "pointsEarned": row.points_earned,
        "rankNote": row.rank_note,
    }


def upcoming_event(row: Any) -> dict[str, Any]:
    return {
        "id": row.event_id,
        "title": row.title,
        "dateText": _datetime_label(row.event_at) if row.event_at else "—",
        "type": row.event_type,
        "typeLabel": row.type_label,
    }


def drawer_notification(row: Any) -> dict[str, Any]:
    return compact(
        id=row.notification_id,
        title=row.title,
        timeAgo=relative_arabic_time(row.created_at),
        type=row.notification_type,
        isRead=row.is_read,
        link=row.link,
    )


def view_notification(row: Any) -> dict[str, Any]:
    return {
        "id": row.notification_id,
        "message": row.message,
        "timeAgo": relative_arabic_time(row.created_at),
        "isUnread": row.is_unread,
        "type": row.notification_type,
    }


def saved_scholarship(row: Any) -> dict[str, Any]:
    scholarship = row.scholarship
    return {
        "id": scholarship.slug,
        "title": scholarship.title,
        "provider": scholarship.provider,
        "deadlineText": scholarship.deadline_badge,
        "isUrgent": row.is_urgent,
        "coverage": scholarship.coverage_label,
        "gpaRequirement": row.gpa_requirement,
    }


def favorite_course(row: Any) -> dict[str, Any]:
    course = row.course
    return {
        "id": course.slug,
        "title": course.title,
        "provider": course.instructor,
        "durationText": course.duration,
    }


def competition_item(row: Any) -> dict[str, Any]:
    comp = row.competition
    return {
        "id": comp.competition_id,
        "title": comp.title,
        "statusText": row.status_text,
        "statusColor": row.status_color,
        "actionLabel": row.action_label or comp.action_text,
        "actionVariant": row.action_variant,
    }


def certificate_item(row: Any) -> dict[str, Any]:
    course = row.course
    return compact(
        id=course.slug,
        title=course.title,
        learnerName=row.learner_name_snapshot or getattr(row.user, "full_name", ""),
        issueDate=_datetime_label(row.issued_at) if row.issued_at else "—",
        credentialId=row.serial or row.credential_id,
        isOfficial=row.is_official,
        courseSlug=course.slug,
        revoked=bool(row.revoked_at),
        revokedReason=row.revoked_reason if row.revoked_at else "",
    )
