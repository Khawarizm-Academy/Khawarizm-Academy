"""Vimeo link parsing and the registry specification."""

from __future__ import annotations

import re
from urllib.parse import parse_qsl

from features.videohosting.providers.base import ProviderSpec, Reference, _split_https_url

VIMEO_HOSTS = frozenset({"vimeo.com", "www.vimeo.com"})
VIMEO_PLAYER_HOSTS = frozenset({"player.vimeo.com"})
VIMEO_ID = re.compile(r"[0-9]{1,20}\Z")
VIMEO_HASH = re.compile(r"[A-Za-z0-9_-]{1,64}\Z")


def _reference_parts(external_id: str) -> tuple[str, str | None] | None:
    parts = external_id.split("/")
    if len(parts) not in {1, 2} or VIMEO_ID.fullmatch(parts[0]) is None:
        return None
    if len(parts) == 2 and VIMEO_HASH.fullmatch(parts[1]) is None:
        return None
    return parts[0], parts[1] if len(parts) == 2 else None


def _query_hash(query: str) -> tuple[bool, str | None]:
    if not query or "%" in query:
        return True, None
    try:
        pairs = parse_qsl(query, keep_blank_values=True, strict_parsing=True)
    except ValueError:
        return False, None
    if len({key for key, _value in pairs}) != len(pairs):
        return False, None
    values = {key: value for key, value in pairs}
    keys = {key for key, _value in pairs}
    if not keys <= {"h", "dnt"} or values.get("dnt", "1") != "1":
        return False, None
    hash_value = values.get("h")
    if hash_value is not None and VIMEO_HASH.fullmatch(hash_value) is None:
        return False, None
    return True, hash_value


def parse_reference(url: str) -> Reference | None:
    """Return a canonical Vimeo reference without contacting Vimeo."""
    parsed = _split_https_url(url, VIMEO_HOSTS | VIMEO_PLAYER_HOSTS)
    if parsed is None or parsed.fragment:
        return None

    if parsed.hostname in VIMEO_PLAYER_HOSTS:
        path = parsed.path.removesuffix("/")
        parts = path.split("/")
        if len(parts) != 3 or parts[1] != "video":
            return None
        video_id = parts[2]
        query_ok, hash_value = _query_hash(parsed.query)
        if not query_ok:
            return None
    else:
        if parsed.query:
            return None
        path = parsed.path.removesuffix("/")
        parts = path.split("/")
        if len(parts) not in {2, 3}:
            return None
        video_id = parts[1]
        hash_value = parts[2] if len(parts) == 3 else None

    if VIMEO_ID.fullmatch(video_id) is None:
        return None
    if hash_value is not None and VIMEO_HASH.fullmatch(hash_value) is None:
        return None
    external_id = video_id if hash_value is None else f"{video_id}/{hash_value}"
    canonical = f"https://vimeo.com/{external_id}"
    return ("vimeo", external_id, canonical)


def embed_url(external_id: str) -> str:
    """Build a Vimeo iframe URL while retaining an unlisted-video hash."""
    parts = _reference_parts(external_id)
    if parts is None:
        raise ValueError("invalid Vimeo video reference")
    video_id, hash_value = parts
    suffix = f"&h={hash_value}" if hash_value else ""
    return f"https://player.vimeo.com/video/{video_id}?dnt=1{suffix}"


VIMEO = ProviderSpec(
    code="vimeo",
    name="Vimeo",
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
