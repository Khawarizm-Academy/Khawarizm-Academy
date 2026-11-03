# Phase 13 — Hardening: security, performance, accessibility, observability, data lifecycle (result)

Branch: `Chore/Hardening` → PR into `Feature/AdminUpgrade`. Date: 2026-11-03.
Plan reference: `plan/PLAN.md §PHASE 13`.

**Goal restated:** prove — with tests and measurements, not assertions — that the
surface built in Phases 0–12 is safe, fast, accessible and operable. Everything
below either fails CI when a rule is broken, or is a recorded number with a
budget attached.

---

## 1. What shipped

### 1.1 Security (§13.1)

| # | Deliverable | Where | What it proves |
| :--- | :--- | :--- | :--- |
| 13.1.1 | **Route-permission manifest.** All 170 `/api/` URL names classified into `PUBLIC` (34) / `AUTHENTICATED` (98) / `PERMISSIONED` (34 routes over 16 distinct catalog keys) / `METHOD_SCOPED` (4). | `backend/config/route_access.py` (generated), `backend/scripts/gen_route_access.py` (regenerator) | `RouteAccessManifestTests` walks `get_resolver()` and fails on an unclassified route, a stale entry, an unknown permission key, or overlapping buckets. **A new endpoint with no declared caller cannot merge.** The generator round-trips: its output is byte-identical to the checked-in file and passes `ruff format --check`. |
| 13.1.2 | **Denial matrix**, generated from the manifest — every guarded route called as anonymous / student / administrator. | `backend/config/test_denial_matrix.py` (4 tests, 38 routes × 3 callers + a coverage assertion) | Anonymous → 401, student → 403, administrator → anything but 401/403. Table-driven: adding a route to the manifest adds it to the matrix automatically. |
| 13.1.4 | **Frontend security headers**: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a full `Content-Security-Policy-Report-Only` (hosts enumerated by reading `firebaseClient.ts`, the YouTube/Vimeo embed paths and the API origin). Existing `Cross-Origin-Opener-Policy` kept. | `frontend/vercel.json` | Report-only as the plan requires; §13.6 criterion 4 is "ship and observe", not "enforce". |
| 13.1.5 | **Token-in-URL hygiene (G20).** `VIDEO_RAW_GRANT_TTL_MINUTES` (default 120) applied to raw grants only — shorter than HLS; a sentinel-token test asserts the query string never reaches a log line and that the recorded `path` is stripped. | `backend/config/settings.py`, `features/videohosting/views.py::_issue_grant`, `config/tests.py::test_a_query_string_sentinel_never_reaches_the_log` | The test mints a request whose `?token=` value is a sentinel and asserts the sentinel appears in no captured `config.request` record. |
| 13.1.6 | **Upload-abuse caps.** `VIDEO_MAX_OPEN_UPLOADS` (default 3) blocks a fourth pending session with an Arabic `too_many_open_uploads` error, and `VIDEO_SPOOL_MAX_BYTES` blocks a new session when the configured spool is already over quota (`spool_full`) — the Drive path, which never uses a spool, is unaffected. | `features/videohosting/studio_uploads.py`, `features/videohosting/services.py::spool_bytes_used`, `features/videohosting/tests/test_phase13_hardening.py` (6 tests) | Chunk size/rate limits and `Content-Range` consistency already existed from Phase 4; this closes the parallel-session and disk-quota halves. |
| 13.1.8 | **Dependency & secret hygiene.** `npm audit --omit=dev --audit-level=high` wired into CI behind a **dated waiver list**; serializer secret-leak test extended. | `frontend/scripts/audit-gate.mjs`, `frontend/scripts/npm-audit.allowlist.json`, `.github/workflows/frontend.yml` | `npm audit fix` cleared the fixable advisories (`dompurify` 3.2.6 → 3.4.17, `re2js` → 2.9.1, no `package.json` range change). The remaining high chain is `@grpc/grpc-js` ← `@firebase/firestore`: the app imports `firebase/app` + `firebase/auth` only, so it is waived with a written reason until 2027-01-31. The gate fails on an unlisted advisory **and** on an expired waiver (both paths verified locally). |

### 1.2 Performance budgets (§13.2)

