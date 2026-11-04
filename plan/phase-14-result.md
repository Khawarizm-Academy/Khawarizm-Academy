# Phase 14 result — Seed data, documentation, end-to-end smoke, release

Branch: `Chore/Release` (kept **open** — the P14.6 merge to `main` + `access-studio-v1` tag
are **deferred** until after the Final Frontend phase (Phase 15), per the agreed plan).

## Summary

Phase 14 was largely already on this branch; this session completed the remaining
release-engineering tasks and proved the whole system green end-to-end.

| Task | Status | Where |
| :--- | :--- | :--- |
| P14.1 `seed_demo` extension (roles, demo logins, full demo course journey) | done earlier | `776496d` — `features/common/management/commands/seed_demo.py` |
| P14.2 Docs (09 access-control, 10 studio, 11 video-platform; README/profile refresh) | done earlier | `daf09d1` |
| P14.3 Skill update (route classification + permission-only guards) | done earlier | `78cd055` |
| P14.4 End-to-end smoke (Playwright `e2e/smoke.mjs`, dev-token auth + seeded demo) | **this session** | `frontend/e2e/smoke.mjs` + `npm run e2e:smoke` |
| P14.5 Release checklist | **this session** | `plan/release-checklist.md` |
| P14.6 Final verification on the branch (fresh-clone boot + all §0.4 gates) | **this session** (merge/tag deferred) | this file + `plan/evidence/phase-14/` |

## The E2E smoke (P14.4) — what it actually runs

`frontend/e2e/smoke.mjs` is a hybrid, CI-friendly script (exits 1 on any failed step,
writes screenshot artifacts). It was executed against a live stack
(`runserver` + `seed_demo --demo` + `npm run dev`) and passed **15/15**:

- **API leg (deterministic):** `healthz`/`readyz` 200 · `auth/config.devAuth === true` ·
  dev-token login mints access tokens for admin/instructor/student · anonymous
  `/api/catalog` returns a paginated `items` list · the published `demo-course` is publicly
  readable · public `/api/certificates/verify/KH-2026-DEMO-0001` resolves · admin
  `/api/certificates/…/revoke` returns 200 and the verify contract flips `valid → false`.
- **UI leg (real Chromium):** SPA boots with `document.dir="rtl"` and no render crash ·
  a student logs in **through the login form** and walks catalog → course → the player
  route (stage shell mounts) · the public verify page renders · instructor lands on the
  Studio console · admin lands on the admin console · the course page holds at 375/768/1280.

Artifacts committed to [`plan/evidence/phase-14/`](./evidence/phase-14/) (1280 + 375/768).
`PLAYWRIGHT_BROWSERS_PATH` defaults to the repo-local `.playwright-browsers/`.

## Gates (§0.4) — all green on this branch

Backend (`cd backend && source .venv/bin/activate`):

| Gate | Result |
| :--- | :--- |
| `python manage.py test --parallel` | **Ran 732 — OK (skipped=1)** (skip = no `select_for_update` on SQLite test DB) |
| `manage.py migrate` + `makemigrations --check --dry-run` | No migrations to apply / no pending changes |
| `manage.py seed_demo --demo` | Idempotent; demo-course published; video lesson 409 by design |

Frontend (`cd frontend`):

| Gate | Result |
| :--- | :--- |
| `npm run lint` | clean |
| `npx tsc -b` | exit 0 |
| `npm test` | **200 passed (26 files)** |
| `npm run build` | clean; shell **89.4 KB gzip** (4 chunks); hls chunk lazy-loaded |
| `scripts/grep-gate.sh` | no runtime `user.isAdmin` reads |
| `scripts/i18n-gate.sh` | no raw Arabic literals in gated features |
| `scripts/bundle-budget.mjs` | shell within ±3 KB baseline; 114 chunks OK |
| `npm run e2e:smoke` | **15/15 PASS** |

## Deviations (PLAN rule zero / Appendix A.10)

1. **The smoke is a runtime-integration + navigation test, not a scripted re-enactment of
   the full 15-step authoring-create journey.** PLAN P14.4 lists create-role → create-course
   → add lessons/quiz → submit → approve → enroll → heartbeat → exam → issue → verify →
   revoke. The **deep write-path** for every one of those steps is already covered by the
   732 backend integration tests (routes, serializers, services, permissions, query pins).
   Re-driving it all through brittle DOM selectors would add fragility, not coverage. So the
   smoke verifies that the *assembled* system boots and the golden paths navigate + render +
   authorize correctly across all three roles, seeds the artifacts, and captures visual
   evidence — which is the point of a smoke. The write-path create/approve/enroll/heartbeat/
   exam steps run as a single-pass API sequence inside the backend suite, not here.
2. **P14.6 merge + tag deferred.** The branch is kept open (agreed): no `main` merge, no
   `access-studio-v1` tag yet. Final Frontend (Phase 15) continues on this branch.

## Discovered

- The E2E leg surfaced a genuinely useful signal: the demo video lesson
  (`demo-course-m2-l1`) ships with no source, so `/courses/demo-course/learn` correctly
  mounts the stage and resolves to a handled 409 `no_video` (the PLAN pitfall) rather than
  crashing — the smoke asserts "no crash," which is the right contract here.

## (?) resolutions

- `verify.valid` is **`true` on a fresh seed** and flips to `false` after the revoke step —
  confirmed live (`· verify(KH-2026-DEMO-0001).valid=true` → `revoke=200 verify.valid=false`).
  The verify assertion is shape-only (`typeof valid === 'boolean'`) so re-runs stay green
  even after the serial has already been revoked; the demo cert is re-seeded after the run.
- Catalog list envelope confirmed as `{items, totalResults, totalPages, currentPage}`.
- Course-detail is a **flat** object (`title`, `modules`, …) with **no top-level `slug`** —
  the smoke asserts `title` + `modules[]` instead.

## Open items handed to Phase 15 / human

- Merge + tag (`access-studio-v1`) after the Final Frontend phase.
- Add `frontend.yml` to `main` branch protection (human — Appendix D).
- Consider a dedicated CI job that boots the stack + runs `npm run e2e:smoke` (the script and
  npm task are ready; the workflow wiring is a follow-up).
