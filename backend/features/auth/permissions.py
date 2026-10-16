"""DRF permissions for the API."""

from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allows the request only for the admin role or Django staff users."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "is_admin", False))
