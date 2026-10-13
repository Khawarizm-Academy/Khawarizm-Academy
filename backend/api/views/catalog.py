"""Catalog list + detail endpoints.

The list mirrors the frontend's client-side filter/sort/paginate engine, just
moved server-side. Query params match `CatalogFiltersState`.
"""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from academy.models import Course, Scholarship
from api.serializers.catalog import catalog_item_for

ITEMS_PER_PAGE = 6

# Sort option to a key function over the serialized items.
def _sort_key(sort_by: str):
    if sort_by == "rating":
        return lambda item: -(item.get("rating") or 0)
    if sort_by == "deadline":
        return lambda item: item.get("daysRemaining", 999)
    # Default "newest" keeps insertion (slug) order.
    return None


def _matches(item: dict[str, Any], params: dict[str, str]) -> bool:
    """Apply every filter the frontend sends, ignoring ones set to 'all'."""
    item_type = params.get("type", "all")
    if item_type == "courses" and item["type"] != "course":
        return False
    if item_type == "scholarships" and item["type"] != "scholarship":
        return False

    query = params.get("q", "").strip().lower()
    if query:
        haystacks = [
            item.get("title", ""),
            item.get("category", ""),
            item.get("instructor", ""),
            item.get("provider", ""),
        ]
        if not any(query in value.lower() for value in haystacks):
            return False

    field = params.get("field", "all")
    if field != "all" and item.get("categorySlug") != field:
        return False

    level = params.get("level", "all")
    if level != "all":
        if item["type"] == "course" and item.get("courseLevel") != level:
            return False
        if item["type"] == "scholarship" and item.get("degreeLevel") != level:
            return False

    cost = params.get("cost", "all")
    if cost != "all" and item["type"] == "course" and item.get("priceType") != cost:
        return False

    country = params.get("country", "all")
    if country != "all" and item["type"] == "scholarship" and item.get("countrySlug") != country:
        return False

    status = params.get("status", "all")
    if status != "all" and item["type"] == "scholarship" and item.get("status") != status:
        return False

    return True


@api_view(["GET"])
def catalog_list(request: Any) -> Response:
    """Paged, filterable list of courses and scholarships interleaved."""
    params = request.query_params

    # Build the union in the same interleaved order the frontend used.
    courses = list(Course.objects.all())
    scholarships = list(Scholarship.objects.all())
    items: list[dict[str, Any]] = []
    for index, course in enumerate(courses):
        items.append(catalog_item_for(course))
        if index < len(scholarships):
            items.append(catalog_item_for(scholarships[index]))

    items = [item for item in items if _matches(item, params)]

    # Optional explicit id list, used by the related-courses rail.
    ids = params.get("ids")
    if ids:
        wanted = {value for value in ids.split(",") if value}
        items = [item for item in items if item["id"] in wanted]

    sort_key = _sort_key(params.get("sort", "newest"))
    if sort_key is not None:
        items.sort(key=sort_key)

    total = len(items)
    total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
    page = max(1, int(params.get("page", 1) or 1))
    page = min(page, total_pages)
    start = (page - 1) * ITEMS_PER_PAGE
    page_items = items[start : start + ITEMS_PER_PAGE]

    return Response(
        {
            "items": page_items,
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
