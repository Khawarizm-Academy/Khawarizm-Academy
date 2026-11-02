# Access Upgrade — Phase 1: Access Control Foundation (result)

**Branch:** `Feature/AccessCore` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** canonical role/permission foundation; no new HTTP routes.

> This upgrade-specific closeout is separate from `plan/phase-1-result.md`, which records an earlier CI initiative.

## What landed

| Area | Result |
| :--- | :--- |
| Backend catalog | `features/access/registry.py` is the source of truth for 68 permission keys, Arabic labels/descriptions, groups, implication closure, ownership-kind mappings, and role templates. |
| Access data | Added `AccessRole`, `RoleAssignment`, and append-only `AuditEvent`; role slugs and the student/admin system-role invariants are enforced in model validation and database constraints. |
| Migrations | `0001_initial` creates schema only; `0002_seed_system_roles` idempotently creates student/admin, materializes instructor, and backfills admin/staff/instructor assignments. Regenerated `0001_initial` from current model state so `makemigrations --check` is clean. |
| Services and security | Added effective permission/role resolution, implication closure, object ownership checks, strict hierarchy/grant rules, role CRUD/assignment/revocation/reorder services, profile/legacy-role synchronization, and audit diffs with recursive secret redaction. |
| Auth compatibility | Auth user payloads add exactly `roles`, `permissions`, and `isAdministrator`; legacy keys, including `role` and `isAdmin`, remain intact. Firebase account creation, superuser creation, admin-console mutations, and demo seeding synchronize access assignments. |
| Admin compatibility | Existing `IsAdminRole` behavior and routes remain in place. Legacy admin role inputs are validated; missing known templates return `role_missing`, while unknown role values return `invalid_parameter`. PATCH is atomic and serializes the returned, synchronized user. |
| Frontend | Added typed `can`/`canAny`, the `useCan` hook, an exact committed permission-catalog mirror, permission-aware route metadata/guards, and permission checks for the three planned admin UI surfaces with legacy `isAdmin` fallback. |
| Documentation | Added the access feature README and updated the project profile and architecture map. |

## Security review resolutions

- Role mutations that can remove administrator access serialize on the locked system-admin role row; actor role/staff fields and permission snapshots are refreshed under the lock. Role permission edits synchronize affected members and apply the self-demotion/last-administrator guard. The simultaneous cross-demotion regression is enabled on databases that support `select_for_update`.
- Admin account PATCHes now run atomically. Role changes happen before locking/saving other target fields to preserve a consistent lock order; a failed role assignment rolls back all requested account edits, and the view returns the updated user row.
- Unknown legacy role values are rejected before account creation or update; `role_missing` is reserved for a valid legacy role whose corresponding access role was removed.
- Audit-detail keys are normalized recursively and sensitive password/token/secret/credential/authorization/cookie/private-key/API-key/JWT variants are removed. Role audit records keep metadata plus permission diffs, not full permission blobs.
- Migration state was regenerated to the model's exact constraint representation; no follow-up no-op migration remains.

## Verification

| Gate | Result |
| :--- | :--- |
| Full backend suite: `python manage.py test -v 1` | **494 tests passed; 1 skipped**. The concurrency test was skipped on local SQLite because it does not support `select_for_update`; it runs on a database with row-lock support. |
| `ruff check .` / `ruff format --check .` | Pass. |
| `python manage.py check` | Pass; no issues. |
| `python manage.py makemigrations --check --dry-run` | Pass; no changes detected. |
| `python manage.py spectacular --fail-on-warn` | Pass with zero warnings; **62 paths / 72 operations**, unchanged from Phase 0. |
| `python manage.py seed_demo` twice | Pass; both runs reported seeded reference/demo content without error. |
| Frontend `npm test` / lint / build | Pass per the frontend implementation run: **88 tests in 10 files**, lint clean, production build successful. Vite reports the pre-existing large-chunk advisory only. |
| API parity | Compared **25** Phase 0/Phase 1 snapshots. Non-profile snapshots match after ignoring freshly generated session IDs/timestamps. `auth-me` and `/profile` add only `roles`, `permissions`, `isAdministrator`; all stable legacy key/value pairs matched (IDs and timestamps are naturally per-run). |

Parity artifacts are under `/tmp/accessstudio/parity/{before,after}` in the execution environment and are not committed. The capture used the repository's `Origin` header. Existing admin endpoint status behavior was exercised by the full backend suite; no new route was added.

## Integration closeout

- Local feature commit: `4022aea` on `Feature/AccessCore`.
- PR [#47](https://github.com/Khawarizm-Academy/Khawarizm-Academy/pull/47) merged into `Feature/AccessStudio` on 2026-11-02 as squash commit `f24e6b29a3c44d42f6efcb6641a4a05bb87cd3f6`.
- All **7 PR checks passed**: backend CI (both runs), frontend CI (both runs), backend and frontend Vercel deployments, and Vercel Preview Comments.
- Repository branch-protection settings were not changed. The previously recorded owner action to require the frontend status check on `main` remains separate from this feature branch's integration.

## Phase 2 handoff

The role manager can add its catalog/role API and UI in Phase 2. The Phase 1 contract is `features/access/services.py`; keep views thin, preserve hierarchy/last-admin guards, and retain the catalog drift test.
