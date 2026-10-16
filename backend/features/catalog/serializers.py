"""Catalog list/detail + filter serializers.

The per-entity shapes live with their owners (`courses`, `scholarships`); this
module decides which one to use and renders the DB-driven filter groups.
"""

from __future__ import annotations

from typing import Any

from features.catalog.models import FilterGroup
from features.courses.models import Course
from features.courses.serializers import course_catalog_item
from features.scholarships.models import Scholarship
from features.scholarships.serializers import scholarship_catalog_item


def catalog_item_for(item: Course | Scholarship) -> dict[str, Any]:
    """Return the `CatalogItem` shape for a course or a scholarship."""
    if isinstance(item, Course):
        return course_catalog_item(item)
    return scholarship_catalog_item(item)


def _group_payload(group: FilterGroup, tab: str) -> dict[str, Any] | None:
    """One group with the options that apply to the requested tab."""
    options = [
        {"id": option.value, "label": option.label}
        for option in group.options.all()
        if option.is_active and (not option.tabs or tab in option.tabs)
    ]
    if not options:
        return None
    return {"key": group.key, "label": group.label, "tone": group.tone, "glow": group.glow, "options": options}


def catalog_filters(surface: str, tab: str) -> dict[str, Any]:
    """Resolve the filter/sort metadata for a surface + tab from the database."""
    groups: list[dict[str, Any]] = []
    sort_options: list[dict[str, Any]] = []
    for group in FilterGroup.objects.filter(is_active=True).prefetch_related("options"):
        if surface not in group.surfaces:
            continue
        payload = _group_payload(group, tab)
        if payload is None:
            continue
        if group.kind == "sort":
            sort_options.extend(payload["options"])
            continue
        if surface == "mobile" and group.mobile_tone:
            payload["tone"] = group.mobile_tone
        groups.append(payload)
    return {"groups": groups, "sortOptions": sort_options}
