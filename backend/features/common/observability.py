"""Phase 13 §13.4 — the two operational signals the plan asks for.

`log_event` writes one structured line: the message plus a flat `event` dict of
ids, statuses and counters. `config.logging.JsonConsoleFormatter` whitelists the
`event` record attribute, so anything not JSON-friendly is dropped here rather
than at the formatter (which would swallow the whole line).

`count_permission_denial` is the "counted, not per-line spam" half: a hostile or
confused client hammering a forbidden endpoint produces one WARNING line per view
per interval, carrying the running count, instead of a line per request.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import Counter
from collections.abc import Mapping

LOGGER = logging.getLogger("features.observability")

# How often one view may repeat its denial warning. Chosen to be far below the
# throttle window (60 s) so every throttled burst still produces a line.
DENIAL_LOG_INTERVAL_SECONDS = 60.0

_denial_counts: Counter[str] = Counter()
_denial_last_logged: dict[str, float] = {}
_denial_lock = threading.Lock()


def log_event(
    logger: logging.Logger,
    message: str,
    *,
    level: int = logging.INFO,
    **fields: object,
) -> None:
    """Emit `message` with a flat structured payload; never raise from a log line."""
    safe = {key: _scalar(value) for key, value in fields.items()}
    logger.log(level, message, extra={"event": safe})


def _scalar(value: object) -> object:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def count_permission_denial(view: str, *, extra: Mapping[str, object] | None = None) -> None:
    """Count a 403 against `view`; log the running total once per interval."""
    key = view or "unknown"
    now = time.monotonic()
    with _denial_lock:
        _denial_counts[key] += 1
        count = _denial_counts[key]
        due = now - _denial_last_logged.get(key, 0.0) >= DENIAL_LOG_INTERVAL_SECONDS
        if due:
            _denial_last_logged[key] = now
    if due:
        log_event(
            LOGGER,
            "permission denials",
            level=logging.WARNING,
            view=key,
            count=count,
            **(extra or {}),
        )


def denial_counts() -> dict[str, int]:
    """The current counters — read by the admin surface and the tests."""
    with _denial_lock:
        return dict(_denial_counts)


def reset_denial_counts() -> None:
    """Test seam: forget the counters between cases."""
    with _denial_lock:
        _denial_counts.clear()
        _denial_last_logged.clear()
