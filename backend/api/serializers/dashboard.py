"""Dashboard projection serializers."""

from __future__ import annotations

from typing import Any

from academy.models import (
    CertificateItem,
    CompetitionItem,
    DashboardNotification,
    DashboardStat,
    EnrolledCourse,
    FavoriteCourseItem,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedScholarshipItem,
    UpcomingEvent,
)
from api.serializers.common import compact


def enrolled_course(row: EnrolledCourse) -> dict[str, Any]:
    return compact(
        id=row.course_id,
        title=row.title,
        instructor=row.instructor,
        totalLessons=row.total_lessons,
        track=row.track,
        progress=row.progress,
        lastLesson=row.last_lesson,
        exactUnitLesson=row.exact_unit_lesson,
        thumbnail=row.thumbnail,
        nextLiveTime=row.next_live_time,
        iconType=row.icon_type,
        isCompleted=row.is_completed,
        completionDate=row.completion_date,
        slug=row.slug,
    )


def priority_continue(row: PriorityContinue) -> dict[str, Any]:
    return compact(
        id=row.course_id,
        title=row.title,
        levelDuration=row.level_duration,
        instructorSubtitle=row.instructor_subtitle,
        lessonStatus=row.lesson_status,
        progress=row.progress,
        thumbnail=row.thumbnail,
    )


def live_session_info(row: ImminentLiveSession) -> dict[str, Any]:
    return compact(
        id=row.session_id,
        courseTitle=row.course_title,
        instructor=row.instructor,
        initialRemainingSeconds=row.initial_remaining_seconds,
        thumbnail=row.thumbnail,
        meetUrl=row.meet_url,
    )


def dashboard_stats(row: DashboardStat) -> dict[str, Any]:
    return {
        "attendanceRate": row.attendance_rate,
        "attendanceNote": row.attendance_note,
        "gpa": row.gpa,
        "gpaRating": row.gpa_rating,
        "pointsEarned": row.points_earned,
        "rankNote": row.rank_note,
    }


def upcoming_event(row: UpcomingEvent) -> dict[str, Any]:
    return {
        "id": row.event_id,
        "title": row.title,
        "dateText": row.date_text,
        "type": row.event_type,
        "typeLabel": row.type_label,
    }


def drawer_notification(row: DashboardNotification) -> dict[str, Any]:
    """Shape used by the notification drawer (`DashboardNotification`)."""
    return compact(
        id=row.notification_id,
        title=row.title,
        timeAgo=row.time_ago,
        type=row.notification_type,
        isRead=row.is_read,
        link=row.link,
    )


def view_notification(row: NotificationItemData) -> dict[str, Any]:
    """Shape used by the notifications view (`NotificationItemData`)."""
    return {
        "id": row.notification_id,
        "message": row.message,
        "timeAgo": row.time_ago,
        "isUnread": row.is_unread,
        "type": row.notification_type,
    }


def saved_scholarship(row: SavedScholarshipItem) -> dict[str, Any]:
    return {
        "id": row.item_id,
        "title": row.title,
        "provider": row.provider,
        "deadlineText": row.deadline_text,
        "isUrgent": row.is_urgent,
        "coverage": row.coverage,
        "gpaRequirement": row.gpa_requirement,
    }


def favorite_course(row: FavoriteCourseItem) -> dict[str, Any]:
    return {
        "id": row.item_id,
        "title": row.title,
        "provider": row.provider,
        "durationText": row.duration_text,
    }


def competition_item(row: CompetitionItem) -> dict[str, Any]:
    return {
        "id": row.item_id,
        "title": row.title,
        "statusText": row.status_text,
        "statusColor": row.status_color,
        "actionLabel": row.action_label,
        "actionVariant": row.action_variant,
    }


def certificate_item(row: CertificateItem) -> dict[str, Any]:
    return compact(
        id=row.item_id,
        title=row.title,
        issueDate=row.issue_date,
        credentialId=row.credential_id,
        isOfficial=row.is_official,
        courseSlug=row.course_slug,
    )
