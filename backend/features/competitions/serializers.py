"""Competition serializers.

The shape is shared by the global competitions list (`Competition`) and the
home banner/rails (`HomeCompetition`), so this lives here and home imports it.
"""

from __future__ import annotations

from typing import Any


def competition(row: Any) -> dict[str, Any]:
    """A `Competition` from either `Competition` or `HomeCompetition`."""
    return {
        "id": row.competition_id,
        "title": row.title,
        "badge": row.badge,
        "description": row.description,
        "daysRemaining": row.days_remaining,
        "hoursRemaining": row.hours_remaining,
        "actionText": row.action_text,
    }
