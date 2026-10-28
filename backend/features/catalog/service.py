"""The catalog engine: build the interleave once, serve everything from it.

The catalog is small enough to hold serialized in the cache; filtering,
sorting, and pagination run over that cached list — Python filtering is
allowed for small, already-cached lists. A miss costs exactly two queries
(courses + scholarships); a warm request costs none.

DB-pushdown trigger — rework this module when the catalog exceeds ~2k rows:
move the FILTERS table (`features/catalog/filters.py`) into `QuerySet.filter()`
per type, paginate by keyset, and keep only the interleave order + page slice
in Python. Not built now: the catalog is dozens of rows and the version-bumped
cache bounds the repeat cost.
"""

from __future__ import annotations

from typing import Any

from features.catalog.filters import SORTERS, TYPE_ALIAS, matches, sort_key
from features.catalog.models import FilterGroup
from features.catalog.serializers import catalog_item_for
from features.common.cache import DEFAULT_TTL_SECONDS, cached, param_digest
from features.common.errors import InvalidParameter
from features.courses.models import Course
from features.scholarships.models import Scholarship

ITEMS_PER_PAGE = 6

# Sorts that keep the interleave order — the frontend's `newest` and `popular`
# both mean "as curated" (`SortOption` in the frontend's types.ts is the
# contract); SORTERS owns the two that reorder. The list endpoint validates at
# the edge: the SPA only sends whitelisted values, so an unknown one is a bug
# worth surfacing loudly as a 400, not a silent fall-through.
INSERTION_ORDER_SORTS = frozenset({"newest", "popular"})
KNOWN_TYPES = frozenset({"all", *TYPE_ALIAS})
KNOWN_SORTS = INSERTION_ORDER_SORTS | frozenset(SORTERS)


def catalog_items() -> list[dict[str, Any]]:
    """The interleaved catalog items, cached whole under the family version."""
    return cached("catalog", "items", DEFAULT_TTL_SECONDS, build_items)


def build_items() -> list[dict[str, Any]]:
    """Courses and scholarships alternating, matching the original order."""
    courses = list(Course.objects.all())
    scholarships = list(Scholarship.objects.all())
    items: list[dict[str, Any]] = []
    for index, course in enumerate(courses):
        items.append(catalog_item_for(course))
        if index < len(scholarships):
            items.append(catalog_item_for(scholarships[index]))
    return items


def list_items(params: dict[str, Any]) -> dict[str, Any]:
    """Validate params → filter/sort the cached interleave → slice one page."""
    _validate(params)
    items = [item for item in catalog_items() if matches(item, params)]

    # Related-rail callers pass an explicit id list.
    ids = params.get("ids")
    if ids:
        wanted = {value for value in ids.split(",") if value}
        items = [item for item in items if item["id"] in wanted]

    key = sort_key(params.get("sort", "newest"))
    if key is not None:
        items.sort(key=key)

    total = len(items)
    total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
    page = min(max(1, int(params.get("page", 1) or 1)), total_pages)
    start = (page - 1) * ITEMS_PER_PAGE
    return {
        "items": items[start : start + ITEMS_PER_PAGE],
        "totalResults": total,
        "totalPages": total_pages,
        "currentPage": page,
    }


def detail_item(slug: str) -> dict[str, Any] | None:
    """One catalog item by slug — course first, then scholarship — cached per
    slug (`None` is the short-lived negative entry).

    This deliberately queries the models rather than searching the cached
    interleave: the interleave drops scholarships beyond the course count
    (original interleaving, kept for parity), and detail must still resolve
    any slug the list does not show.
    """
    return cached("catalog", param_digest({"detail": slug}), DEFAULT_TTL_SECONDS, lambda: _detail_data(slug))


def _detail_data(slug: str) -> dict[str, Any] | None:
    for model in (Course, Scholarship):
        row = model.objects.filter(slug=slug).first()
        if row is not None:
            return catalog_item_for(row)
    return None


def filter_groups_payload(surface: str, tab: str) -> dict[str, Any]:
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


def _validate(params: dict[str, Any]) -> None:
    """Unknown `type`/`sort` values are 400s naming the valid options."""
    type_value = params.get("type", "all")
    if type_value not in KNOWN_TYPES:
        raise InvalidParameter(f"type غير معروفة: {type_value} — القيم الممكنة: {', '.join(sorted(KNOWN_TYPES))}")
    sort_value = params.get("sort", "newest")
    if sort_value not in KNOWN_SORTS:
        raise InvalidParameter(f"sort غير معروفة: {sort_value} — القيم الممكنة: {', '.join(sorted(KNOWN_SORTS))}")
