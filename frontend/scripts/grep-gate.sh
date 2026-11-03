#!/usr/bin/env bash
# Phase 12 grep gate: the legacy `isAdmin` UI fallback is retired — the frontend
# must read permissions only. `isAdmin` may still appear in type definitions and
# test fixtures (the payload field remains additive per D5/backlog B9), but no
# runtime code path may consume it as an access check.
set -euo pipefail

cd "$(dirname "$0")/.."

# Search .ts/.tsx under src/ for the pattern `user.isAdmin` / `user?.isAdmin`
# or `|| Boolean(user?.isAdmin)` outside type/test files.
# Only runtime property reads count — comments and string literals are allowed
# to mention the retired field for historical context.
matches=$(
  rg -n \
    --glob 'src/**/*.{ts,tsx}' \
    --glob '!src/**/*.test.ts' \
    --glob '!src/**/*.test.tsx' \
    --glob '!src/**/__tests__/**' \
    --glob '!src/features/auth/types.ts' \
    --glob '!src/shared/lib/permissions.ts' \
    -- '\buser\??\.isAdmin\b' || true
)

if [[ -n "$matches" ]]; then
  echo "Phase 12 gate failed: 'user.isAdmin' is still read in runtime code:"
  echo "$matches"
  echo
  echo "Read permissions instead, e.g. can(user, 'admin.access')."
  exit 1
fi

echo "Phase 12 grep gate: no runtime user.isAdmin reads."
