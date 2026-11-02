# Access Upgrade — Phase 2: Role Manager and Granular Admin (result)

**Branch:** `Feature/RoleManager` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** role catalog and manager API/UI, method- and content-scoped admin authorization, account role safeguards, access-audit retention.

## What landed

| Area | Result |
| :--- | :--- |
| Role API | Added authenticated catalog, role list/detail/create/update/delete, template creation, reorder, paged members, per-account bulk assignment outcomes, user role replacement, and paged/filterable access-audit routes under `/api/admin/roles/*`, `/api/admin/users/:id/roles`, and `/api/admin/audit`. Views delegate validation, hierarchy, grant ceilings, concurrency, and audit writes to `features/access/services.py`. |
| Granular admin authorization | Replaced blanket admin gates for overview, users, sessions, analytics, auth activity, cleanup, and content endpoints with exact method-specific or content-type permissions. The existing `is_staff`/superuser administrator bridge remains for compatibility. User details only expose sessions/activity when the caller has the respective permission. |
| Safe account changes | `users.create` creates a student by default; any instructor/admin role choice is assigned through `users.assign_roles` and the canonical hierarchy/grant checks. Legacy `POST|PATCH /api/admin/users/:id/role` remains supported, and user-role replacement is available separately. |
| Content editor | Content types declare read/write/delete permission keys; schema responses include only types readable by the caller. Added the `user_ref` account lookup/coercer and strict rejection of undeclared content fields. |
| Audit lifecycle | Added configurable `AUDIT_RETENTION_DAYS` with a 365-day default to chunked cleanup, command help, and maintenance tests. Access changes remain separate from the auth activity stream at `/api/admin/events`. |
| Frontend | Added permission-filtered JSON admin sections, Roles and Audit views, role create/edit/template/assignment/reorder flows, multi-role chips in account surfaces, searchable async user references, conflict/empty/error states, RTL styling, and keyboard reorder with a live announcement. |
| Browser-discovered fix | The initial-loading guard replaced the role list with a skeleton during background cache invalidation after reorder, removing its live region. It now keeps existing role data mounted during refresh; keyboard reorder and announcement were reverified in Chromium. |
| Documentation/evidence | Updated the project profile, access/admin feature READMEs, feature directory, overview, backend contract/architecture, and frontend admin README. Added full-page role-manager screenshots at the required viewports under `plan/evidence/phase-2/`. |

## Verification

| Gate | Result |
| :--- | :--- |
| Backend full suite: `python manage.py test --parallel` | **512 tests passed; 1 skipped**. The row-lock concurrency test is skipped on local SQLite, which does not support `select_for_update`. |
| Additional member-page budget test | **1 test passed** after the full-suite run; compares one-member and full-page query counts and confirms they remain constant. Role-list member counts are separately pinned to one SQL query independent of the number of roles. |
| `ruff format --check .` / `ruff check .` | Pass. |
| `python manage.py check` | Pass; no issues. |
| `python manage.py makemigrations --check --dry-run` | Pass; no changes detected. |
| `python manage.py spectacular --file /tmp/access-phase2-openapi.yaml --fail-on-warn` | Pass; zero schema warnings. |
| Frontend `npm test` | **100 tests passed in 13 files.** |
| Frontend `npm run lint` / `npm run build` | Pass. Vite reports its non-blocking large-chunk advisory for the existing course-player bundle. |
| Chromium walkthrough | Seeded admin login, roles view, API-backed keyboard reorder, and RTL layout passed. At 375/768/1280 px, body/root widths matched the viewport (no horizontal overflow); at 1280 px the list was on the right and editor on the left; at 375 px the list appeared before the editor. Reorder returned 200, announced `نُقل الدور إلى المرتبة 3`, and produced no browser errors or failed API responses. |

### Screenshot evidence

- [Role Manager — 375 px](/home/ubuntu/khawarizm-academy/plan/evidence/phase-2/role-manager-375.png)
- [Role Manager — 768 px](/home/ubuntu/khawarizm-academy/plan/evidence/phase-2/role-manager-768.png)
- [Role Manager — 1280 px](/home/ubuntu/khawarizm-academy/plan/evidence/phase-2/role-manager-1280.png)

A full screen-reader, forced-colors, and 200%-zoom manual audit was not performed in this pass.

## Integration closeout

- Feature commit: `557ece6` on `Feature/RoleManager`.
- PR [#48](https://github.com/Khawarizm-Academy/Khawarizm-Academy/pull/48) was squash-merged into `Feature/AccessStudio` on 2026-11-02 as `fd059c1c97f09285e5fd0f1c401dc642e123299b`.
- At merge time, GitHub showed zero failing checks, one successful check, and six pending checks. Per the owner's instruction to avoid unnecessary waits, integration proceeded after the complete local backend/frontend gates and browser walkthrough passed; this note does not claim the pending remote checks completed.
- The local `Feature/AccessStudio` branch is fast-forwarded to the merge commit. The public `main` branch and its protection settings were not changed.