| Deliverable | Where | Result |
| :--- | :--- | :--- |
| **p95 latency tripwire** on the plan's six routes, run in-process against the real dev SQLite + seed. | `backend/scripts/p95_latency.py` | All six inside budget (numbers in §3). Each sample runs inside a transaction that is rolled back, so the dev database is byte-for-byte unchanged after a run (verified: quiz/attempt/asset counts identical). Sessions the harness opens are revoked and any session it displaced is restored, so a developer's own login survives a benchmark run. The write sample is capped below `QUIZ_ATTEMPT_RATE` (30/min) so the harness times the service layer, not the throttle. |
| **Query-pin index** — every `assertNumQueries` in one generated table. | `backend/scripts/query_pins.py` → `plan/query-pins.md` | 16 pins, each with the test name and the recorded "why" comment. |
| **Chunk budget** — shell ±3 KB gzip vs a committed baseline, route chunks < 90 KB gzip, player engines never in the initial graph. | `frontend/scripts/bundle-budget.mjs`, `scripts/bundle-budget.baseline.json`, `plan/bundle-report.md` | Shell 89.4 KB gzip over 4 chunks (baseline pinned this phase — no Phase 0 number exists in the repo). Largest route chunk: `AdminPage` 48.7 KB. `hls` (173.2 KB) is lazy and the test asserting it stays out of `index.html`'s import graph is part of the gate. Wired into `frontend.yml` after `npm run build`. |

**No new dependency** was needed for either budget: gzip sizes come from `node:zlib`,
latency from `time.perf_counter` inside Django, the pin index from a regex.

### 1.3 Accessibility & i18n (§13.3)

| Deliverable | Where | Result |
| :--- | :--- | :--- |
| **Arabic-literal grep gate** — user-facing copy must live in a `data/*.json` dictionary (R14). | `frontend/scripts/i18n-gate.sh`, `scripts/i18n-gate.allowlist`, `frontend.yml` | `rg -P` with `\p{Arabic}` over the six feature folders introduced from Phase 7 onward, excluding tests/declarations. Forward-only: the 61 files that pre-date the rule are allowlisted (each path is a migration ticket); **any new file with an inline Arabic literal fails CI**. Verified both directions — clean run exits 0, a probe file with `"مرحبا"` exits 1. |

### 1.4 Observability & operability (§13.4)

| Deliverable | Where | Notes |
| :--- | :--- | :--- |
| **Structured event lines.** `log_event(logger, msg, **fields)` writes a flat `event` object that the JSON formatter emits verbatim. | `features/common/observability.py`, `config/logging.py` (`event` added to the formatter whitelist) | Non-scalars are stringified rather than dropped, so a bad field can never swallow the line. Call sites: `video grant minted` (asset, mode, via, provider — **never** the token), `upload session opened/completed/cancelled` (session pk, asset, status, progress, bytes — never the session key, which authenticates chunk PUTs), `raw proxy busy` + `raw proxy upstream failure` (503s), `attempt graded` (duration, question count), `cleanup run finished` (trigger, deleted total, duration), `access change` (every audit row: role create/update/delete, membership, revocation). |
| **Permission denials counted, not spammed.** One WARNING line per view per 60 s carrying the running count, keyed by URL name — the same key the manifest uses. | `features/common/observability.py::count_permission_denial`, called from `api_exception_handler` | `ObservabilityTests` asserts five 403s produce five counts and exactly one line. |
| **Request id end-to-end.** `requestId` stamped into every error envelope, matched to `X-Request-ID`; `ApiError` carries it; the route error panel shows it and retries without a document reload. | `features/common/errors.py`, `frontend/src/shared/lib/apiClient.ts`, `frontend/src/app/RouteErrorBoundary.tsx` | New: `ApiError.fromResponse()` (body → header fallback), `assertErrorEnvelope` in the test kit, `RouteErrorBoundary.test.tsx` (2 tests). The boundary is already remounted per route by `RootLayout`'s `key={pathname}`, so "per Studio route" holds without a second wrapper. |
| **`/readyz` depth.** Database + default `student`/`admin` role rows + spool directory (when Telegram ingest is configured). | `backend/config/views.py` | A missing default role is a boot-blocking misconfiguration, exactly as the plan states; each failure names itself in the 503 body. |
| **Runbook.** | `docs/13-operations-runbook.md`, indexed in `docs/README.md` | Three decision trees ("a video won't play", "an upload is stuck", "a user lost access") plus the job schedule and a security-events table. Every endpoint, command name and payload field in it was verified against the code (three initial inaccuracies corrected: upload-status fields, `ingest_video` arguments, the cancel path). |

