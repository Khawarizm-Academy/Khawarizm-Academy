# 09 · Access Control

How permissions are defined, granted, enforced, and consumed. The code lives in
`backend/features/access/` (a backend-only Django app with no URLs of its own —
it is a policy library other features import).

Numbers in this document are read from code, not memory. If you change the
registry, these change too, and `config.tests` will fail:

| Thing | Count | Where it is counted |
| :--- | ---: | :--- |
| Permission keys | 68 | `features/access/registry.py::PERMISSIONS` |
| Permission groups | 10 | `registry.py::PERMISSION_GROUPS` |
| Elevated keys (need a higher-grant check) | 21 | `PermissionSpec.elevated` |
| Role templates | 6 | `registry.py::ROLE_TEMPLATES` |
| Classified API routes | 170 | `config/route_access.py::CLASSIFIED` |
| — public / authenticated-only / permissioned / method-scoped | 34 / 98 / 34 / 4 | same file |

## 1. The catalog

Every permission is one `PermissionSpec` row in the registry:

```python
# registry.py — note the argument order: group, then key, then the label
_permission(
    "courses",                    # group: how it is clustered in the Role Manager UI
    "courses.publish",            # key: the only string the rest of the system uses
    "نشر الدورات",                 # label: Arabic, shown to humans
    elevated=True,                # granting it is itself a privileged act
    implies=("courses.edit_any",),  # closure: holding this holds these
)
```

`description` is generated from the label when omitted, so a new key cannot
accidentally ship an English string into an Arabic UI.

Rules the registry enforces (`registry.py::registry_errors()` is a test-facing
self-audit):

- **Keys are `domain.action`.** The prefix is the feature folder that owns the
  action, so `videos.package` belongs to `videohosting`. A grep for the prefix
  must land in one feature.
- **Never hand-write a key in a view.** Views import `PERMISSION_KEYS` from the
  registry; a literal string that is not in the catalog fails
  `validate_permission_keys()` at call time and fails the manifest test at CI.
- **`implies` is transitive closure, computed once** at import
  (`expand_permission_keys`). `administrator` implies all 67 other keys, which
  is why it is the only spec built with `replace()` after the table.
