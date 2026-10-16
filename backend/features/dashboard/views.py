"""Dashboard endpoints: summary, sections and notifications (per signed-in user)."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.dashboard.models import (
    Certificate,
    DashboardNotification,
    DashboardStat,
    Enrollment,
    FavoriteCourse,
    ImminentLiveSession,
    NotificationItemData,
    PriorityContinue,
    SavedCompetition,
    SavedScholarship,
    UpcomingEvent,
)
from features.dashboard.serializers import (
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
@permission_classes([IsAuthenticated])
def dashboard_summary(request: Any) -> Response:
    """Everything the dashboard header/main view needs in one call."""
    user = request.user
    priority = PriorityContinue.objects.filter(user=user).select_related("course").first()
    live = ImminentLiveSession.objects.filter(user=user).select_related("session__course").first()
    stats = DashboardStat.objects.filter(user=user).first()
    return Response(
        {
            "stats": dashboard_stats(stats) if stats else None,
            "priorityContinue": priority_continue(priority) if priority else None,
            "imminentLiveSession": live_session_info(live) if live else None,
            "upcomingEvents": [upcoming_event(row) for row in UpcomingEvent.objects.filter(user=user)],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_enrolled(request: Any) -> Response:
    rows = Enrollment.objects.filter(user=request.user).select_related("course")
    return Response([enrolled_course(row) for row in rows])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_saved(request: Any) -> Response:
    scholarships = SavedScholarship.objects.filter(user=request.user).select_related("scholarship")
    favorites = FavoriteCourse.objects.filter(user=request.user).select_related("course")
    return Response(
        {
            "scholarships": [saved_scholarship(row) for row in scholarships],
            "courses": [favorite_course(row) for row in favorites],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_competitions(request: Any) -> Response:
    competitions = SavedCompetition.objects.filter(user=request.user).select_related("competition")
    certificates = Certificate.objects.filter(user=request.user).select_related("course")
    return Response(
        {
            "competitions": [competition_item(row) for row in competitions],
            "certificates": [certificate_item(row) for row in certificates],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_notifications(request: Any) -> Response:
    """Both notification shapes, so the view and the drawer share one call."""
    user = request.user
    return Response(
        {
            "items": [view_notification(row) for row in NotificationItemData.objects.filter(user=user)],
            "drawer": [drawer_notification(row) for row in DashboardNotification.objects.filter(user=user)],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dashboard_notification_read(request: Any, notification_id: str) -> Response:
    """Mark one notification as read (both representations)."""
    user = request.user
    DashboardNotification.objects.filter(user=user, notification_id=notification_id).update(is_read=True)
    NotificationItemData.objects.filter(user=user, notification_id=notification_id).update(is_unread=False)
    return Response({"read": True, "id": notification_id})
