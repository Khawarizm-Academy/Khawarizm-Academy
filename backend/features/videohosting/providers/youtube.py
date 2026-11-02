"""YouTube link parsing and the registry specification."""

from __future__ import annotations

import re
from urllib.parse import parse_qsl

from features.videohosting.providers.base import ProviderSpec, Reference, _split_https_url

YOUTUBE_HOSTS = frozenset({"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"})
YOUTU_BE_HOSTS = frozenset({"youtu.be"})
YOUTUBE_ID = re.compile(r"[A-Za-z0-9_-]{11}\Z")


def _video_id(value: str) -> str | None:
    return value if YOUTUBE_ID.fullmatch(value) else None


def parse_reference(url: str) -> Reference | None:
    """Return a canonical YouTube reference without contacting YouTube."""
    parsed = _split_https_url(url, YOUTUBE_HOSTS | YOUTU_BE_HOSTS)
    if parsed is None or parsed.fragment or "%" in parsed.query:
        return None

    if parsed.hostname in YOUTU_BE_HOSTS:
        if parsed.query:
            return None
        path = parsed.path.removesuffix("/")
        if not path.startswith("/") or path.count("/") != 1:
            return None
        video_id = _video_id(path[1:])
    elif parsed.path == "/watch":
        pairs = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
        video_values = [value for key, value in pairs if key == "v"]
        if len(video_values) != 1:
            return None
        video_id = _video_id(video_values[0])
    else:
        if parsed.query:
            return None
        path = parsed.path.removesuffix("/")
        parts = path.split("/")
        if len(parts) != 3 or parts[1] not in {"embed", "shorts"}:
            return None
        video_id = _video_id(parts[2])

    if video_id is None:
        return None
    canonical = f"https://www.youtube.com/watch?v={video_id}"
    return ("youtube", video_id, canonical)


def embed_url(external_id: str) -> str:
    """Build YouTube's privacy-enhanced iframe URL from a validated id."""
    if _video_id(external_id) is None:
        raise ValueError("invalid YouTube video id")
    return f"https://www.youtube-nocookie.com/embed/{external_id}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1"


YOUTUBE = ProviderSpec(
    code="youtube",
    name="YouTube",
    is_enabled=True,
    is_default=False,
    capabilities={
        "resumableUpload": False,
        "privateAccess": False,
        "requiresAuth": False,
        "playback": "embed",
        "protection": "none",
    },
    kind="link",
    parse_reference=parse_reference,
    embed_url=embed_url,
)
