# Phase 0 — Baseline Evidence (recorded 2026-10-28)

Branch: `Refactor/BackendSkills` (base). All commands run with `cd backend && source .venv/bin/activate`.

## 1. Baseline gates (all green)

| Gate | Command | Result |
| :--- | :--- | :--- |
| Check | `python manage.py check` | `System check identified no issues (0 silenced)` |
| Migrations agree | `python manage.py makemigrations --check --dry-run` | `No changes detected` |
| Migrate | `python manage.py migrate` | `No migrations to apply` (schema current) |
| Tests | `python manage.py test -v1` | **370 tests, OK (35.7 s)** |

> The master plan estimated "~400 tests"; the real count is **370**. The plan's estimate was derived from `grep -c "def test_"` which over-counts; the real suite number is recorded here and is the baseline for all later phases.

## 2. Repo facts verified while baseline-running

- Seed data present in `db.sqlite3`: 3 courses (`course-1..3`), 2 scholarships (`scholarship-1..2`), 5 users (admins + instructor).
- `.env.production` exists on disk, git-ignored (verified with real values, untouched). `.env.development` was absent → created with dev defaults + commented placeholders (gitignore already un-ignores it).
- Dev server boots and serves `/api/*` (run via `runserver 127.0.0.1:8000`).

## 3. Parity capture (before)

Script: `/tmp/opencode/parity/capture.sh before` — with `Origin: http://localhost:5173`, serializer JSON to `/tmp/opencode/parity/before/*.json`:

- Catalog: default, filtered (`type=course&q=course&sort=popular&page=1`), scholarships (`type=scholarship&field=cs&cost=free`), detail ×2 (course-1, scholarship-1)
- Home, events, competitions, auth config
- Courses: detail, problems ×2 (`/courses/:slug/problems`, `/problems/:slug`), related ×2, scholarship detail
- Dashboard ×4 + auth me/sessions + profile (dev-token learner, pre-cleaned before each capture)
- Videos meta + providers

Diff tool: `/tmp/opencode/parity/diff.py <before> <after>` — normalizes volatile keys (`createdAt`, `updatedAt`, `revokedAt`, `lastSeenAt`, `expiresAt`, …) because rows are recreated between captures; everything else must match exactly.

## 4. Conventions for all phases

See `plan/CONVENTIONS.md` (created in this phase).

## 5. Phase-0 artifacts

- `PROJECT_PROFILE.md` — new, repo root (drafts marked `(?)` where unverified).
- `backend/.env.development` — new, committed (defaults + commented placeholders only, no secrets).
- `plan/` — master plan + session knowledge + this file + `CONVENTIONS.md`.
