"""Certificate response mappers; no serializer performs database work."""

from __future__ import annotations

from typing import Any

from features.courses.certificate_services import certificate_serial, verification_payload


def verification(row: Any) -> dict[str, Any]:
    return verification_payload(row)


def revoked(row: Any) -> dict[str, Any]:
    return {
        "serial": certificate_serial(row),
        "revoked": True,
        "revokedAt": row.revoked_at.isoformat() if getattr(row, "revoked_at", None) else None,
        "reason": getattr(row, "revoked_reason", "") or "",
    }
