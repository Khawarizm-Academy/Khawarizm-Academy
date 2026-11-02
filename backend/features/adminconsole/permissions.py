"""Method-specific granular access checks for the admin console."""

from __future__ import annotations

from collections.abc import Iterable

from rest_framework.permissions import BasePermission

from features.access.registry import PERMISSIONS
from features.access.services import has_perm
from features.common.errors import PermissionDenied


def _normalize_keys(keys: str | Iterable[str]) -> tuple[str, ...]:
    result = (keys,) if isinstance(keys, str) else tuple(keys)
    if not result:
        raise ValueError("At least one permission key is required")
    unknown = sorted(set(result) - PERMISSIONS.keys())
    if unknown:
        raise ValueError(f"Unknown permission key(s): {', '.join(unknown)}")
    return result


def permission_for_methods(**rules: str | tuple[str, ...] | list[str]) -> type[BasePermission]:
    """Return a DRF permission class that maps each HTTP method to any-of keys."""
    normalized = {method.upper(): _normalize_keys(keys) for method, keys in rules.items()}

    class HasMethodPermission(BasePermission):
        def has_permission(self, request, view) -> bool:
            keys = normalized.get(request.method.upper(), ())
            if any(has_perm(request.user, key) for key in keys):
                return True
            raise PermissionDenied()

    method_label = "_".join(sorted(normalized)) or "none"
    HasMethodPermission.__name__ = f"HasMethodPermission_{method_label}"
    HasMethodPermission.__qualname__ = HasMethodPermission.__name__
    HasMethodPermission.__module__ = __name__
    return HasMethodPermission


def require_any_permission(user, *keys: str) -> None:
    """Raise the shared 403 when none of the specified keys is effective."""
    if not keys or not any(has_perm(user, key) for key in keys):
        raise PermissionDenied()
