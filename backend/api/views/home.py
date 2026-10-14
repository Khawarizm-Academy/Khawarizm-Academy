"""Home page endpoint."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from academy.models import (
    HomeCompetition,
    HomeEvent,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)
from api.serializers.home import competition, event, featured_course, featured_scholarship, quick_link


@api_view(["GET"])
def home_view(request: Any) -> Response:
    """All home rails in one payload, keyed like the original mocks."""
    competitions = {row.key: competition(row) for row in HomeCompetition.objects.all()}
    events = {row.key: event(row) for row in HomeEvent.objects.all()}

    return Response(
        {
            "courses": [featured_course(row) for row in HomeFeaturedCourse.objects.all()],
            "scholarships": [featured_scholarship(row) for row in HomeFeaturedScholarship.objects.all()],
            "competitionMobile": competitions.get("mobile"),
            "competitionDesktop": competitions.get("desktop"),
            "eventMobile": events.get("mobile"),
            "eventDesktopFeatured": events.get("desktopFeatured"),
            "eventDesktopWorkshop": events.get("desktopWorkshop"),
            "quickLinks": [quick_link(row) for row in HomeQuickLink.objects.all()],
        }
    )
