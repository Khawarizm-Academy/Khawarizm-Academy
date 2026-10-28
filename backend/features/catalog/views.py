"""Catalog list/detail/filters endpoints — thin handlers over the service.

The list mirrors the frontend's filter/sort/paginate engine, moved server-side.
Query params match `CatalogFiltersState`.
"""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.catalog import service
from features.common.cache import DEFAULT_TTL_SECONDS, cached, param_digest
from features.common.errors import NotFound
from features.common.http_cache import etag_response
from features.common.messages import CATALOG_ITEM_NOT_FOUND
from features.common.throttling import scoped_throttle


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


@api_view(["GET"])
@scoped_throttle("catalog")
def catalog_list(request: Any) -> Response:
    """Paged, filterable list of courses and scholarships interleaved.

    Served from the cached interleave (a warm request touches no rows) with
    an ETag; unknown `type`/`sort` values are 400s naming the valid options.
    """
    return etag_response(request, service.list_items(request.query_params.dict()))


@api_view(["GET"])
@scoped_throttle("catalog")
def catalog_detail(request: Any, slug: str) -> Response:
    """One catalog item (course or scholarship) by slug, from the cached interleave."""
    data = service.detail_item(slug)
    if data is None:
        raise NotFound(CATALOG_ITEM_NOT_FOUND)
    return etag_response(request, data)
