#!/usr/bin/env bash
# Resync the OS clock from an HTTPS Date header.
# The point: some networks block NTP entirely (UDP/123) — `timedatectl`
# shows "NTP service: active" but "synchronized: no" forever, and the
# clock free-runs until it lags past the 60 s auth-SDK tolerance, which
# makes every local sign-in fail with 401. HTTPS (port 443) demonstrably
# works there, so the header's Date is the reference. One-second
# precision is plenty when the enemy is a 67-second lag.
# Run as root:
#   sudo backend/scripts/sync_clock_from_http.sh
set -euo pipefail

now="$(curl -fsSI https://www.google.com | sed -n 's/^[Dd]ate: //p' | tr -d '\r')"
if [ -z "$now" ]; then
    echo "unreachable reference host - no Date header came back"
    exit 1
fi

echo "syncing system clock to: $now"
date -s "$now"
echo "done - verify with: cd backend && python manage.py clock_drift"
