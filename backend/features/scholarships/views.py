"""Scholarship detail, apply, and save endpoints."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.scholarships.models import Scholarship, ScholarshipApplication
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
        ScholarshipApplication.objects.get_or_create(user=request.user, scholarship=scholarship)
    return Response({"applied": True, "scholarshipId": scholarship.slug})


@api_view(["POST"])
def scholarship_save_view(request: Any, slug: str) -> Response:
    """Toggle a saved scholarship for the signed-in learner, or echo the visitor's intent."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        return Response(NOT_FOUND, status=404)
    if not request.user.is_authenticated:
        return Response({"saved": bool(request.data.get("saved", True)), "scholarshipId": scholarship.slug})
    # Imported here so the scholarships feature never depends on dashboard at module load.
    from features.dashboard.models import SavedScholarship

    saved = SavedScholarship.objects.filter(user=request.user, scholarship=scholarship).first()
    if saved is None:
        SavedScholarship.objects.create(user=request.user, scholarship=scholarship)
        return Response({"saved": True, "scholarshipId": scholarship.slug})
    saved.delete()
    return Response({"saved": False, "scholarshipId": scholarship.slug})
