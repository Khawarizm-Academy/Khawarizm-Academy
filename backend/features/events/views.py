"""Events list endpoint."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.events.models import EventItem
from features.events.serializers import event


@api_view(["GET"])
def events_list(request: Any) -> Response:
    """Every event/workshop as an `EventItem`."""
    return Response([event(row) for row in EventItem.objects.all()])
