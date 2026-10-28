"""The OpenAPI contract surface: error envelope, schema class, auth schemes.

One place so the generated spec stays the contract (be-api-design §11): every
operation lists the envelope's error statuses, the session bearer is a named
security scheme, and the maintenance cron's secret scheme exists without
raising warnings.
"""

from __future__ import annotations

from drf_spectacular.openapi import AutoSchema
from rest_framework import serializers

# Statuses the exception handler (features/common/errors.py) answers with the
# envelope on any operation: validation/parsing, auth, permission, routing,
# throttling. 409/413/502 are endpoint-specific and declared where raised.
ENVELOPE_STATUSES = ("400", "401", "403", "404", "429")


class ErrorSerializer(serializers.Serializer):
    """The one error envelope — `{detail, code, fields?}` (Phase 8)."""

    detail = serializers.CharField(help_text="Human-facing message (Arabic).")
    code = serializers.CharField(help_text="Machine-readable code the SPA reacts to.")
    fields = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=False,
        help_text="Per-input validation messages (400 only).",
    )


class ContractAutoSchema(AutoSchema):
    """AutoSchema that documents the error envelope on every operation.

    Responses a view declared explicitly (the `200`/`202`/`201` from
    `@extend_schema`) stay untouched; the shared error statuses are appended
    once, referencing the same `Error` component instead of 65 copies.
    """

    def _get_response_bodies(self, direction: str = "response") -> dict:
        bodies = super()._get_response_bodies(direction=direction)
        for status_code in ENVELOPE_STATUSES:
            if str(status_code) not in bodies:
                bodies[str(status_code)] = self._get_response_for_code(
                    ErrorSerializer, str(status_code), direction=direction
                )
        return bodies
