# Provider spec <- the providers registry
# One record per host, defined in its own provider module; the registry upserts
# these rows into the admin-visible VideoProvider table, so the specs (never
# hand-edited rows) are the source of truth for name, enablement, capabilities.
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProviderSpec:
    """A hosting provider's identity and capability flags, declared once per provider."""

    code: str
    name: str
    is_enabled: bool
    is_default: bool
    capabilities: dict[str, object] = field(default_factory=dict)

    def row_defaults(self) -> dict[str, object]:
        """The VideoProvider column values this spec always enforces."""
        return {
            "name": self.name,
            "is_enabled": self.is_enabled,
            "is_default": self.is_default,
            "capabilities": self.capabilities,
        }
