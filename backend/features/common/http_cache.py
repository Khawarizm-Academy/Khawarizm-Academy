"""HTTP cache headers for the public read API: ETag/304 + Cache-Control.

Layer 2 of the caching strategy (browser/CDN before the app cache). The ETag
is a digest of the payload, so a `304` answer skips the body — and because
callers feed cached data in, it skips the database queries too. Private and
per-user routes stay out of this module entirely; they get `private,
no-store` from `config.middleware.PrivateCacheMiddleware`.
"""

from __future__ import annotations

import hashlib
import json

from django.http import HttpRequest
from rest_framework.response import Response


def etag_of(data) -> str:
    """A strong ETag from the canonical serialization of the payload."""
    canonical = json.dumps(data, sort_keys=True, default=str, ensure_ascii=False)
    return f'"{hashlib.sha256(canonical.encode()).hexdigest()[:32]}"'


def _matches(inbound: str, etag: str) -> bool:
    """Compare an If-None-Match value against our ETag, ignoring the weak
    marker GZipMiddleware adds when it compresses a strong ETag."""
    return inbound.strip().removeprefix("W/").strip('"') == etag.strip('"')


def etag_response(
    request: HttpRequest,
    data,
    *,
    public: bool = True,
    max_age: int = 30,
    s_maxage: int = 300,
    swr: int = 600,
    must_revalidate: bool = False,
) -> Response:
    """Serve `data` with ETag + Cache-Control; answer 304 on a match.

    The 200 body goes through DRF's renderer exactly as before — headers are
    the only change a non-caching client can observe.
    """
    etag = etag_of(data)
    headers = {"ETag": etag}
    if public:
        cache_control = f"public, max-age={max_age}"
        if s_maxage:
            cache_control += f", s-maxage={s_maxage}"
        if swr:
            cache_control += f", stale-while-revalidate={swr}"
        if must_revalidate:
            cache_control += ", must-revalidate"
    else:
        cache_control = "private, no-store"
    headers["Cache-Control"] = cache_control

    if request.headers.get("If-None-Match") and _matches(request.headers["If-None-Match"], etag):
        return Response(status=304, headers=headers)
    return Response(data, headers=headers)
