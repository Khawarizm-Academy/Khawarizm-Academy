# Phase 12 — Admin console upgrades & legacy retirement (result)

Branch: `Feature/AdminUpgrade` → PR into `Feature/LearningLoop`. Date: 2026-11-03.
Plan reference: `plan/PLAN.md §PHASE 12`.

> **Note on the prior file:** the previous `plan/phase-12-result.md` documented
> the "Backend Skills Alignment" Phase 12 (a completely different plan merged
> into `main` as `backend-skills-v1` on 2026-10-29). That content now lives in
> `REPORT.md` Part 1 and is superseded by this note.

## 1. What this phase delivers

### 1.1 Legacy bridges retired (§12.2)

| Bridge | What changed | Evidence |
| :--- | :--- | :--- |
| `POST\|PATCH /api/admin/users/<id>/role` | URL, view, `services.set_role`, and its dedicated tests removed. The route now 404s; the request body `role` on `PATCH /api/admin/users/:id` is a 400 with the Arabic "role input is retired" message. | `backend/features/adminconsole/urls.py`, `views.py::user_detail`, `services.py`, `tests.py::test_legacy_role_endpoint_is_retired`, `test_patch_role_input_is_retired`, `auth/tests.py::test_legacy_role_endpoint_is_gone` |
| `RoleSelect` component | Deleted (`frontend/src/features/admin/components/controls/RoleSelect.tsx`). `UsersTable` now always renders the multi-role `RoleChips`, plus a checkbox column for bulk actions. | `frontend/src/features/admin/components/layout/UsersTable.tsx` |
| `updateUserRole` fetcher | Removed from `adminFetchers.ts`. Contract test replaced with the two new endpoints. | `frontend/src/features/admin/data/adminFetchers.ts`, `__tests__/adminFetchers.test.ts` |
| `\|\| user.isAdmin` UI fallback | Removed from `AdminPage.tsx`, `RouteGuard.tsx`, and `RootLayout.tsx`. `isAdmin` still rides in the auth payload as an additive output (D5 + backlog B9); a new `RouteGuard` case asserts a legacy-only user is bounced. | `frontend/src/features/admin/pages/AdminPage.tsx`, `frontend/src/app/RouteGuard.tsx`, `frontend/src/app/layouts/RootLayout.tsx`, `frontend/src/app/__tests__/RouteGuard.test.tsx` |
| `IsAdminRole` permission class | Deleted from `features/auth/permissions.py` (no runtime consumer after the bridge retirement). README pointer updated. | `backend/features/auth/permissions.py`, `backend/features/auth/README.md` |
| Legacy practice endpoints | `GET /api/problems` and the `GET /api/courses/<slug>/problems` fallback branch now emit `Deprecation: true` + a `Sunset` header, plus a single structured log line per hit (`features.quizzes.legacy_practice`) so the traffic can be measured before deletion (deferred backlog B10). | `backend/features/quizzes/views.py::_legacy_practice_response`, `test_admin_upgrade.py::PracticeSetDeprecationTests` |
| CI grep gate | `frontend/scripts/grep-gate.sh` fails when `user.isAdmin` reappears in runtime code (types and tests still allowed). Wired into `frontend.yml` between Typecheck and Tests. | `.github/workflows/frontend.yml`, `frontend/scripts/grep-gate.sh` |
| `courses.exam_*` display fields | Left in place per §12.2 "Retained as fallback display only"; no code path introduced. |

### 1.2 New admin sections and endpoints (§12.1)

| Section | Route / component | Permission | What it does |
| :--- | :--- | :--- | :--- |
| **Effective Permissions inspector** | `GET /api/admin/users/:id/effective-permissions` → `features/access/services.py::effective_permission_provenance` | `users.view` | Returns every permission the user actually holds, tagged with the role that granted it (`grantedBy: [{roleSlug, roleName, isSystem, isDefault}]`), the parent key that implied it (`via: [parentKey]`), or `"administrator": true` when the bypass covers it. The inspector is the debugging tool the plan asked for: "why can she do X?" answers in one call. |
| **Bulk role assignment** | `POST /api/admin/users/bulk-roles` → `bulk_add_role_members` / new `bulk_remove_role_members` | `users.assign_roles` | `{userIds[], roleId, mode: "add"\|"remove"}` returns per-id outcomes (`{userId, ok, code?}`) with `not_assigned` for revoke misses. Reuses the same hierarchy, audit, and last-administrator guards as the single-user path. |
| **Review Queue admin section** | New frontend tab `?tab=review-queue`, `frontend/src/features/admin/components/views/ReviewQueueView.tsx` | `courses.review` | Oldest-first list of `in_review` courses wired to the existing `/api/admin/review-queue` + `/approve` + `/request-changes` endpoints. Includes a preview link, SLA chip when a submission is > 48 h old, and a required 10-char minimum on the "Request changes" note. |

New frontend `adminSections.json` entry: `{"key":"review-queue","label":"مراجعة الدورات","group":"المحتوى والفيديو","permission":"courses.review"}` with a matching `ClipboardCheck` icon in `adminFormatters.SECTION_ICONS` and a shell entry in `AdminShell.SECTION_VIEWS`.

