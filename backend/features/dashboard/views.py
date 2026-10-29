"""Dashboard endpoints: summary, sections and notifications (per signed-in user)."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
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


@extend_schema(
    operation_id="dashboard_summary",
    summary="Everything the dashboard header and main view need in one call.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The dashboard summary shape.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request: Any) -> Response:
    """Everything the dashboard header/main view needs in one call."""
    return Response(services.summary(request.user))


@extend_schema(
    operation_id="dashboard_enrolled",
    summary="The signed-in learner's enrollments.",
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [EnrolledCourse]}`"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_enrolled(request: Any) -> Response:
    rows = Enrollment.objects.filter(user=request.user).select_related("course")
    return Response({"items": [enrolled_course(row) for row in rows]})


@extend_schema(
    operation_id="dashboard_saved",
    summary="Saved scholarships and favorited courses.",
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{scholarships: [SavedScholarship], courses: [FavoriteCourse]}`"
        ),
    },
)
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


@extend_schema(
    operation_id="dashboard_competitions",
    summary="Saved competitions and earned certificates.",
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{competitions: [SavedCompetition], certificates: [Certificate]}`",
        ),
    },
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


@extend_schema(
    operation_id="dashboard_notifications",
    summary="Both notification shapes for the bell and the drawer.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{drawer: [...], view: [...]}`")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_notifications(request: Any) -> Response:
    """Both notification shapes, so the view and the drawer share one call."""
    return Response(services.notifications(request.user))


@extend_schema(
    operation_id="dashboard_notification_read",
    summary="Mark one notification as read.",
    request=None,
    parameters=[OpenApiParameter("notification_id", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{read: true, id}`")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dashboard_notification_read(request: Any, notification_id: str) -> Response:
    """Mark one notification as read (both representations)."""
    services.mark_notification_read(request.user, notification_id)
    return Response({"read": True, "id": notification_id})
