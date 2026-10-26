# Google Drive provider <- the providers registry, resumable upload helpers
# Drive stores the video files: the backend resumable-uploads into a Drive
# folder with the OAuth credentials and serves playback through short-lived
# grants, never a raw, shareable file URL.
#
# Auth is OAuth 2.0 — the refresh token mints short-lived Access Tokens, or a
# service account JSON is used on headless hosts; one of the two is enough.
from django.conf import settings

from features.videohosting.providers.base import ProviderSpec

GOOGLE_DRIVE = ProviderSpec(
    code="google_drive",
    name="Google Drive",
    is_enabled=True,
    is_default=True,
    capabilities={
        "resumableUpload": True,
        "privateAccess": True,
        "requiresAuth": True,
        "playback": "provider_managed_or_limited",
    },
)

# Every env key the OAuth path needs; SERVICE_ACCOUNT_JSON is the headless
# alternative to REFRESH_TOKEN, and one of the two must be present.
REQUIRED_SETTINGS = (
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
)


def credentials() -> dict[str, str]:
    """The configured Drive credentials, failing loudly and naming each missing key.

    config/settings.py is the only place env values are read; provider code
    accesses them here, so a half-configured environment raises with the exact
    keys to set instead of failing later inside a random HTTP call.
    """
    values = {key: getattr(settings, key) or "" for key in REQUIRED_SETTINGS}
    refresh_token = settings.GOOGLE_DRIVE_REFRESH_TOKEN or ""
    service_account = settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or ""
    if not refresh_token and not service_account:
        raise ValueError(
            "Google Drive is not configured — set GOOGLE_DRIVE_REFRESH_TOKEN (OAuth) "
            "or GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (headless) in the environment"
        )
    values["GOOGLE_DRIVE_REFRESH_TOKEN"] = refresh_token
    values["GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON"] = service_account
    missing = [key for key, value in values.items() if not value]
    if missing:
        raise ValueError(f"Google Drive is not configured — set {', '.join(missing)} in the environment")
    return values
