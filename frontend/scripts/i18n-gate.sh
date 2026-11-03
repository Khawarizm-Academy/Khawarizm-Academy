#!/usr/bin/env bash
# Phase 13 §13.3 Arabic-literal gate.
#
# Every user-facing string must live in a copy JSON/dictionary (PLAN.md R14).
# This gate scans the newer feature folders introduced by Phases 7-13 for raw
# Arabic string literals inside `.tsx`/`.ts` — those belong in `data/*.json`.
# Legacy folders (courses, dashboard, catalog, auth, ...) pre-date the rule
# and are not gated here.
set -euo pipefail

cd "$(dirname "$0")/.."

FEATURES=(
  "src/features/studio"
  "src/features/admin"
  "src/features/quizzes"
  "src/features/discussions"
  "src/features/reviews"
  "src/features/announcements"
)

existing=()
for f in "${FEATURES[@]}"; do
  [[ -d "$f" ]] && existing+=("$f")
done

if [[ ${#existing[@]} -eq 0 ]]; then
  echo "Phase 13 i18n gate: no gated feature folders found; skipping."
  exit 0
fi

# Pre-existing offenders are tracked in an allowlist so the gate is
# forward-only: any NEW file that ships raw Arabic strings fails CI, and
# migrating an old one is a simple drop from the allowlist + PR.
ALLOWLIST="scripts/i18n-gate.allowlist"
ignore_args=()
if [[ -f "$ALLOWLIST" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
    ignore_args+=(--glob "!${line}")
  done < "$ALLOWLIST"
fi

# `-P` enables PCRE so \p{Arabic} works; the pattern is scoped to string
# literals inside JSX/TS: `"…Arabic…"`, `'…Arabic…'`, or back-ticked template
# literals. Comments (lines starting with `//` or `*`) are excluded.
matches=$(
  rg -nP \
    --glob '*.ts' \
    --glob '*.tsx' \
    --glob '!**/__tests__/**' \
    --glob '!**/*.test.ts' \
    --glob '!**/*.test.tsx' \
    --glob '!**/*.json' \
    --glob '!**/*.d.ts' \
    "${ignore_args[@]}" \
    '([\"\`])[^\`\"]*\p{Arabic}[^\`\"]*\1' \
    "${existing[@]}" \
    || true
)

if [[ -n "$matches" ]]; then
  echo "Phase 13 i18n gate: Arabic literals leaked into gated feature folders."
  echo "Move them into a \`data/*.json\` copy dictionary (import and index by key)."
  printf '%s\n' "$matches" | head -30
  exit 1
fi

echo "Phase 13 i18n gate: no raw Arabic literals in the gated feature folders."