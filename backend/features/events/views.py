"""Events list endpoint."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.common.cache import DEFAULT_TTL_SECONDS, cached
from features.common.http_cache import etag_response
from features.events.models import EventItem
from features.events.serializers import event


@extend_schema(
    operation_id="events_list",
    summary="Every event and workshop.",
    description="App-cached and ETagged; one `EventItem` per row in insertion order.",
    auth=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items: [EventItem]}`"),
    },
)
@api_view(["GET"])
def events_list(request: Any) -> Response:
    """Every event/workshop as an `EventItem` (app-cached, ETagged)."""
    data = cached("events", "list", DEFAULT_TTL_SECONDS, lambda: [event(row) for row in EventItem.objects.all()])
    return etag_response(request, data)
