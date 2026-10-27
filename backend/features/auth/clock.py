# The lagging-clock story in one place: measure the drift against real time,
# and say the fix. On dev machines whose network blocks NTP (UDP/123) the
# clock free-runs -- systemd will show "NTP service: active" yet never
# synchronize -- and once the lag passes the auth SDK's 60-second cap every
# sign-in fails with 401 ("Token used too early"). Deployment works because
# hosted infrastructure syncs its own clock. The fix is resyncing the OS
# clock over HTTPS, and every check below only points at that.
from __future__ import annotations

import threading
import time
import urllib.request
from email.utils import parsedate_to_datetime

# A lag more than this means "Token used too early" will bite soon even at
# the SDK's maximum 60-second skew, so warnings and a failing exit begin here.
DRIFT_LIMIT_SECONDS = 45
REQUEST_SECONDS = 4

CLOCK_FIX = (
    "Fix the clock, then retry: sudo backend/scripts/sync_clock_from_http.sh "
    "(HTTPS resync -- this network blocks NTP over UDP/123), or enable NTP "
    "with: sudo timedatectl set-ntp true."
)


def drift_seconds() -> int | None:
    """Seconds the local clock lags real time (positive = lagging), or None
    when the reference is unreachable -- offline must fail quiet, not fail
    the server boot."""
    request = urllib.request.Request("https://www.google.com", method="HEAD")  # noqa: S310 -- fixed reference host
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 -- fixed reference host
            server_seconds = parsedate_to_datetime(response.headers["Date"]).timestamp()
    except Exception:
        return None
    return int(server_seconds - time.time())


def drift_warnings(drift: int | None) -> list[str]:
    """The lines an operator needs read; empty or None means all is fine.

    Terminal-facing output only -- ASCII, never Arabic: these lines print to
    consoles where RTL text renders illegibly.
    """
    if drift is None:
        return []
    if drift > DRIFT_LIMIT_SECONDS:
        return [
            f"System clock lags real time by {drift} s -- every sign-in fails with 401 until it is resynced.",
            "   " + CLOCK_FIX,
        ]
    if drift > 10:
        return [f"Clock drift {drift} s -- still inside the 60 s tolerance, but resync before it creeps further."]
    return []


def warn_background() -> None:
    """The dev-server advisory: a daemon thread so a slow network never
    delays `runserver`; prints only when the drift actually bites."""

    def _warn() -> None:
        for line in drift_warnings(drift_seconds()):
            print(line, flush=True)

    threading.Thread(target=_warn, daemon=True).start()
