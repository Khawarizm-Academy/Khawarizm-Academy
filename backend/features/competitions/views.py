"""Competitions list endpoint."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.common.cache import DEFAULT_TTL_SECONDS, cached
from features.common.http_cache import etag_response
from features.competitions.models import Competition
from features.competitions.serializers import competition


@api_view(["GET"])
def competitions_list(request: Any) -> Response:
    """Every competition as a `Competition` entity (app-cached, ETagged)."""
    data = cached(
        "competitions", "list", DEFAULT_TTL_SECONDS, lambda: [competition(row) for row in Competition.objects.all()]
    )
    return etag_response(request, data)
