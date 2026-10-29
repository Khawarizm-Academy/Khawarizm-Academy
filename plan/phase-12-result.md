# Phase 12 — Final Verification & Release (result)

Branch: `Refactor/BackendSkills` → PR → `main`. Date: 2026-10-29.

The alignment is done. All gates green, parity proven against the real
pre-alignment code, the query-count table measured both sides, the offline
smoke walked the whole surface on a fresh clone, and the release is tagged.

## 1. Full gate sweep — all green

| Gate | Command | Result |
| :--- | :--- | :--- |
| Lint + format | `ruff check .` · `ruff format --check .` | clean (159 files) |
| System checks | `python manage.py check` | no issues |
| OpenAPI schema | `python manage.py spectacular --fail-on-warn` | exit 0 — 62 paths / 72 operations / 72 unique operationIds |
| Migrations agree | `python manage.py makemigrations --check --dry-run` | no changes |
| Migrations apply | `python manage.py migrate` | nothing to apply |
| Tests (serial) | `python manage.py test -v1` | **451 tests OK** (38.3 s) |
| Tests (parallel) | `python manage.py test --parallel` | **451 tests OK** (6.6 s) |
| Deploy-mode checks | `python manage.py check --deploy` (prod env) | **1 known accepted warning** (`security.W021` HSTS preload) — byte-identical to the CI step's output (checked against the Phase 11 CI run log) |
| Dependency audit | `pip-audit -r requirements.txt` | no known vulnerabilities |
| Secrets scan | gitleaks v8.28.0, whole history (190 commits, ~41 MB) | no leaks |

The `check --deploy` note: an earlier-phase note remembered "7 warnings"; the
current output (and CI's) is exactly one accepted `W021`. Verified against the
CI job log for PR #43 — local matches CI line for line, so the gate is green
everywhere it runs.

## 2. Parity sweep — aligned vs the true pre-alignment code

`main` still carried the pre-alignment commit, so the "before" side of the
sweep could be the **real baseline code**, not a reconstruction:

- Worktree of `main` (`9374b54`) at `/tmp/opencode/wt-baseline`, the committed
  dev `.env.development` copied in, the `.venv` symlinked, and a **copy of the
  same `db.sqlite3`** placed at its `BASE_DIR` — identical data on both sides.
- `runserver` from the worktree → `parity_capture.sh before`
  (23 GET snapshots to `/tmp/opencode/parity-final/before`).
- `runserver` from the aligned branch (same dev DB) →
  `parity_capture.sh after`.
- `backend/scripts/parity_diff.py before after` →
  **18/23 OK, 5 DIFFs — every one the documented Phase 8 shape change**:

| Snapshot | Diff | Content check |
| :--- | :--- | :--- |
| `dashboard-enrolled.json` | `[]` → `{"items": []}` | items identical |
| `course-problems.json` | array → `{"items": [...]}` | items identical |
| `course-related.json` | array → `{"items": [...]}` | items identical |
| `auth-sessions.json` | `{"sessions": [...]}` → `{"items": [...]}` | normalized rows identical (volatile keys + row id) |
| `videos-providers.json` | 401 `{"detail"}` → `{"detail", "code": "not_authenticated"}` | detail identical |

No other diff of any kind — Phases 9–11 (jobs, schema, docs) changed no
payload. Two operational notes from the run: the parity script is an alignment
artifact, so the worktree ran the branch's copy of it (`git rev-parse` still
resolved to the worktree); and `/healthz` 404s on the baseline (it was added
in Phase 2) — the capture script never curls it, so it is not a parity item.

## 3. Query-count table — before → after, measured

Measured with the same script on both sides (`django.test.Client` +
`CaptureQueriesContext`, same DB copy, same request sequence — script at
`/tmp/opencode/measure_queries.py`):

