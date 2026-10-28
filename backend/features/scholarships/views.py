"""Scholarship views — thin handlers over the service."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.scholarships import services
from features.scholarships.models import Scholarship
from features.scholarships.serializers import scholarship_catalog_item

NOT_FOUND = {"detail": "المنحة غير موجودة"}


@api_view(["GET"])
def scholarship_detail_view(request: Any, slug: str) -> Response:
    """One scholarship as a `CatalogItem`."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response(NOT_FOUND, status=404)
    return Response(scholarship_catalog_item(scholarship))


@api_view(["POST"])
def scholarship_apply_view(request: Any, slug: str) -> Response:
    """Submit an application for the signed-in learner; visitors get the plain acknowledgement."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response(NOT_FOUND, status=404)
    if request.user.is_authenticated:
        services.apply(request.user, scholarship)
    return Response({"applied": True, "scholarshipId": scholarship.slug})


@api_view(["POST"])
def scholarship_save_view(request: Any, slug: str) -> Response:
    """Toggle a saved scholarship for the signed-in learner, or echo the visitor's intent."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response(NOT_FOUND, status=404)
    if not request.user.is_authenticated:
        return Response({"saved": bool(request.data.get("saved", True)), "scholarshipId": scholarship.slug})
    saved = services.toggle_save(request.user, scholarship)
    return Response({"saved": saved, "scholarshipId": scholarship.slug})
