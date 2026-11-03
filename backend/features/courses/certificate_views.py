"""Public certificate verification and privileged revocation endpoints."""

from __future__ import annotations

from typing import Any

from django.core.cache import caches
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from features.courses import certificate_serializers, certificate_services


class CertificateVerifyThrottle(SimpleRateThrottle):
    """Keep serial probing bounded without requiring shared settings changes."""

    scope = "cert_verify"
    rate = "30/min"
    cache = caches["default"]

    def get_cache_key(self, request, view):
        return f"throttle:certificate-verify:{self.get_ident(request)}"


@extend_schema(
    operation_id="certificate_verify",
    summary="Verify a course certificate without revealing private identity data.",
    auth=None,
    parameters=[OpenApiParameter("serial", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{valid, learnerName, courseTitle, issuedAt, revoked}`",
        ),
        404: OpenApiResponse(description="Certificate not found."),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([CertificateVerifyThrottle])
def certificate_verify_view(request: Any, serial: str) -> Response:
    """Return only the public verification contract for one serial."""
    row = certificate_services.certificate_for_serial(serial.strip())
    if row is None:
        from features.common.errors import NotFound

        raise NotFound(certificate_services.CERTIFICATE_NOT_FOUND)
    return Response(certificate_serializers.verification(row))


@extend_schema(
    operation_id="certificate_revoke",
    summary="Revoke a certificate with an auditable reason.",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The revoked certificate.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def certificate_revoke_view(request: Any, serial: str) -> Response:
    """Delegate permission, schema, persistence, and audit rules to the service."""
    row = certificate_services.revoke_certificate(
        request.user,
        serial.strip(),
        (request.data or {}).get("reason", ""),
        request=request,
    )
    return Response(certificate_serializers.revoked(row))