| Request | Before (pre-alignment) | After (aligned) |
| :--- | :--- | :--- |
| `GET /api/catalog` (cold) | 2 | 2 (miss → cached whole) |
| `GET /api/catalog` (warm) | 2 | **0** |
| `GET /api/catalog/:slug` (warm) | 1 | **0** |
| `GET /api/courses/:slug` | **6** — the N+1 formula `2 + N(lessons) + 1` at this DB's size (13 at Phase 6's 11-module fixture) | **4**, constant (prefetch) |
| `GET /api/dashboard` | 6 | 6 (already constant — now pinned) |
| `GET /api/dashboard/enrolled` | 3 | 3 (pinned) |
| `GET /api/dashboard/saved` | 4 | 4 (pinned) |
| `GET /api/auth/sessions` | 3 | 3 (pinned) |
| `GET /api/admin/users?page=1` | **10** — grows with users | **4**, constant |

Nine pinned counts over the guarded endpoints; the before-side measurements
reproduce Phase 6's recorded values exactly (admin users 10, the N+1 shapes),
which also validates the measurement method.

## 4. Offline smoke — fresh clone

```
git clone --branch Refactor/BackendSkills <repo> /tmp/opencode/final-clone
python3 -m venv .venv && pip install -r requirements.txt   # installs from requirements.txt alone
python manage.py migrate && python manage.py seed_demo
python manage.py runserver
```

Walked over HTTP:

1. **Health** — `/healthz` `{"status": "ok"}`, `/readyz` `{"status": "ok",
   "database": "up"}`.
2. **Origin gate** — `/api/catalog` without Origin → **403**; with
   `Origin: http://localhost:5173` → **200**.
3. **Cache miss → hit** — first catalog read logs one `cache miss` line; the
   immediate repeat logs none (hit, zero queries).
4. **Admin write → invalidation** — dev-token admin session
   (`dev:admin@khawarizm.dev:admin`) → `GET /api/admin/content/courses`
   (paged `{total, page, pageSize, results}`) → `PATCH …/courses/<uuid>`
   `{"tagline": …}` → 200; the next catalog read logs a **second** `cache
   miss` (the `on_commit` version bump forced a rebuild) and
   `/api/courses/course-1` returns the written tagline.
5. **Playback chain (mocked-provider offline fixture)** — asset + rendition +
   segment seeded via the shell exactly like the test helpers (fake provider
   coordinates; no network): learner dev-token → `POST
   /api/videos/smoke-lesson/token` → grant token → `master.m3u8` (ladder with
   token-embedded media URL) → `360p/index.m3u8` (AES-128 KEY URI) →
   `key/360p` returns the exact 16-byte key → `360p/0.ts` → **302** to the
   provider file URL.
6. **Contract surface** — `/api/schema` and `/api/schema/docs` 200 **without**
   an Origin (exempt), 72 `operationId`s in the YAML.

One smoke correction worth recording: `/api/stream/*` is **inside** the origin
gate (only the Drive callback, maintenance cleanup, schema, and health paths
are exempt) — curl must send the allowed Origin, exactly like the SPA's
player fetches; the first stream attempt without it 403s by design.

## 5. Release

- `Refactor/BackendSkills` → `main` via PR (merge commit), the same
  CI + Vercel-preview gate as every phase.
- Phase branches deleted after merge; the alignment base branch kept until
  the tag is cut, then removed.
- Tag: **`backend-skills-v1`** on the release commit.
- `REPORT.md` refreshed: a "Part 1 — Backend Skills Alignment (final audit)"
  section (phase table, gate sweep, parity, query counts, smoke, open items)
  prepended; the 2026-10-17 feature-completion report kept as Part 2.

## Rollback statement

Every migration in the alignment is additive (checked per phase and again by
`makemigrations --check`); there are no destructive schema steps. Reverting a
release = redeploying the previous commit; the schema tolerates both code
versions.

## Notes for later work

- The seven deferred items with their triggers live in `REPORT.md` § Open
  items and the plan's §5 — they are recorded triggers, not tasks.
- The OpenAPI content-response shapes are `object` + descriptions today;
  named components + generated frontend types remain the one deferred
  contract item (needs Serializer components for the `compact()` payloads and
  the frontend in the loop).
