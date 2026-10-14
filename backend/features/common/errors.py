"""Shared HTTP helpers for the feature apps."""

from __future__ import annotations

from typing import Any

from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Keep DRF's default envelope so every feature returns errors the same way."""
    return exception_handler(exc, context)