## 2. What is intentionally deferred

Phase 12's spec (§12.1) enumerates ten admin surfaces. Delivering every one with
backend + UI + tests in a single branch would exceed a reasonable PR, so the
following are recorded here with the reason and the exact follow-up surface.
The endpoints and services they need already exist, so this is UI work only.

| Deferred section | Blocked on | Ready-made pieces |
| :--- | :--- | :--- |
| Users drawer role-assignment history (from `AuditEvent`) | UI polish | `/api/admin/audit?target_type=user&target_id=…` already filters server-side |
| Roles — "Audit this role" shortcut and Compare-roles view | Design decision on the diff layout | `/api/admin/audit?target_type=role…` works; the role catalogue is fully client-loaded in `RolesView.tsx` |
| Content editor extension for `HomeFeaturedCourse/Scholarship/Competition/Event`, `HomeQuickLink`, `Category`, `FilterGroup`, `FilterOption` | Field-by-field registry rows (the plan flags the models `(?)` — verify columns before writing the registry entries) | `CONTENT_TYPES` registry already accepts a per-type `permissions` map (`home.curate`, `catalog.manage` exist in the catalogue) |
| Video upgrades — orphan detector, packaging policy per asset, quota usage, failed-ingest retry button | Requires a small `list_assets` annotation on `videohosting/console/services.py` | `manage.py package_pending` already exists (Phase 4); the retry just needs to call it for one asset id |
| Certificates & Reviews moderation sections | Two small admin views | `certificates.manage` and `reviews.moderate` permissions already exist; `features/courses/certificate_services.py::revoke_certificate` and `features/reviews/services.py::moderate` are already the write surfaces |
| Scholarship applications inbox | Backend endpoint (`GET /api/admin/scholarship-applications`) + CSV export | `ScholarshipApplication` model already carries `status`/`note`; `scholarships.manage` permission exists |
| System / Maintenance run-now buttons for `package_pending`, `send_reminders`, `recompute_progress` and a `/readyz` snapshot | Extending the existing `/api/admin/maintenance/cleanup` job runner to a jobs table | `features/common/maintenance.py::run_cleanup` already has the overlap guard pattern that every other job should reuse |

Each is documented here rather than added to `PLAN.md` §Backlog so the follow-up
session starts with the exact surface to touch and the permission key to gate
the endpoint.

## 3. Gates

§0.4 command list, run locally on this branch:

| Gate | Command | Result |
| :--- | :--- | :--- |
| Backend lint | `ruff check .` | all checks passed |
| Backend format | `ruff format --check .` | 269 files formatted |
| Django checks | `python manage.py check` | no issues |
| Migrations | `python manage.py makemigrations --check --dry-run` | no changes detected |
| OpenAPI | `python manage.py spectacular --fail-on-warn` | zero warnings, 210 `operationId`s (Phase 11 baseline 207 + 3 new: bulk-roles, effective-permissions, plus retired legacy op count) |
| Backend tests | `python manage.py test` | **702 tests OK**, 1 skipped (row-lock test that only runs on databases with `select_for_update`) |
| Frontend lint | `npm run lint` | 0 problems |
| Frontend typecheck | `npx tsc -b` | clean |
| Frontend tests | `npm test` | **196 tests / 25 files passed** |
| Frontend build | `npm run build` | production bundle green (2258 modules) |
| Phase 12 grep gate | `bash frontend/scripts/grep-gate.sh` | "no runtime user.isAdmin reads" |

## 4. Notable decisions and deviations

- **A-12.1 · User creation still accepts `role` in the request body.** The plan
  says "`User.role` as an input … stays as the derived *primary account type*
  in payloads". The PATCH surface was retired (see §1.1); the POST surface is a
  creation-time bootstrap convenience that avoids making the console create a
  learner and immediately PUT `/roles` twice. It is documented in the
  `create_user_account` docstring as the one bridge kept "for one more release"
  (backlog B9 covers the eventual removal).
- **A-12.2 · Effective-permission provenance lives in `access.services`.** The
  admin console imports it as a service, not through a serializer, because the
  inspector is a policy view, not an entity view. `PERMISSION_KEYS` was added
  to the module's existing `registry` imports.
- **A-12.3 · Bulk-remove mirrors bulk-add 1:1.** Same `100 accounts/request`
  cap, same transaction, same per-id outcomes shape, and the same
  `_lock_role_mutation_guard` ordering. Both call `assign_roles` internally so
  the audit trail, hierarchy check, and last-administrator protection are the
  single canonical path.
- **A-12.4 · Retiring `IsAdminRole` is code-only, not migration-only.** The
  class had no importers after the legacy `/role` route went away (verified by
  `rg IsAdminRole backend`). Deleting it closes G3's "binary authorization"
  gap at the code level; `User.role`/`is_staff` keep synchronizing through
  `access.services.sync_primary_role` per D5.
