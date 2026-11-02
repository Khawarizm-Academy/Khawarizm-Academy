"""DRF permission factories backed by the canonical access service."""

from __future__ import annotations

from functools import cache

from rest_framework.permissions import BasePermission

from features.access.registry import PERMISSIONS
from features.access.services import has_perm
from features.common.errors import PermissionDenied


def _check(request, keys: tuple[str, ...]) -> bool:
    user = getattr(request, "user", None)
    if any(has_perm(user, key) for key in keys):
        return True
    raise PermissionDenied("ليس لديك الصلاحية المطلوبة.")


@cache
def perm(key: str) -> type[BasePermission]:
    """Build a permission class requiring one catalog key."""
    if key not in PERMISSIONS:
        raise ValueError(f"Unknown permission key: {key}")

    class HasPermission(BasePermission):
        def has_permission(self, request, view) -> bool:
            return _check(request, (key,))

    HasPermission.__name__ = f"HasPermission_{key.replace('.', '_').replace('-', '_')}"
    HasPermission.__qualname__ = HasPermission.__name__
    HasPermission.__module__ = __name__
    return HasPermission


@cache
def perm_any(*keys: str) -> type[BasePermission]:
    """Build a permission class requiring at least one of several keys."""
    if not keys:
        raise ValueError("perm_any requires at least one permission key")
    unknown = sorted(set(keys) - PERMISSIONS.keys())
    if unknown:
        raise ValueError(f"Unknown permission key(s): {', '.join(unknown)}")

    class HasAnyPermission(BasePermission):
        def has_permission(self, request, view) -> bool:
            return _check(request, keys)

    HasAnyPermission.__name__ = "HasAnyPermission_" + "_or_".join(key.replace(".", "_") for key in keys)
    HasAnyPermission.__qualname__ = HasAnyPermission.__name__
    HasAnyPermission.__module__ = __name__
    return HasAnyPermission
