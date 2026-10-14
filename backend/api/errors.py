"""Custom DRF exception handler returning a consistent error envelope."""

from __future__ import annotations

from typing import Any

from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)

    if response is None:
        return None

    # Preserve status and structure; DRF's default already serializes exception details.
    return response
