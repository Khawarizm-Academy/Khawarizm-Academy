"""Serializer-only projections for the access feature.

The role manager services annotate rows before they reach this module. These
helpers only map model/annotation attributes to the public camelCase contract;
they never query the database.
"""

from __future__ import annotations

from typing import Any


def role_row(role: Any, actor: Any = None) -> dict[str, Any]:
    """Serialize an annotated role without performing policy or database work.

    ``member_count`` and ``can_manage`` are attached by the service/view layer.
    ``actor`` is accepted as part of the serializer contract so callers can
    pass the resolved principal without making the serializer resolve it.
    """
    del actor
    created_at = getattr(role, "created_at", None)
    updated_at = getattr(role, "updated_at", None)
    template_key = getattr(role, "template_key", "") or None
    can_manage = getattr(role, "can_manage", getattr(role, "canManage", False))
    return {
        "id": str(role.pk),
        "slug": role.slug,
        "name": role.name,
        "description": role.description,
        "color": role.color,
        "position": role.position,
        "permissions": list(role.permissions or []),
        "isSystem": bool(role.is_system),
        "isDefault": bool(role.is_default),
        "templateKey": template_key,
        "memberCount": int(getattr(role, "member_count", 0) or 0),
        "canManage": bool(can_manage),
        "createdAt": created_at.isoformat() if created_at is not None else None,
        "updatedAt": updated_at.isoformat() if updated_at is not None else None,
    }


# Keep a descriptive alias for callers that prefer payload terminology.
role_payload = role_row