### 1.5 Data lifecycle (§13.5)

| Family | Rule | Evidence |
| :--- | :--- | :--- |
| Stale `UploadSession`s | `pending` sessions older than `VIDEO_UPLOAD_STALE_HOURS` (default 24) plus their spool parts | `features/common/maintenance.py::expired_families` |
| Hidden content | reviews and discussion threads hidden for more than `HIDDEN_CONTENT_RETENTION_DAYS` (30) purge as `hiddenReviews` / `hiddenThreads` | same; optional imports so the families simply vanish if the feature is absent |
| Existing families | stream tokens, Drive states, auth events, audit retention, overdue attempts | unchanged, counts still reported per family |

All families keep the Phase-4 overlap guard and chunked deletes; every run writes
its per-family counts to `MaintenanceRun` and logs one `cleanup run finished` line.

---

## 2. What is intentionally deferred (with the exact follow-up surface)

| # | Item | Why not this phase | What a follow-up starts from |
| :--- | :--- | :--- | :--- |
| 13.1.3 | **IDOR sweep** | Object-level ownership is already asserted per feature (`has_object_perm`, owner/staff scopes) and a cross-instructor matrix needs fixture factories for instructor A/B pairs on 9 resources — a larger surface than the rest of the phase. | Write it as a second table over the same manifest: `_dummy_kwargs` in `config/test_denial_matrix.py` already builds URLs for every id-taking route; replace the placeholder ids with A's and B's objects. |
| 13.1.7 | **Shared sanitization corpus** | The client already sanitizes through DOMPurify (Phase 8) and the server validates length/shape; one JSON file consumed by both suites touches tests in three features. | `frontend/src/shared/lib/markdown/` (client) + `features/common/serializers.py` validators (server) are the two consumers. |
| 13.1.9 | **Self-service privacy endpoints** (`GET /api/profile/export`, `DELETE /api/profile`) | Product-visible data-deletion semantics (anonymize vs delete for reviews/threads, the last-administrator block) need an owner decision; the plan flags it as its own deliverable. | `features/profile/` + `record_audit` (already logs and stores the action) + the session revocation service used by `auth-revoke-session`. |
| 13.2 | **Playwright LCP/INP/CLS capture** | Playwright is not installed in this repo and D17 forbids adding a heavy dev dependency without justification; installing browsers is a host-level action. | `frontend/scripts/bundle-budget.mjs` already provides the chunk half of the budget; the vitals half needs `@axe-core/playwright` + a browser download (human action, `PLAN.md` Appendix D). |
| 13.3 | **axe sweep + keyboard transcript + RTL screenshots** | Same blocker as above, and the manual passes are human verification. | The five riskiest components are named in the plan; `plan/evidence/` already holds the Phase 2/5 screenshot convention to extend. |
| 13.3 | **Migrating the 61 allowlisted Arabic literals** | Pure feature work, one folder at a time; blocking CI on it would have frozen every other phase. | Delete a path from `frontend/scripts/i18n-gate.allowlist` after moving its strings into `data/*Copy.json` — the gate tells you when you are wrong. |

---

## 3. Recorded numbers

### 3.1 p95 server time (50 samples/route, dev SQLite + seed, cold sample discarded)

| Route | Budget | p50 | p95 | Result |
| :--- | ---: | ---: | ---: | :--- |
| catalog (20 items) | 50 ms | 0.6 ms | 0.6 ms | ok — cached path |
| course detail | 50 ms | 3.2 ms | 3.7 ms | ok |
| roster (`/api/dashboard/enrolled`) | 150 ms | 2.1 ms | 2.3 ms | ok |
| studio course list | 150 ms | 3.5 ms | 3.9 ms | ok |
| playback grant (mint + plan) | 150 ms | 5.3 ms | 5.7 ms | ok |
| quiz start (write) | 250 ms | 8.9 ms | 9.2 ms | ok |

Reproduce: `cd backend && python -m scripts.p95_latency --samples 50`.
Nothing exceeded a budget, so no written justification is required (§13.6.2).

### 3.2 Bundle (production build)

