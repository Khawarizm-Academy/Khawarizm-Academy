"""Catalog filtering and sorting.

Every filter is a row in `FILTERS`, so adding one never means adding an
`if` branch — the list is the specification.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

# (query param, default, predicate) applied to one serialized CatalogItem.
FILTERS: tuple[tuple[str, str, Callable[[dict[str, Any], str], bool]], ...] = (
    ("type", "all", lambda item, value: value == "all" or item["type"] == TYPE_ALIAS[value]),
    ("field", "all", lambda item, value: value == "all" or item.get("categorySlug") == value),
    ("level", "all", lambda item, value: value == "all" or LEVEL_KEY[item["type"]](item) == value),
    ("cost", "all", lambda item, value: value == "all" or item["type"] != "course" or item.get("priceType") == value),
    (
        "country",
        "all",
        lambda item, value: value == "all" or item["type"] != "scholarship" or item.get("countrySlug") == value,
    ),
    (
        "status",
        "all",
        lambda item, value: value == "all" or item["type"] != "scholarship" or item.get("status") == value,
    ),
)

# "courses" / "scholarships" tab value -> the item's `type` field.
TYPE_ALIAS = {"courses": "course", "scholarships": "scholarship"}

# The field that holds the level, per item type.
LEVEL_KEY = {"course": lambda item: item.get("courseLevel"), "scholarship": lambda item: item.get("degreeLevel")}

# Sort option -> key function; an unknown option keeps insertion order.
SORTERS: dict[str, Callable[[dict[str, Any]], Any]] = {
    "rating": lambda item: -(item.get("rating") or 0),
    "deadline": lambda item: item.get("daysRemaining", 999),
}


def matches(item: dict[str, Any], params: dict[str, str]) -> bool:
    """True when the item passes every filter the frontend sent."""
    if not all(check(item, params.get(key, default)) for key, default, check in FILTERS):
        return False
    query = params.get("q", "").strip().lower()
    return not query or _searchable(item, query)


def _searchable(item: dict[str, Any], query: str) -> bool:
    """Match the query against the fields a learner would type."""
    haystacks = (item.get("title", ""), item.get("category", ""), item.get("instructor", ""), item.get("provider", ""))
    return any(query in value.lower() for value in haystacks)


def sort_key(sort_by: str) -> Callable[[dict[str, Any]], Any] | None:
    """The key for a named sort, or None to keep insertion order."""
    return SORTERS.get(sort_by)
