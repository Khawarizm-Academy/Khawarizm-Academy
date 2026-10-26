# The lagging-clock story in one place: measure the drift against real time,
# and say the fix. WSL clocks fall behind after a suspend; Firebase then
# refuses every sign-in ("Token used too early") because the SDK caps its
# tolerance at 60 seconds and the drift can exceed that — so the fix is
# resyncing the OS clock, and every check below only points at it.
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
    "Fix the clock, then retry: run `wsl --shutdown` from Windows and reopen "
    "the terminal, or `sudo hwclock -s` inside WSL."
)


def drift_seconds() -> int | None:
    """Seconds the local clock lags real time (positive = lagging), or None
    when the reference is unreachable — offline must fail quiet, not fail
    the server boot."""
    request = urllib.request.Request("https://www.google.com", method="HEAD")  # noqa: S310 — fixed reference host
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:  # noqa: S310 — fixed reference host
            server_seconds = parsedate_to_datetime(response.headers["Date"]).timestamp()
    except Exception:
        return None
    return int(server_seconds - time.time())


def drift_warnings(drift: int | None) -> list[str]:
    """The lines an operator needs read; empty or None means all is fine."""
    if drift is None:
        return []
    if drift > DRIFT_LIMIT_SECONDS:
        return [
            f"⚠️  ساعة النظام متأخرة {drift} ثانية عن الساعة الحقيقية — كل تسجيل دخول سيفشل بـ 401.",
            "   " + CLOCK_FIX,
        ]
    if drift > 10:
        return [f"ℹ️  تفاوت الساعة {drift} ثانية — ما زال داخل سماحية 60 ثانية، لكن أعد مزامنة الساعة قبل أن يزحف أكثر."]
    return []


def warn_background() -> None:
    """The dev-server advisory: a daemon thread so a slow network never
    delays `runserver`; prints only when the drift actually bites."""

    def _warn() -> None:
        for line in drift_warnings(drift_seconds()):
            print(line, flush=True)

    threading.Thread(target=_warn, daemon=True).start()
