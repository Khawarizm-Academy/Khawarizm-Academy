"""Home page endpoint — rails assembled from the real feature rows."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.competitions.serializers import competition
from features.events.serializers import event
from features.home.models import (
    HomeCompetitionSpot,
    HomeEventSpot,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)
from features.home.serializers import featured_course, featured_scholarship, quick_link


@api_view(["GET"])
def home_view(request: Any) -> Response:
    """All home rails in one payload, keyed like the original mocks."""
    competitions = {row.key: competition(row.competition) for row in HomeCompetitionSpot.objects.select_related("competition")}
    events = {row.key: event(row.event) for row in HomeEventSpot.objects.select_related("event")}

    return Response(
        {
            "courses": [featured_course(row) for row in HomeFeaturedCourse.objects.select_related("course")],
            "scholarships": [featured_scholarship(row) for row in HomeFeaturedScholarship.objects.select_related("scholarship")],
            "competitionMobile": competitions.get("mobile"),
            "competitionDesktop": competitions.get("desktop"),
            "eventMobile": events.get("mobile"),
            "eventDesktopFeatured": events.get("desktopFeatured"),
            "eventDesktopWorkshop": events.get("desktopWorkshop"),
            "quickLinks": [quick_link(row) for row in HomeQuickLink.objects.all()],
        }
    )
