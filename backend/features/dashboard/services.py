"""Dashboard services: the summary assembly and the notification lists.

Pure reads over the signed-in user's rows; the views add nothing but the
envelope. Every query here is `select_related`-shaped and constant per payload.
"""

from __future__ import annotations

from typing import Any

from features.auth.models import User
from features.dashboard.models import (
    DashboardNotification,
    DashboardStat,
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


def summary(user: User) -> dict[str, Any]:
    """Everything the dashboard header/main view needs in one payload."""
    priority = PriorityContinue.objects.filter(user=user).select_related("course").first()
    live = ImminentLiveSession.objects.filter(user=user).select_related("session__course").first()
    stats = DashboardStat.objects.filter(user=user).first()
    return {
        "stats": dashboard_stats(stats) if stats else None,
        "priorityContinue": priority_continue(priority) if priority else None,
        "imminentLiveSession": live_session_info(live) if live else None,
        "upcomingEvents": [upcoming_event(row) for row in UpcomingEvent.objects.filter(user=user)],
    }


def notifications(user: User) -> dict[str, Any]:
    """Both notification shapes, so the view and the drawer share one call."""
    return {
        "items": [view_notification(row) for row in NotificationItemData.objects.filter(user=user)],
        "drawer": [drawer_notification(row) for row in DashboardNotification.objects.filter(user=user)],
    }


def mark_notification_read(user: User, notification_id: str) -> None:
    """Mark one notification as read in both representations, scoped to the caller."""
    DashboardNotification.objects.filter(user=user, notification_id=notification_id).update(is_read=True)
    NotificationItemData.objects.filter(user=user, notification_id=notification_id).update(is_unread=False)
