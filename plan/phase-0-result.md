# Phase 0 — Baseline, CI, and safety net (result)

Branch: `Chore/AccessStudioBaseline` → PR into `Feature/AccessStudio`. Date: 2026-11-02.

## What landed

| Artifact | Result |
| :--- | :--- |
| `plan/PLAN.md` | The supplied 1,684-line upgrade plan is checked in on `Feature/AccessStudio` (commit `3c28574`). The integration branch was created from `main` and pushed. |
| `.github/workflows/frontend.yml` | Added Node 22 frontend CI for `main`/`Feature/**`: `npm ci`, lint, TypeScript build check, Vitest, production build with the documented dummy API URL, and cancellation of superseded runs. GitHub PR run is pending until this branch is pushed/opened as a PR. |
| `.github/workflows/backend.yml` | Added `Feature/**` to backend push/PR triggers. The old workflow did not run against the integration branch, which would have left backend changes ungated. |
| `frontend/eslint.config.js` | Added per-feature `no-restricted-imports` enforcement. Same-feature imports remain permitted; `auth/context` and `videohosting/*` are the two service boundaries. Pre-existing cross-feature import sites are enumerated individually with an explanatory comment rather than broad feature exemptions. A synthetic unauthorized import was rejected by ESLint. |
| `backend/config/middleware.py`, `backend/config/tests.py` | Fixed request-ID context token ownership: the token now lives on the individual request rather than shared middleware instance state. Added a deterministic two-thread regression test. |
| `backend/features/videohosting/providers/telegram.py` | Added deferred annotation evaluation so the `TYPE_CHECKING`-only `ProgressTracker` annotation does not raise `NameError` when Django imports the provider registry. |
| `backend/scripts/parity_capture.sh` | Added the course-only catalog and global problems snapshots required by the plan. The script uses the required `Origin` header. |
| `PROJECT_PROFILE.md`, `plan/CONVENTIONS.md` | Corrected the tracked public frontend env-file documentation, documented both CI workflows, and aligned phase-branch/migration guidance with this plan. |

No model, schema, migration, or runtime dependency changes were made.

## Baseline and gates

The backend environment was recreated with pinned runtime and development requirements under Python 3.14.10 (the repository's declared minimum/CI version). The host initially provided Python 3.12; its inability to parse the project's Python 3.14 exception syntax was an environment mismatch, not a source defect, so verification was redone on Python 3.14.10.

| Gate | Result |
| :--- | :--- |
| `python -m compileall -q .` | Pass. |
| `ruff check .` / `ruff format --check .` | Pass; all 159 backend source files format cleanly. |
| `python manage.py check` | Pass; no issues. |
| `python manage.py makemigrations --check --dry-run` | Pass; `No changes detected`. |
| `python manage.py migrate` | Pass on the local SQLite database. |
| `python manage.py spectacular --fail-on-warn` | Pass with zero schema warnings: **62 paths / 72 operations**. |
| `python manage.py test --parallel` | **452 tests pass**. The expected prior count was 451; the additional test is the new request-ID concurrency regression. |
| Production-shaped `python manage.py check --deploy` | Exit 0. One pre-existing/plan-accepted warning remains: `security.W021` (`SECURE_HSTS_PRELOAD` is not `True`). No warning was silenced. |
| `pip-audit -r requirements.txt` | Pass; no known vulnerabilities found. |
| Frontend: `npm ci`, lint, `npx tsc -b`, `npm test`, build | Pass on Node 22.23.4; **76 tests in 9 files**. The build emitted the existing large-chunk advisory only. |
| `git diff --check` | Pass. |

A Gitleaks directory scan of the working tree found no leaks. The local `gitleaks detect` invocation reported zero commits despite Git exposing 185 commits; that history scan is treated as **inconclusive**, not as proof of a clean history. The backend CI job still runs the repository's pinned Gitleaks command on the PR/full checkout and must be reviewed before merge.

## Parity evidence

`PARITY_DIR=/tmp/accessstudio/parity backend/scripts/parity_capture.sh before` exited 0. It produced **25 valid JSON snapshots** (13,091 bytes total) under `/tmp/accessstudio/parity/before`; every request includes `Origin: http://localhost:5173`. Captures include auth config/me/sessions, course and scholarship catalog/detail, `/api/catalog?type=courses`, dashboard/profile, home, events, competitions, videos/providers, and `/api/problems`.

There is no seeded `VideoAsset`; `/api/videos/raw-watch` therefore captured the existing 404 response `{"detail":"الفيديو غير موجود","code":"not_found"}`. No media or unlicensed demo video was added. The product-owner video source/licence decision remains a human-only item under Appendix D.

## Offline browser smoke

With `migrate`, `seed_demo`, Django `runserver`, and Vite (`VITE_API_BASE_URL=http://localhost:8000/api`), Chromium 156 signed in through the local dev-token flow as a seeded student and seeded admin/staff user. `/dashboard` rendered the seeded course content; `/admin` rendered its overview. After the request-ID fix, both flows had **zero API failures and zero page errors**. At 375, 768, and 1280px, both pages had no horizontal overflow. Screenshots are stored outside the repository at `/tmp/accessstudio/screenshots/` (`student-dashboard-{375,768,1280}.png`, `staff-admin-{375,768,1280}.png`).

The first concurrent browser run exposed 500s caused by the shared middleware token; sequential API calls and the automated suite had not caught it. The request-scoped fix and concurrency test resolved the 500s, and the repeated browser smoke passed.

## GitHub state and human handoff

The checkout was expanded from shallow to full history (185 commits visible). At inspection time, the public repository had one tag (`backend-skills-v1`), no GitHub Releases, no rulesets, and no open PRs in the displayed recent PR history. `main` branch protection currently requires only `lint · checks · tests · audit`; branch protection was not changed. **Human action:** after the new frontend workflow has run successfully once, add its required status check to `main` branch protection, as Appendix D/P0.3 requires. The exact published status context will be recorded after the PR run.

## Discovered / resolved

- The repository is Python 3.14-targeted; the apparent exception-syntax issue seen under Python 3.12 was not a repository defect. Verification uses Python 3.14.10.
- The request-ID middleware stored a `ContextVar` token on its shared middleware instance. Parallel page requests overwrote it and caused token-reset failures; the regression test now pins the concurrent behavior.
- Telegram's type-only annotation was evaluated at import time without postponed annotations and prevented Django URL/schema startup; deferred annotations fixed the import.
- Backend CI previously skipped the new `Feature/AccessStudio` integration PR target; its trigger now includes `Feature/**`.
- `frontend/.env.production` is tracked and contains only the public `VITE_API_BASE_URL`; the backend production env file is the secret-bearing, ignored file.
- The existing explicit ESLint allow-list records pre-existing cross-feature import sites for future extraction; these remain visible technical debt, not silently permitted patterns.

## Remaining before Phase 0 can be closed

1. Push this phase branch, open the PR into `Feature/AccessStudio`, and wait for both backend and frontend GitHub checks; review the Gitleaks history-scan result (the local history scan was inconclusive).
2. Complete the human-only branch-protection update for the new frontend check. Do not change the main branch protection from this session.
3. Do not add demo video content until the owner confirms its URL/licence.
