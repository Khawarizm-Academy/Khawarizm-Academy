"""Scholarship views — thin handlers over the service."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers as ser
from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.common.errors import NotFound
from features.common.messages import SCHOLARSHIP_NOT_FOUND
from features.scholarships import services
from features.scholarships.models import Scholarship
from features.scholarships.serializers import scholarship_catalog_item

# The toggle's optional body — the visitor-echo path reads the same key.
inline_save = inline_serializer("ScholarshipSaveRequest", fields={"saved": ser.BooleanField(required=False)})


@extend_schema(
    operation_id="scholarship_detail",
    summary="One scholarship as a CatalogItem.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The CatalogItem shape (`type: scholarship`)."),
    },
)
@api_view(["GET"])
def scholarship_detail_view(request: Any, slug: str) -> Response:
    """One scholarship as a `CatalogItem`."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        raise NotFound(SCHOLARSHIP_NOT_FOUND)
    return Response(scholarship_catalog_item(scholarship))


@extend_schema(
    operation_id="scholarship_apply",
    summary="Apply to a scholarship.",
    request=None,
    description="Signed-in learners get an application row; visitors get the same acknowledgement — "
    "the SPA gates the button itself.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{applied: true, scholarshipId}`"),
    },
)
@api_view(["POST"])
def scholarship_apply_view(request: Any, slug: str) -> Response:
    """Submit an application for the signed-in learner; visitors get the plain acknowledgement."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        raise NotFound(SCHOLARSHIP_NOT_FOUND)
    if request.user.is_authenticated:
        services.apply(request.user, scholarship)
    return Response({"applied": True, "scholarshipId": scholarship.slug})


@extend_schema(
    operation_id="scholarship_save",
    summary="Toggle a saved scholarship.",
    description="Signed-in callers toggle the row; visitors get their intent echoed so the UI stays optimistic.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    request=inline_save,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{saved, scholarshipId}`"),
    },
)
@api_view(["POST"])
def scholarship_save_view(request: Any, slug: str) -> Response:
    """Toggle a saved scholarship for the signed-in learner, or echo the visitor's intent."""
    scholarship = Scholarship.objects.filter(slug=slug).first()
    if scholarship is None:
        raise NotFound(SCHOLARSHIP_NOT_FOUND)
    if not request.user.is_authenticated:
        return Response({"saved": bool(request.data.get("saved", True)), "scholarshipId": scholarship.slug})
    saved = services.toggle_save(request.user, scholarship)
    return Response({"saved": saved, "scholarshipId": scholarship.slug})
