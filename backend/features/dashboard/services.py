"""Dashboard services: the summary assembly and the notification lists.

Pure reads over the signed-in user's rows; the views add nothing but the
envelope. Every query here is `select_related`-shaped and constant per payload.
"""

from __future__ import annotations

from typing import Any

from features.auth.models import User
from features.common.choices import CourseStatus
from features.dashboard import notifications as notification_service
from features.dashboard.models import (
    DashboardNotification,
    DashboardStat,
    Enrollment,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    UpcomingEvent,
)
from features.dashboard.serializers import (
    dashboard_stats,
    drawer_notification,
    live_session_info,
    priority_continue,
    upcoming_event,
    view_notification,
)


def sync_enrollment_progress(user: User, enrollment: Enrollment) -> Enrollment:
    """Recompute one learner row only when its course curriculum changed."""
    if enrollment.progress_revision == enrollment.course.curriculum_revision:
        return enrollment
    from features.courses.services import recompute_enrollment

    return recompute_enrollment(user, enrollment.course) or enrollment


def summary(user: User) -> dict[str, Any]:
    """Everything the dashboard header/main view needs in one payload."""
    visible_statuses = (CourseStatus.PUBLISHED, CourseStatus.ARCHIVED)
    priority = (
        PriorityContinue.objects.filter(user=user, course__status__in=visible_statuses).select_related("course").first()
    )
    live = (
        ImminentLiveSession.objects.filter(user=user, session__course__status__in=visible_statuses)
        .select_related("session__course")
        .first()
    )
    stats = DashboardStat.objects.filter(user=user).first()
    if priority is not None:
        enrollment = Enrollment.objects.filter(user=user, course_id=priority.course_id).select_related("course").first()
        if enrollment is not None:
            sync_enrollment_progress(user, enrollment)
            priority.refresh_from_db(fields=["progress"])
    return {
        "stats": dashboard_stats(stats) if stats else None,
        "priorityContinue": priority_continue(priority) if priority else None,
        "imminentLiveSession": live_session_info(live) if live else None,
        "upcomingEvents": [upcoming_event(row) for row in UpcomingEvent.objects.filter(user=user)],
    }


def notifications(user: User) -> dict[str, Any]:
    """Both notification shapes, so the view and the drawer share one call."""
    return {
        "items": [
            view_notification(row)
            for row in NotificationItemData.objects.filter(user=user).order_by("-is_unread", "-created_at")
        ],
        "drawer": [
            drawer_notification(row)
            for row in DashboardNotification.objects.filter(user=user).order_by("is_read", "-created_at")
        ],
    }


def mark_notification_read(user: User, notification_id: str) -> None:
    """Mark one notification as read in both representations, scoped to the caller."""
    notification_service.mark_read(user, notification_id)


def unread_notification_count(user: User) -> int:
    """Return the short-lived cached unread count for the current user."""
    return notification_service.unread_count(user)
