"""Shared HTTP helpers for the feature apps."""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler


class InvalidParameter(APIException):
    """A malformed query parameter; carries the same `detail` shape as every other error."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_parameter"
    default_detail = "معامل غير صالح."


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Keep DRF's default envelope so every feature returns errors the same way."""
    return exception_handler(exc, context)
