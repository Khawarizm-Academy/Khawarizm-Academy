# Provider registry <- /api/videohosting/providers, ingest, adminconsole
# One module per provider lives under providers/, each declaring a ProviderSpec.
# Adding a provider touches no existing logic — see the three steps at the
# bottom of this docstring.
from __future__ import annotations

from django.conf import settings

from features.videohosting.models import VideoProvider
from features.videohosting.providers.base import ProviderSpec
from features.videohosting.providers.google_drive import GOOGLE_DRIVE
from features.videohosting.providers.telegram import TELEGRAM

# Every hosting provider the backend knows, one spec per module.
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
        changes = {key: value for key, value in spec.row_defaults().items() if getattr(row, key) != value}
        if changes:
            for key, value in changes.items():
                setattr(row, key, value)
            row.save(update_fields=list(changes))


def default_code() -> str:
    """The provider code assets fall back to when none is given."""
    return settings.VIDEO_HOSTING_DEFAULT_PROVIDER


# Adding a new provider — three steps, one file each:
#   1. providers/<code>.py — a ProviderSpec + a credentials() reading its settings.
#   2. config/settings.py — os.environ.get for its keys; .env* — placeholder block.
#   3. here — import the spec and add it to SPECS.
