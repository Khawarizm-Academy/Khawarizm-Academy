# Provider registry <- /api/videohosting/providers, ingest, admin console.
# One module per provider lives under providers/, each declaring a ProviderSpec.
# Adding a provider = one module here + one SPECS entry — see the README.
from __future__ import annotations

from django.conf import settings

from features.videohosting.models import VideoProvider
from features.videohosting.providers.base import ProviderSpec
from features.videohosting.providers.google_drive import GOOGLE_DRIVE
from features.videohosting.providers.telegram import TELEGRAM
from features.videohosting.serializers import provider_payload

SPECS: tuple[ProviderSpec, ...] = (GOOGLE_DRIVE, TELEGRAM)


def spec_for(code: str) -> ProviderSpec | None:
    """The spec for a provider code, or None — a record lookup, no branch ladder."""
    return {spec.code: spec for spec in SPECS}.get(code)


def ensure_defaults() -> None:
    """Upsert one VideoProvider row per spec — the specs are the source of truth.

    A row toggled by hand is re-synced on the next call, so enablement is
    decided in code and reviewed in git, not drifted in the admin.
    """
    for spec in SPECS:
        defaults = spec.row_defaults()
        row, _ = VideoProvider.objects.get_or_create(code=spec.code, defaults=defaults)
        changes = {k: v for k, v in defaults.items() if getattr(row, k) != v}
        if changes:
            for k, v in changes.items():
                setattr(row, k, v)
            row.save(update_fields=list(changes))


def default_code() -> str:
    """The provider code assets fall back to when none is given."""
    return settings.VIDEO_HOSTING_DEFAULT_PROVIDER


def provider_listing(include_gate: bool = True) -> list[dict]:
    """A unified provider listing used by both public and admin endpoints.

    When `include_gate` is True, each entry carries ``available`` and ``reason``
    drawn from the spec's own env checks — keeping the two callers identical.
    """
    ensure_defaults()
    results = []
    for p in VideoProvider.objects.all():
        entry = provider_payload(p)
        if include_gate:
            spec = spec_for(p.code)
            available = spec.available() if spec else False
            entry["available"] = available
            entry["reason"] = "" if available else "مزود غير مكتمل الإعداد" if spec is None else spec.reason()
        results.append(entry)
    return results
