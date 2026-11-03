"""DRF permissions for the API.

Phase 12 retired the legacy ``IsAdminRole`` permission class. Every privileged
route now declares a named permission key from ``features/access/registry.py``
via ``features/access.permissions.perm`` (or ``permission_for_methods`` for the
admin console), so the whole surface is auditable through the role manager.
"""

from __future__ import annotations
