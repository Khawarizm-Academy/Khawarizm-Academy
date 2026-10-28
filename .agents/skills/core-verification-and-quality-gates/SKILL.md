---
name: core-verification-and-quality-gates
description: How to prove a change is done in any project - build/typecheck/lint/test gates for JavaScript/TypeScript and Python/Django stacks, behavior-parity checks for refactors, endpoint smoke tests, performance and accessibility spot checks, and a definition of done. Use before saying a task is finished, after any refactor or file move, and when setting up CI.
---

# Verification & Quality Gates

"It compiles" is not "it works". Verify **behavior**, not just types. Take exact commands from the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)); these are the usual ones.

## 1. Gates by stack

**Frontend (Node)**
```bash
npm run build        # typecheck + production build, must exit 0
npx eslint .         # zero warnings that matter
npm test             # unit/component tests
```
Turn on `noUnusedLocals` / `noUnusedParameters`; removing data from a component then forces removing its import.

**Backend (Django)**
```bash
python manage.py check
python manage.py makemigrations --check --dry-run   # must report no changes
python manage.py migrate
python manage.py test
```

**Backend (Node)**: typecheck, lint, unit and integration tests, then boot the server and hit routes.

**Generic**: formatter check, secrets scan (no keys in git), dependency audit (`npm audit`, `pip-audit`).

## 2. Behavior parity for refactors

A pure refactor must not change runtime behavior. Prove it:
1. Capture the **old output** before editing (route resolution per URL, nav items per view, API payload for fixed inputs, rendered HTML/DOM, bundle chunk list).
2. Make the change.
3. Capture the **new output** the same way and diff. Zero diff, or every diff explained.

```bash
# API payload parity
curl -s -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/items > before.json
# ...refactor...
curl -s -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/items > after.json
diff <(jq -S . before.json) <(jq -S . after.json)
```

## 3. Smoke-test what you touched

- **Endpoints:** status code, payload keys vs the contract, a missing resource returns 404 (not an empty 200), auth required where expected, one invalid-input case returns a clear 4xx.
- **UI:** cold load shows the page skeleton once; a revisit is instant from cache; filter changes do not flash the skeleton; back/forward restores scroll; empty and error states render.
- **Responsive:** check roughly 390px, 768px, and 1280px widths. No horizontal scroll, tap targets at least 44px on touch.
- **RTL/i18n:** icons and text alignment on the correct side ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).
- **Reduced motion:** nothing essential depends on animation.

## 4. Performance and quality spot checks

- Bundle: compare the main chunk size before/after; flag a jump of more than a few percent.
- Lighthouse (or equivalent) on the changed page: LCP, INP, CLS ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).
- Queries: count queries per request and check the slowest with `EXPLAIN` ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md)). A list endpoint doing one query per row is a failed gate.
- Accessibility: keyboard-only pass, visible focus, labels, contrast ([`fe-accessibility`](../fe-accessibility/SKILL.md)).

## 5. Definition of done

- [ ] Build, lint, and tests pass with the project's exact commands.
- [ ] Migrations are generated and `makemigrations --check` is clean.
- [ ] Behavior verified by running it, not assumed; refactors have a parity diff.
- [ ] All states exist (loading, empty, error) and are reachable.
- [ ] No secrets, debug code, console logs, or commented-out code left.
- [ ] New env vars are documented and the app boots with them unset (fails loudly where required).
- [ ] README/profile updated for anything a future teammate would trip on.
- [ ] You can state what you did **not** verify.

## 6. Reporting

Report what ran and what it proved. If a gate could not run (no network, missing credentials), say so explicitly instead of implying success.
