"""Provider registry for video hosting."""

from __future__ import annotations

from features.videohosting.models import VideoProvider


def ensure_defaults() -> None:
    """Ensure providers are registered."""
    google, _ = VideoProvider.objects.get_or_create(
        code="google_drive",
        defaults={
            "name": "Google Drive",
            "is_enabled": True,
            "is_default": True,
            "capabilities": {
                "resumableUpload": True,
                "privateAccess": True,
                "requiresAuth": True,
                "playback": "provider_managed_or_limited",
            },
        },
    )
    if not google.is_enabled:
        google.is_enabled = True
        google.save(update_fields=["is_enabled"])
    telegram, _ = VideoProvider.objects.get_or_create(
        code="telegram",
        defaults={
            "name": "Telegram",
            "is_enabled": False,
            "is_default": False,
            "capabilities": {
                "resumableUpload": False,
                "privateAccess": True,
                "requiresAuth": False,
                "playback": "hls_token",
            },
        },
    )
    if telegram.is_enabled:
        telegram.is_enabled = False
        telegram.save(update_fields=["is_enabled"])
