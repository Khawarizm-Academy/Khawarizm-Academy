"""Dashboard endpoints: summary, sections and notifications."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

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
from api.learners import get_demo_learner
from api.serializers.dashboard import (
    certificate_item,
    competition_item,
    dashboard_stats,
    drawer_notification,
    enrolled_course,
    favorite_course,
    live_session_info,
    priority_continue,
    saved_scholarship,
    upcoming_event,
    view_notification,
)


@api_view(["GET"])
def dashboard_summary(request: Any) -> Response:
    """Everything the dashboard header/main view needs in one call."""
    learner = get_demo_learner()
    priority = PriorityContinue.objects.filter(learner=learner).first()
    live = ImminentLiveSession.objects.filter(learner=learner).first()
    stats = DashboardStat.objects.filter(learner=learner).first()

    return Response(
        {
            "stats": dashboard_stats(stats) if stats else None,
            "priorityContinue": priority_continue(priority) if priority else None,
            "imminentLiveSession": live_session_info(live) if live else None,
            "upcomingEvents": [upcoming_event(row) for row in UpcomingEvent.objects.filter(learner=learner)],
        }
    )


@api_view(["GET"])
def dashboard_enrolled(request: Any) -> Response:
    learner = get_demo_learner()
    rows = EnrolledCourse.objects.filter(learner=learner)
    return Response([enrolled_course(row) for row in rows])


@api_view(["GET"])
def dashboard_saved(request: Any) -> Response:
    learner = get_demo_learner()
    return Response(
        {
            "scholarships": [saved_scholarship(row) for row in SavedScholarshipItem.objects.filter(learner=learner)],
            "courses": [favorite_course(row) for row in FavoriteCourseItem.objects.filter(learner=learner)],
        }
    )


@api_view(["GET"])
def dashboard_competitions(request: Any) -> Response:
    learner = get_demo_learner()
    return Response(
        {
            "competitions": [competition_item(row) for row in CompetitionItem.objects.filter(learner=learner)],
            "certificates": [certificate_item(row) for row in CertificateItem.objects.filter(learner=learner)],
        }
    )


@api_view(["GET"])
def dashboard_notifications(request: Any) -> Response:
    """Both notification shapes, so the view and the drawer share one call."""
    learner = get_demo_learner()
    return Response(
        {
            "items": [view_notification(row) for row in NotificationItemData.objects.filter(learner=learner)],
            "drawer": [drawer_notification(row) for row in DashboardNotification.objects.filter(learner=learner)],
        }
    )


@api_view(["POST"])
def dashboard_notification_read(request: Any, notification_id: str) -> Response:
    """Mark one notification as read (both representations)."""
    learner = get_demo_learner()
    DashboardNotification.objects.filter(learner=learner, notification_id=notification_id).update(is_read=True)
    NotificationItemData.objects.filter(learner=learner, notification_id=notification_id).update(is_unread=False)
    return Response({"read": True, "id": notification_id})
