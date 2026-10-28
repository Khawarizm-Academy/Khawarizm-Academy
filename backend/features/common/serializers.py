"""Shared building blocks every feature app imports."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def compact(**fields: Any) -> dict[str, Any]:
    """Drop keys whose value is None or an empty string.

    The frontend types mark extra fields optional; omitting empties keeps the
    payload as close as possible to the original JSON shapes.
    """
    return {key: value for key, value in fields.items() if value is not None and value != ""}


def as_number(value: Decimal | None) -> float | None:
    """JSON has plain numbers, so convert Decimals once at the boundary."""
    if value is None:
        return None
    return float(value)