| Metric | Value | Budget | Result |
| :--- | ---: | :--- | :--- |
| Shell (initial graph, 4 chunks) | 89.4 KB gzip | baseline + 3 KB | ok — baseline pinned this phase (`scripts/bundle-budget.baseline.json`) |
| Largest Studio route chunk (`StudioCourseEditorPage`) | 18.9 KB gzip | < 90 KB | ok |
| Largest admin chunk (`AdminPage`) | 48.7 KB gzip | < 90 KB | ok |
| `hls` engine chunk | 173.2 KB gzip | lazy only | ok — absent from the entry import graph |
| Chunks in `dist/assets` | 114 | — | full table in `plan/bundle-report.md` |

### 3.3 Surface counts

Route manifest 170 names · denial-matrix rows 38 · catalog keys referenced 16 ·
query pins 16 · i18n allowlist entries 61 · Phase 13 hardening tests 6 ·
backend suite 723 tests · OpenAPI operations 210 over 168 paths.

---

## 4. Gates (§0.4 / §13.6.5)

| Gate | Command | Result |
| :--- | :--- | :--- |
| Backend lint | `ruff check .` | all checks passed |
| Backend format | `ruff format --check .` | 276 files already formatted |
| Django checks | `python manage.py check` | no issues |
| Migrations | `python manage.py makemigrations --check --dry-run` | no changes detected |
| OpenAPI | `python manage.py spectacular --validate --fail-on-warn` | zero warnings, 210 operationIds |
| Backend tests | `python manage.py test` | **723 OK**, 1 skipped (row-lock test; SQLite has no `select_for_update`) — +21 over Phase 12 |
| Frontend lint | `npm run lint` | 0 problems |
| Frontend typecheck | `npx tsc -b` | clean |
| Phase 12 grep gate | `bash scripts/grep-gate.sh` | no runtime `user.isAdmin` reads |
| Phase 13 i18n gate | `bash scripts/i18n-gate.sh` | clean; probe file confirmed it fails on a new literal |
| Dependency audit | `node scripts/audit-gate.mjs` | clean at high-and-above, 4 dated waivers |
| Frontend tests | `npm test` | **200 passed** (26 files) — +4 over Phase 12 |
| Build | `npm run build` | ok |
| Chunk budget | `node scripts/bundle-budget.mjs` | ok |

Three pre-existing 404-body tests (`catalog`, `courses`, `scholarships`) asserted
an exact envelope without `requestId`; they now go through
`ApiTestCase.assertErrorEnvelope`, which pins `detail` + `code` and asserts no
other key leaks in. That is the contract test the Phase 13 envelope needs, in one
place instead of three.

---

## 5. New environment variables

Two keys the plan's Appendix B did not list (defaults in code, placeholders added
to `backend/.env.development`):

| Variable | Default | Purpose |
| :--- | ---: | :--- |
| `VIDEO_UPLOAD_STALE_HOURS` | `24` | §13.5 — `cleanup_expired` prunes pending sessions older than this (replaces the Phase-4 hard-coded 7 days). |
| `VIDEO_SPOOL_MAX_BYTES` | `21474836480` | §13.1.6 — spool-directory quota; `studio_upload_init` refuses a new session once `spool_bytes_used()` passes it, and only when `VIDEO_SPOOL_DIR` is configured. |

`VIDEO_RAW_GRANT_TTL_MINUTES` and `VIDEO_MAX_OPEN_UPLOADS` were already in
Appendix B and are implemented as specified.

---

## 6. Acceptance criteria (§13.6)

| # | Criterion | Status |
| :--- | :--- | :--- |
| 1 | An unclassified API route fails CI; the denial matrix is green | **met** — `RouteAccessManifestTests` (4) + `DenialMatrixTests` (4). IDOR sweep deferred with the exact follow-up surface (§2). |
| 2 | Budgets recorded; none exceeded without justification | **met** — §3, with the tooling committed so the next phase re-measures instead of re-arguing. |
| 3 | axe: zero serious/critical; keyboard transcript attached | **not met — needs Playwright**, which is a host-level install (Appendix D) and a D17 dependency decision. Recorded in §2. |
| 4 | CSP ships report-only; no console CSP noise on the golden path | **shipped report-only.** The observed-violation list requires a real browser session against the deployed headers — recorded as a human verification step. |
| 5 | All gates green | **met** — §4. |

Criterion 3 and the verification half of 4 are the only items in this phase that
need a person or a host change; everything else is enforced by CI today.
