"""App-layer cache-aside: versioned namespaced keys, TTL jitter, miss logging.

Every cached family gets a namespace; `bump_version` invalidates the whole
family instantly by moving the version inside the key (no cache scans). Views
never get/set by hand — this module owns the key shape and the TTL policy
(cache-strategy §4, §7), so Redis can slot in behind `CACHES` unchanged.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
from collections.abc import Callable
from typing import Any

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Keys: kh:<namespace>:v<version>:<digest> — the family version moves on
# invalidation, so stale entries age out instead of being hunted down.
_PREFIX = "kh"
# Sentinel so a cached None (e.g. a negative detail lookup) reads as a hit,
# not as an absent key.
_MISS = object()

# Safety-net TTL for every app-cached payload. Correctness comes from the
# version bump on write; the TTL only bounds a forgotten invalidation.
DEFAULT_TTL_SECONDS = 300


def param_digest(payload: Any) -> str:
    """A short deterministic digest of any JSON-safe params blob."""
    canonical = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


def _version_key(namespace: str) -> str:
    return f"{_PREFIX}:{namespace}:version"


def _version(namespace: str) -> int:
    return cache.get(_version_key(namespace)) or 1


def bump_version(namespace: str) -> None:
    """Invalidate a family: new keys get a new version, old ones age out.

    Callers run this inside `transaction.on_commit` — a reader that raced the
    write must not repopulate the family from pre-commit data
    (cache-strategy §5).
    """
    try:
        cache.incr(_version_key(namespace))
    except ValueError:
        # First bump: the version key does not exist yet. A counter, never
        # expiring, so it cannot be half-written.
        cache.set(_version_key(namespace), 2, None)


def cached(namespace: str, digest: str, ttl_seconds: int, loader: Callable[[], Any]) -> Any:
    """Cache-aside: hit → the value; miss → `loader()`, stored with ±10% TTL
    jitter (keys do not all expire together) and one `cache miss` log line —
    the observable hit-ratio signal (cache-strategy §11)."""
    key = f"{_PREFIX}:{namespace}:v{_version(namespace)}:{digest}"
    value = cache.get(key, _MISS)
    if value is not _MISS:
        return value
    value = loader()
    cache.set(key, value, max(1, int(ttl_seconds * random.uniform(0.9, 1.1))))
    logger.info("cache miss", extra={"cache_ns": namespace, "cache_key": key})
    return value