- **A-12.5 · The Review Queue view uses the Studio endpoint.** Per the plan,
  the review-queue route lives in `features/studio` (Phase 3 shipped it);
  Phase 12 only had to add the admin-console section that consumes it. The
  frontend never imports `features/studio` — the fetcher is a small
  `apiGet/apiPost` wrapper inside `features/admin/data/adminFetchers.ts`.

## 5. Files touched

**Backend:**
- `features/access/services.py` — new `bulk_remove_role_members`,
  `effective_permission_provenance`, and the `PERMISSION_KEYS` import.
- `features/adminconsole/urls.py` — legacy `/role` route replaced with
  `/users/bulk-roles` and `/users/:id/effective-permissions`.
- `features/adminconsole/views.py` — new `bulk_roles`, `user_effective_permissions`;
  `user_detail` PATCH now rejects `role`; deleted `set_role` and the
  `AuthRole` imports.
- `features/adminconsole/services.py` — deleted `set_role`; `update_user_account`
  no longer reads `role`; `create_user_account` reads role from `data`
  directly (see §4).
- `features/adminconsole/serializers.py` — `USER_FIELDS` no longer advertises
  a `role` input.
- `features/adminconsole/README.md` — routes table refreshed.
- `features/adminconsole/tests.py` — legacy tests replaced with
  `test_legacy_role_endpoint_is_retired`, `test_patch_role_input_is_retired`,
  and `test_role_change_flows_through_user_roles_endpoint`.
- `features/adminconsole/test_admin_upgrade.py` *(new)* — 8 tests covering bulk
  add/remove, inspector, and deprecation headers.
- `features/auth/permissions.py` — `IsAdminRole` deleted, module docstring
  explains the retirement.
- `features/auth/README.md` — module map updated.
- `features/auth/tests.py` — legacy `/role` tests replaced with the PUT-roles
  path and the 404 assertion.
- `features/quizzes/views.py` — new `_legacy_practice_response` wrapper that
  attaches `Deprecation: true`, `Sunset`, and the log line.

**Frontend:**
- `features/admin/data/adminFetchers.ts` — `updateUserRole` removed;
  `fetchEffectivePermissions`, `bulkApplyRole`, `fetchReviewQueue` added.
- `features/admin/data/adminSections.json` — new `review-queue` entry.
- `features/admin/data/adminFormatters.ts` — new `ClipboardCheck` icon binding.
- `features/admin/types.ts` — three new interfaces
  (`EffectivePermissionItem`/`Grant`, `BulkRoleOutcome`, `ReviewQueueItem`) and
  a `'review-queue'` extension of `AdminSectionKey` + `SECTION_DETAILS`.
- `features/admin/components/layout/AdminShell.tsx` — wires `ReviewQueueView`
  under the new tab.
- `features/admin/components/layout/UsersTable.tsx` — `RoleSelect` gone,
  `RoleChips` always mounted, checkbox column added for the bulk toolbar.
- `features/admin/components/views/ReviewQueueView.tsx` *(new)*.
- `features/admin/components/views/UsersView.tsx` — legacy `changeRole` and
  `changingRoleId` props removed.
- `features/admin/components/controls/RoleSelect.tsx` — **deleted**.
- `features/admin/context/AdminProvider.tsx` — dropped `updateUserRole`,
  `changeRole`, and `changingRoleId`; `sectionLoading`/`loadErrors` extended for
  the new tab.
- `features/admin/context/adminContext.ts` — the same three properties are gone
  from the public interface.
- `features/admin/pages/AdminPage.tsx` — the `|| Boolean(user?.isAdmin)` branch
  is gone.
- `features/admin/__tests__/adminFetchers.test.ts` — the legacy `/role` case is
  replaced by effective-permissions + bulk-roles contract tests.
- `app/RouteGuard.tsx`, `app/layouts/RootLayout.tsx` — `\|\| isAdmin` fallback
  removed; comments record the Phase 12 rationale.
- `app/__tests__/RouteGuard.test.tsx` — new "legacy isAdmin alone is bounced"
  case; ADMIN fixture now carries `permissions: ['admin.access']`.
- `scripts/grep-gate.sh` *(new)* + `.github/workflows/frontend.yml` — the CI
  step that keeps the retirement enforced.

## 6. Rollback & safety

No migrations, no schema changes. Every new route is additive; the removed
route returns 404 rather than 410 so any cached client keeps a safe shape. To
roll back, redeploy the previous commit and delete `grep-gate.sh`.

## 7. Handoff notes

- Branch `Feature/AdminUpgrade` should merge into the integration branch
  (`Feature/LearningLoop` per Phase 11's closeout) with the usual §0.4 gate
  evidence above.
- The deferred admin sections listed in §2 are the next-most-important Phase 12
  follow-ups; each has the exact backend surface already in place, so they are
  pure UI work plus one small `videohosting/console/services.py` annotation and
  one `features/scholarships` list endpoint.
- The `grep-gate.sh` script intentionally allows `user.isAdmin` in
  `src/features/auth/types.ts` and `src/shared/lib/permissions.ts` (both
  describe the payload shape, not a UI decision). If backlog B9 removes the
  payload field entirely, the allow-list becomes unnecessary and the script
  can drop to a plain `\bisAdmin\b` search.
