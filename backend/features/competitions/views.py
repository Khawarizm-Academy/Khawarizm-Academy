"""Competitions list endpoint."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.competitions.models import Competition
from features.competitions.serializers import competition


@api_view(["GET"])
def competitions_list(request: Any) -> Response:
    """Every competition as a `Competition` entity."""
    return Response([competition(row) for row in Competition.objects.all()])
