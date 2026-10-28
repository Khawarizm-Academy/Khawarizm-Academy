"""Dashboard endpoints: summary, sections and notifications (per signed-in user)."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.dashboard import services
from features.dashboard.models import (
    Certificate,
    Enrollment,
    FavoriteCourse,
    SavedCompetition,
    SavedScholarship,
)
from features.dashboard.serializers import (
    certificate_item,
    competition_item,
    enrolled_course,
    favorite_course,
    saved_scholarship,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request: Any) -> Response:
    """Everything the dashboard header/main view needs in one call."""
    return Response(services.summary(request.user))


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
    return Response(services.notifications(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dashboard_notification_read(request: Any, notification_id: str) -> Response:
    """Mark one notification as read (both representations)."""
    services.mark_notification_read(request.user, notification_id)
    return Response({"read": True, "id": notification_id})
