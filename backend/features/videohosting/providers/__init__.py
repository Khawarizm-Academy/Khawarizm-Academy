# Provider registry <- /api/videohosting/providers, ingest, adminconsole.
# One module per provider lives under providers/, each declaring a ProviderSpec.
# Adding a provider touches no existing logic — see the three steps at the
# bottom of this docstring.
from __future__ import annotations

from django.conf import settings

from features.videohosting.models import VideoProvider
from features.videohosting.providers.base import ProviderSpec
from features.videohosting.providers.google_drive import GOOGLE_DRIVE
from features.videohosting.providers.telegram import TELEGRAM

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
        row, _ = VideoProvider.objects.get_or_create(code=spec.code, defaults=spec.row_defaults())
        changes = {k: v for k, v in spec.row_defaults().items() if getattr(row, k) != v}
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
        spec = spec_for(p.code)
        if spec is None:
            results.append({"code": p.code, "name": p.name, "enabled": p.is_enabled, "isDefault": p.is_default})
            continue
        available = spec.available()
        reason = "" if available else spec.reason()
        results.append({
            **provider_payload(p),
            "available": include_gate and available,
            "reason": include_gate and reason,
        })
    return results


# Added in the refactor: one import brings everything; no other module ever
# needs to know about Telegram vs Drive internals.
from features.videohosting.serializers import provider_payload  # noqa: E402 — after SPECS so import order works
