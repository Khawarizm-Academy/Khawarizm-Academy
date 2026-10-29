"""Catalog list/detail/filters endpoints — thin handlers over the service.

The list mirrors the frontend's filter/sort/paginate engine, moved server-side.
Query params match `CatalogFiltersState`.
"""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.catalog import service
from features.common.cache import DEFAULT_TTL_SECONDS, cached, param_digest
from features.common.errors import NotFound
from features.common.http_cache import etag_response
from features.common.messages import CATALOG_ITEM_NOT_FOUND
from features.common.throttling import scoped_throttle


@extend_schema(
    operation_id="catalog_filters",
    auth=None,
    summary="Filter and sort groups for the catalog sidebar.",
    description="App-cached and ETagged. `surface` and `tab` pick the variant the UI renders.",
    parameters=[
        OpenApiParameter("surface", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("tab", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
    ],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{groups: [...]}` — FilterGroup rows (`kind: choice|search`) with their options.",
        )
    },
)
@api_view(["GET"])
def catalog_filters_view(request: Any) -> Response:
    """The filter + sort groups the sidebar renders (app-cached, ETagged)."""
    surface = request.query_params.get("surface", "desktop")
    tab = request.query_params.get("tab", "all")
    data = cached(
        "catalog",
        param_digest({"filters": [surface, tab]}),
        DEFAULT_TTL_SECONDS,
        lambda: service.filter_groups_payload(surface, tab),
    )
    return etag_response(request, data)


@extend_schema(
    operation_id="catalog_list",
    auth=None,
    summary="Paged list of courses and scholarships, interleaved.",
    description="Served from the cached interleave (a warm request touches no rows), ETagged. "
    "Unknown `type`/`sort` values are 400s naming the valid options.",
    parameters=[
        OpenApiParameter(
            "type", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description="`all|courses|scholarships`"
        ),
        OpenApiParameter(
            "field", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description="Category slug filter."
        ),
        OpenApiParameter("level", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter(
            "cost",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="Course price type; ignored for scholarships.",
        ),
        OpenApiParameter(
            "country",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="Scholarship country slug; ignored for courses.",
        ),
        OpenApiParameter(
            "status",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="Scholarship status; ignored for courses.",
        ),
        OpenApiParameter(
            "ids",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="Comma-separated slugs — the detail-refetch batch read.",
        ),
        OpenApiParameter(
            "sort",
            OpenApiTypes.STR,
            OpenApiParameter.QUERY,
            required=False,
            description="`newest|popular` keep the interleave order; the rest reorder (400 names the valid options).",
        ),
        OpenApiParameter(
            "page",
            OpenApiTypes.INT,
            OpenApiParameter.QUERY,
            required=False,
            description="1-based; capped server-side (6 items per page).",
        ),
    ],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{items: [CatalogItem], totalResults, totalPages, currentPage}` — CatalogItem is the "
            "compact course/scholarship shape the SPA's filter engine consumes.",
        )
    },
)
@api_view(["GET"])
@scoped_throttle("catalog")
def catalog_list(request: Any) -> Response:
    """Paged, filterable list of courses and scholarships interleaved.

    Served from the cached interleave (a warm request touches no rows) with
    an ETag; unknown `type`/`sort` values are 400s naming the valid options.
    """
    return etag_response(request, service.list_items(request.query_params.dict()))


@extend_schema(
    operation_id="catalog_detail",
    auth=None,
    summary="One catalog item (course or scholarship) by slug.",
    description="From the cached interleave, ETagged; unknown slugs are 404 `not_found`.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The full CatalogItem shape."),
    },
)
@api_view(["GET"])
@scoped_throttle("catalog")
def catalog_detail(request: Any, slug: str) -> Response:
    """One catalog item (course or scholarship) by slug, from the cached interleave."""
    data = service.detail_item(slug)
    if data is None:
        raise NotFound(CATALOG_ITEM_NOT_FOUND)
    return etag_response(request, data)
