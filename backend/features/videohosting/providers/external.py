"""Direct HTTPS media URL parsing and the registry specification."""

from __future__ import annotations

from urllib.parse import urlsplit

from features.videohosting.providers.base import (
    ProviderSpec,
    Reference,
    _canonical_url,
    _is_public_hostname,
)

EXTERNAL_SUFFIXES = frozenset({".mp4", ".webm", ".m3u8"})


def parse_reference(url: str) -> Reference | None:
    """Return a validated external media URL without making a network request."""
    if not isinstance(url, str) or not url or len(url) > 500:
        return None
    if not url.isascii() or any(character.isspace() or ord(character) < 32 for character in url):
        return None
    if "\\" in url:
        return None
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError:
        return None
    host = parsed.hostname
    if (
        parsed.scheme.lower() != "https"
        or not host
        or parsed.username
        or parsed.password
        or port is not None
        or parsed.fragment
        or not parsed.path.startswith("/")
        or "//" in parsed.path
    ):
        return None
    host = host.lower()
    if not _is_public_hostname(host):
        return None
    if not any(parsed.path.lower().endswith(suffix) for suffix in EXTERNAL_SUFFIXES):
        return None
    canonical = _canonical_url(parsed)
    return ("external", canonical, canonical)


EXTERNAL = ProviderSpec(
    code="external",
    name="External URL",
    is_enabled=True,
    is_default=False,
    capabilities={
        "resumableUpload": False,
        "privateAccess": False,
        "requiresAuth": False,
        "playback": "external",
        "protection": "none",
    },
    kind="link",
    parse_reference=parse_reference,
)