- **The frontend mirror is generated from this table.**
  `frontend/src/shared/json/permissionCatalog.json` must equal the registry key
  for key (`shared/lib/__tests__/permissions.test.ts` asserts
  `PERMISSION_KEYS` equals the JSON's `key` list in order). Update both in the
  same PR.

## 2. Roles

`AccessRole` is a **row, not an enum**: `{slug, name, description, color,
position, permissions[], is_system, is_default, template_key}`.

- `is_system` rows (`admin`, `student`) are created by `bootstrap_system_roles()`
  and cannot be deleted from the Role Manager.
- `is_default` (`student`) is what every new account gets through
  `sync_primary_role()`; a default role is never an "explicit" role, which
  matters for the hierarchy below.
- `template_key` links a row back to one of the six `ROLE_TEMPLATES` so the UI
  can say "created from the teaching-assistant template" without copying the
  template again. Materialised by `manage.py seed_demo --demo` (P14.1) with
  `get_or_create` — an administrator's edits to a materialised role are never
  rolled back by a re-seed.
- `position` is the ladder. Higher number = more senior. Default roles sit at 0.

Granting a role is a service call, never a direct write:
`features/access/services.py::assign_roles(actor, user, role_ids)`. It writes a
`RoleAssignment`, refreshes the legacy `User.role` / `is_staff` fields through
`sync_primary_role()` (kept as compatibility output for older clients), and
records an audit event.

## 3. The hierarchy

Three checks answer "may this actor do that":

| Question | Function | Rule |
| :--- | :--- | :--- |
| May they touch this role at all? | `can_manage_role(actor, role)` | needs `roles.manage`; the `admin` role is reachable **only** with `administrator`; otherwise `highest_position(actor) > role.position` (strict) |
| May they grant these keys? | `can_grant(actor, keys)` | every requested key must be in `effective_permissions(actor)`; `administrator` bypasses |
| May they act through course staff? | `has_object_perm(user, key, kinds)` | the catalog check AND the holder's `CourseStaff.kind` on that course being one of `kinds` (callers pass `OWN_KINDS[key]`) |

`highest_position(user)` returns `math.inf` for an administrator and the max
`role__position` otherwise (0 for default-only accounts), cached on the user
instance and invalidated whenever a role changes. Two consequences worth
internalising:

- **You cannot pull yourself up.** A role can only be handed down the ladder, and
  an edit at your own rung is refused even if you hold `roles.manage`.
- **Nobody grants what they do not hold.** `can_grant` compares against the
  *effective* set (after `implies` closure), so adding `courses.publish` to a
  role also requires holding `courses.edit_any` yourself.

Two ways the ladder is used, depending on how much the caller already knows:

```python
# The common shape: an own/any pair resolved by the course service.
courses/services.py::_course_permission(user, course, own_key, any_key)
    has_perm(user, any_key)                      # "any course" wins outright
    or has_perm(user, own_key) and _owns(user, course, OWN_KINDS[own_key])

# When the staff kind is already resolved, ask directly.
has_object_perm(actor, "courses.manage_staff", {staff_kind} if staff_kind else set())
```

`OWN_KINDS` maps an `*_own` key to the `CourseStaff.kind` values that satisfy
it. This is why the teaching assistant is useful: `assistant` kind opens the
roster, analytics and quiz results but never the editor. It is also the trap in
`Course.owner` — see §5.

## 4. Enforcement on routes

A view declares its gate and nothing else. `features/access/permissions.py`
builder functions raise `ValueError` at **import time** for a key that is not in
the catalog, so a typo kills boot rather than quietly opening a route:

```python
@permission_classes([IsAuthenticated, perm("courses.publish")])          # one key
@permission_classes([IsAuthenticated, perm_any("students.view_own",      # any one of
                                                 "students.view_any")])
```

When the method decides the requirement (the admin console and Studio pattern):

```python
@permission_classes([IsAuthenticated,
                     permission_for_methods(GET="studio.access", POST="courses.create")])
```

Then the route must be **classified** in the manifest:

```bash
python -m scripts.gen_route_access     # rewrites config/route_access.py from get_resolver()
```

`config/tests.py::RouteAccessManifestTests` walks the live resolver and fails
CI when an `/api/` URL name is missing from the manifest or carries a key that
is not in the catalog. That is the structural rule:
**adding an endpoint without declaring who may call it breaks the build.**

`config/test_denial_matrix.py` then walks the manifest itself: every
`PERMISSIONED` and `METHOD_SCOPED` route is called as an anonymous visitor
(expects 401), as a student (403), and as an administrator (anything but
401/403). 38 rows, one table-driven test — a route that forgot its decorator
fails there rather than in production.

Denials are counted per view (`features/common/observability.py::
count_permission_denial`) and logged at most once per 60 s per view, so a
misconfigured client shows up as a rising counter instead of a log flood.

## 5. Gotchas that cost time

- **Studio scopes on `CourseStaff`, not `Course.owner`.** `owner` is a
  historical field; `studio_course_queryset()` filters
  `staff__user=actor, staff__kind__in=OWN_KINDS[...]`. A course with an `owner`
  and no `CourseStaff(kind="owner")` row is invisible to its own instructor —
  the mistake the Phase 14 demo seed made until it was fixed.
- **`/api/` requests need an allowed `Origin`** (`ApiOriginRestrictionMiddleware`,
  `config/middleware.py`). A curl without it 403s before any permission logic
  runs, which looks identical to a permissions bug. The test kit's
  `api_client()` sends it for you.
- **Dev tokens are off in production.** `FIREBASE_ALLOW_DEV_TOKENS` only works
  when `DEBUG` is on; `dev:<email>` tokens otherwise 401.
- **The permission cache is per-request.** `effective_permissions()` memoises on
  the user object; if you write role rows with the ORM in a management command
  and reuse the same user instance, call `_clear_permission_cache` or re-fetch.
- **Never branch on role names in the UI.** See §6.

## 6. How the frontend consumes it

The signed-in payload carries the **effective** permission list, so the client
never re-derives it:

```ts
can(user, "courses.publish")        // shared/lib/permissions.ts
const canPublish = useCan("courses.publish")   // features/auth/context/useCan.ts
useCanAny(["students.view_own", "students.view_any"])
```

`PERMISSION_KEYS` in `shared/lib/permissions.ts` is a literal mirror of the
registry (so TS rejects a typo'd key), and `permissionCatalog.json` feeds the
Role Manager's grouping and Arabic labels.

Two rules the codebase enforces:

1. **The UI asks `can()`, never `role.name === "…"` or `user.isAdmin`.**
   Phase 12 retired `IsAdminRole`, the single-role endpoint, the `RoleSelect`
   editor and every `|| user.isAdmin` fallback; `frontend/scripts/grep-gate.sh`
   keeps them retired in CI. `isAdmin` still appears in the auth payload as an
   *output* for old clients — reading it in a component is the failure the gate
   catches.
2. **Hiding a button is not authorization.** Every guarded screen must also work
   when the response is 403: `RouteGuard` handles route-level gates, and each
   view renders its own denied/empty state, because the permission list and the
   server's answer can disagree mid-session.

## 7. Adding a permission in three steps

1. **Declare it** — add a `_permission("group", "domain.action", "label", …)` row
   to `registry.py`. Set `elevated=True` if it reaches other people's data, and
   `implies=(…)` only for genuine containment.
2. **Enforce it** — put `perm("domain.action")` in the view's
   `permission_classes`, run `python -m scripts.gen_route_access`, and confirm
   the denial matrix still covers the route (`python manage.py test config`).
3. **Expose it** — rewrite `frontend/src/shared/json/permissionCatalog.json` so
   it equals `permission_catalog()` (the backend test compares the two
   documents field for field; `features/access/README.md` keeps the same rule),
   add the key to the `PERMISSION_KEYS` literal in
   `frontend/src/shared/lib/permissions.ts`, then use
   `useCan("domain.action")` in the UI. Add the key to a role template only if
   that role's job description in `plan/PLAN.md` says it does this.

The mirror test, the manifest test and the denial matrix are what turn "I forgot
a step" into a red build instead of a live hole.
