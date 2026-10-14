"""Event serializers.

The shape is shared by the global events list (`EventItem`) and the home rails
(`HomeEvent`), so it lives with the events feature and home imports it.
"""

from __future__ import annotations

from typing import Any

from features.common.serializers import compact


def event(row: Any) -> dict[str, Any]:
    """An `EventItem` from either an `EventItem` or a `HomeEvent` row."""
    return compact(
        id=row.event_id,
        title=row.title,
        description=row.description,
        badge=row.badge,
        date=row.date,
        format=row.format,
        isFeatured=row.is_featured,
        thumbnailType=row.thumbnail_type,
    )
