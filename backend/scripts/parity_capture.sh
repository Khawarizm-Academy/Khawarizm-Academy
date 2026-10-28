#!/usr/bin/env bash
# usage: scripts/parity_capture.sh before|after
set -euo pipefail
STAGE="${1:?stage: before|after}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
DIR="${PARITY_DIR:-/tmp/opencode/parity}/${STAGE}"
mkdir -p "$DIR"
API="http://127.0.0.1:8000/api"
ORIGIN="Origin: http://localhost:5173"

cd "$REPO_ROOT/backend"
.venv/bin/python manage.py shell -c "
from features.auth.models import User
User.objects.filter(email='parity@example.com').delete()
" >/dev/null 2>&1


# catalog list ×3 param sets + detail
curl -s -H "$ORIGIN" "$API/catalog" -o "$DIR/catalog-default.json"
curl -s -H "$ORIGIN" "$API/catalog?type=courses&q=course&sort=popular&page=1" -o "$DIR/catalog-filtered.json"
curl -s -H "$ORIGIN" "$API/catalog?type=scholarships&field=cs&cost=free" -o "$DIR/catalog-scholarships.json"
curl -s -H "$ORIGIN" "$API/catalog/course-1" -o "$DIR/catalog-detail-course1.json"
curl -s -H "$ORIGIN" "$API/catalog/scholarship-1" -o "$DIR/catalog-detail-scholarship1.json"

# home / events / competitions / auth config
curl -s -H "$ORIGIN" "$API/home" -o "$DIR/home.json"
curl -s -H "$ORIGIN" "$API/events" -o "$DIR/events.json"
curl -s -H "$ORIGIN" "$API/competitions" -o "$DIR/competitions.json"
curl -s -H "$ORIGIN" "$API/auth/config" -o "$DIR/auth-config.json"

# courses GETs (only routes the router actually mounts; 404 variants are test work)
curl -s -H "$ORIGIN" "$API/courses/course-1" -o "$DIR/course-detail.json"
curl -s -H "$ORIGIN" "$API/courses/course-1/problems" -o "$DIR/course-problems.json"
curl -s -H "$ORIGIN" "$API/courses/course-1/related" -o "$DIR/course-related.json"
curl -s -H "$ORIGIN" "$API/scholarships/scholarship-1" -o "$DIR/scholarship-detail.json"

# dashboard ×4 + profile (dev-token auth)
echo "== authenticating parity user =="
LOGIN=$(curl -s -H "$ORIGIN" -H "Content-Type: application/json" -d '{"idToken":"dev:parity@example.com"}' "$API/auth/firebase")
ACCESS=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("accessToken",""))')
REFRESH=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("refreshToken",""))')
echo "access len: ${#ACCESS}"
AUTH2="Authorization: Bearer $ACCESS"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/dashboard" -o "$DIR/dashboard-summary.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/dashboard/enrolled" -o "$DIR/dashboard-enrolled.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/dashboard/saved" -o "$DIR/dashboard-saved.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/dashboard/competitions" -o "$DIR/dashboard-competitions.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/dashboard/notifications" -o "$DIR/dashboard-notifications.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/auth/me" -o "$DIR/auth-me.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/auth/sessions" -o "$DIR/auth-sessions.json"
curl -s -H "$ORIGIN" -H "$AUTH2" "$API/profile" -o "$DIR/profile.json"

# video meta (provider registry + a real asset slug)
curl -s -H "$ORIGIN" "$API/videos/providers" -o "$DIR/videos-providers.json"
curl -s -H "$ORIGIN" "$API/videos/raw-watch" -o "$DIR/videos-asset-meta.json"

ls -la "$DIR"
