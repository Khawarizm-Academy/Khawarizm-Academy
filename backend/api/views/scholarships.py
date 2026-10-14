"""Scholarship detail, apply, and save endpoints."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from academy.models import Scholarship
from api.serializers.catalog import scholarship_catalog_item


@api_view(["GET"])
def scholarship_detail_view(request: Any, slug: str) -> Response:
    """One scholarship as a `CatalogItem`."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response({"detail": "المنحة غير موجودة"}, status=404)
    return Response(scholarship_catalog_item(scholarship))


@api_view(["POST"])
def scholarship_apply_view(request: Any, slug: str) -> Response:
    """Submit an application; acknowledgement only for now (no auth)."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response({"detail": "المنحة غير موجودة"}, status=404)
    return Response({"applied": True, "scholarshipId": scholarship.slug})


@api_view(["POST"])
def scholarship_save_view(request: Any, slug: str) -> Response:
    """Save / unsave a scholarship; acknowledgement only for now (no auth)."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response({"detail": "المنحة غير موجودة"}, status=404)
    saved = bool(request.data.get("saved", True))
    return Response({"saved": saved, "scholarshipId": scholarship.slug})
