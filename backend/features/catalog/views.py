"""Catalog list + detail endpoints.

The list mirrors the frontend's filter/sort/paginate engine, moved server-side.
Query params match `CatalogFiltersState`.
"""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.catalog.filters import matches, sort_key
from features.catalog.serializers import catalog_filters, catalog_item_for
from features.courses.models import Course
from features.scholarships.models import Scholarship

ITEMS_PER_PAGE = 6


@api_view(["GET"])
def catalog_filters_view(request: Any) -> Response:
    """The filter + sort groups the sidebar renders, straight from the database."""
    surface = request.query_params.get("surface", "desktop")
    tab = request.query_params.get("tab", "all")
    return Response(catalog_filters(surface, tab))


def _interleaved_items() -> list[dict[str, Any]]:
    """Courses and scholarships alternating, matching the original order."""
    courses = list(Course.objects.all())
    scholarships = list(Scholarship.objects.all())
    items: list[dict[str, Any]] = []
    for index, course in enumerate(courses):
        items.append(catalog_item_for(course))
        if index < len(scholarships):
            items.append(catalog_item_for(scholarships[index]))
    return items


@api_view(["GET"])
def catalog_list(request: Any) -> Response:
    """Paged, filterable list of courses and scholarships interleaved."""
    params = request.query_params

    items = [item for item in _interleaved_items() if matches(item, params)]

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
    return Response(
        {
            "items": items[start : start + ITEMS_PER_PAGE],
            "totalResults": total,
            "totalPages": total_pages,
            "currentPage": page,
        }
    )


@api_view(["GET"])
def catalog_detail(request: Any, slug: str) -> Response:
    """One catalog item (course or scholarship) by slug."""
    course = Course.objects.filter(slug=slug).first()
    if course is not None:
        return Response(catalog_item_for(course))

    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is not None:
        return Response(catalog_item_for(scholarship))

    return Response({"detail": "العنصر غير موجود"}, status=404)
