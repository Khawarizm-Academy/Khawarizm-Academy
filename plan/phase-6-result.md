# Phase 6 — N+1 Kill & Index Pass (result)

Branch: `Perf/QueryHealth` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/courses/views.py` | `course_detail_view` prefetches `Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lessons")), "live_sessions"` (module-level `DETAIL_PREFETCH`) — the landing record is a **constant 4 queries** (course + modules + lessons + live sessions) however many modules exist. |
| `backend/features/courses/views.py` (enroll) | The dead `enrolled_count` counter lives: `transaction.atomic()` wraps the `Enrollment` upsert + an `F("enrolled_count") + 1` increment **only when the row was created** (re-enroll = no-op); one commit per enroll (db-write-batching §1). `bump_version("catalog")` runs in `transaction.on_commit` — `queryset.update()` fires no signals, so this keeps the Phase-4 invariant "any course write invalidates the catalog family" (the detail payload carries `enrolledCount`). |
| `backend/features/adminconsole/views.py` + `serializers.py` | The users list annotates the page slice with `Count("sessions", filter=Q(sessions__is_active=True))`; `user_row` reads the annotation (single-user endpoints keep a `getattr` fallback to the per-row count — same 1 query as before). The annotation rides the **page slice only**, so `count()` stays join-free. |
| `backend/features/auth/models.py` | Indexes (naming `idx_<table>_<cols>`): `AuthEvent(kind, created_at)` — admin analytics ranges; `AuthEvent(user, -created_at)` — per-user trail; `UserSession(user, is_active)` — active-session counts. FK indexes are automatic. |
| `backend/features/videohosting/models.py` | `StreamToken(asset, expires_at)` — readiness lookups + the expiry sweep; the auto-named `token_hash` index is renamed to `idx_streamtoken_hash_expires` (same definition — `RenameIndex`, no rebuild of behavior). |
| Migrations | `accounts.0002_*` (3 auth indexes), `videohosting.0009_*` (rename + asset/expiry index). Applied to the dev DB. Tables are small (hundreds of rows) so plain `AddIndex` is right; the rule stands: past ~100k rows, build with `AddIndexConcurrently` on Postgres. |
| Tests (+9 → **422**) | `CourseQueryGuardTests`: detail stays 4 queries with a **second** module (the N+1 shape) and still returns both modules' lessons. `EnrollCounterTests`: first enroll increments the counter; re-enroll doesn't; the catalog cache bumps **after the commit** (`captureOnCommitCallbacks` + a miss at the new version). `DashboardQueryGuardTests`: summary 6 / enrolled 3 / saved 4. `AdminUsersQueryGuardTests`: list = 4 with 4 users each holding a session. `SessionQueryGuardTests`: `my_sessions` = 3. |

## Measured before/after (the gate)

Throwaway probe (same dataset shape, `CaptureQueriesContext`), then deleted:

| Endpoint (shape) | Before | After |
| :--- | ---: | ---: |
| `GET /api/courses/{slug}` — 11 modules × 1 lesson + live session | **13** queries | **4** |
| `GET /api/admin/users?page=1` — 6 users, 5 with sessions | **10** queries | **4** |

The formulas before: detail = 2 + N(lessons) + 1; users = auth + count + N(per-row session counts). After: constant, **pinned by `assertNumQueries` guards** so a future N+1 fails CI here first.

## The per-request `touch` observation (recorded, not changed)

Every authenticated request costs 2 queries before its payload: the session
SELECT (`select_related("user")`) and `UserSession.touch()` — an UPDATE of
`last_seen_at`. The guards pin this deliberately (it is the current contract).
If dashboard traffic ever makes that write hot, the fix is a write-behind/
throttled touch (skip when `< 60 s` since the last one) — a behavior change,
so it belongs to a later phase with the owner's sign-off, not this pass.

Also learned while writing the guards: `open_session` enforces "one active
session per user" (the newest wins, the previous is revoked) — the
`SessionQueryGuardTests` comment documents the ordering that follows from it.

## Live smoke / parity

- Dev DB migrated (both index migrations applied, SQLite instant at this size).
- Parity: **23/23** — prefetches, annotations, and indexes are payload-invisible.

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes.
- `test -v2 --parallel` → **422 tests OK**.
- gitleaks clean; pre-commit hooks pass on changed files.

## Notes for later phases

- Phase 7 moves `enroll` into `courses/services.py` — the atomic/F()/on_commit
  shape travels with it; keep the `EnrollCounterTests` pins.
- The admin `user_detail` view still loads a user's sessions + events without
  prefetch — it is a single-object page (bounded by `[:50]`), left as is.
