# Admin Console — لوحة الإدارة

The permission-gated administration surface for accounts, device sessions,
analytics, managed content, custom roles, and access-audit history.

This feature **owns no tables.** It reads across `accounts` (users, sessions,
events) and answers with the same payload shapes `features/auth/serializers.py`
already defines, so there is one definition of "a session row" in the codebase.

## At a glance

| | |
| :--- | :--- |
| **App label** | `adminconsole` |
| **Routes** | `/api/admin/roles/*`, `/api/admin/audit`, `GET /api/admin/overview`, `GET|POST /api/admin/users`, `GET|PATCH|DELETE /api/admin/users/:id`, legacy `POST|PATCH /api/admin/users/:id/role`, `PUT /api/admin/users/:id/roles`, `GET /api/admin/sessions`, `POST /api/admin/sessions/:id/revoke`, `GET /api/admin/analytics/logins`, `GET /api/admin/analytics/devices`, `GET /api/admin/events`, `GET /api/admin/content/schema`, `GET|POST /api/admin/content/:type`, `PATCH|DELETE /api/admin/content/:type/:id`, and the existing video-console routes |
| **Owns** | — (reads across features) |
| **Imports** | `User`, `UserSession`, `AuthEvent` (accounts); access roles and audit events; `user_profile`, `session_payload`, `session_with_user`; `Course`/`Scholarship`/`EventItem`/`Competition` (content) |
| **Frontend twin** | `frontend/src/features/admin/` |

## Purpose

Answers the three questions an administrator has: *who is here*, *from where*,
and *what just happened* — plus the actions they need: **create, edit, disable
and delete any account** and **manage the four managed content types**
(courses, scholarships, events, competitions) through one schema-driven editor.

## Structure

```text
adminconsole/
├── apps.py           AppConfig (label "adminconsole")
├── serializers.py     USER_FIELDS + the CONTENT_TYPES registry (the editor's schema)
├── services.py        account lifecycle + content-editor value coercion/user_ref validation
├── views.py           thin method- and content-permission-gated views
├── role_views.py      role CRUD, assignment, membership, reorder, and access-audit endpoints
├── permissions.py     method-specific permission factories
├── urls.py           /api/admin routes
├── admin.py          (none — it owns no models)
├── tests.py          permissions, filters, the current-session flag, the 400s, content CRUD
└── README.md
```

## How it works

- **Authorization is granular and server-enforced:** each existing admin method
  requires its Phase 2 access key (`users.view`, `users.create`, `sessions.view_any`,
  `analytics.view_platform`, etc.); managed-content permissions are declared per
  type. Frontend navigation is only a convenience—the API remains authoritative.
  The legacy `is_staff`/superuser bridge still grants the canonical administrator
  permission set for existing staff accounts.
- **Role management is a separate resource API:** `/roles/catalog` is generated
  from `features/access/registry.py`; `/roles` and its member endpoints use the
  access services for hierarchy, grant ceilings, last-administrator protection,
  audit writes, and optimistic `expectedUpdatedAt` conflicts. `/audit` pages and
  filters those access events; it is distinct from `/events` (`AuthEvent`).
- **User creation cannot self-elevate:** `users.create` may create a default
  student, while any non-default role goes through `users.assign_roles` and the
  same hierarchy/grant checks as the role manager. Legacy single-role POST and
  PATCH remain supported during the planned transition.
- **The current session is marked, not guessed:** `session_payload(s,
  request.auth.id)` is passed the caller's session id, so `isCurrent` is true
  only for the device the admin is browsing from. This is the same helper the
  learner's own `/api/auth/sessions` uses.
- **Filters are data, not branches:** the user list filters on `role` and a
  `q` that matches email *or* full name; the session list filters on `active`
  (`true`/`false`, anything else means "no filter") and a `q` that matches
  email *or* IP; the event stream filters on `kind`. An unknown `role` or
  `kind` value simply matches nothing rather than raising.
- **Int query params fail with a 400, not a 500:** `_int_param` floors the
  value and raises `InvalidParameter`, which renders the same
  `{"detail": ...}` shape as everything else.
- **Role changes keep Django in sync:** setting a role to `admin` sets
  `is_staff`, and any other role clears it, then `ensure_profile` creates the
  matching profile row. Role assignment is separately gated; an admin cannot
  change their own role through the legacy endpoint.
- **Accounts are fully managed:** `POST /api/admin/users` creates an account
  (email lowercased + a password), `PATCH /api/admin/users/:id` updates any
  subset of `USER_FIELDS`, `DELETE /api/admin/users/:id` removes it. An admin
  cannot demote or delete their own account.
- **The content editor is schema-driven and permission-filtered:**
  `CONTENT_TYPES` declares per-type read/write/delete keys, and schema responses
  include only content types the caller can read. `serializers.py` declares
  `USER_FIELDS` and `CONTENT_TYPES` — one row per managed type listing its
  label, the model it maps to, its key field, and the fields the form renders
  (`AdminFieldKind`: text/textarea/url/number/decimal/bool/select/json/user_ref).
  `GET /api/admin/content/schema` hands that registry to the console, so adding
  a managed field is one registry row, never a new branch.
- **Course CRUD respects the lifecycle:** generic content-editor creates set
  `status=draft`; the course `owner` user reference synchronizes the explicit
  owner staff row; and course deletion delegates to the lifecycle service, which
  rejects enrolled courses instead of cascading learner access.

## Data

| Source | Provides |
| :--- | :--- |
| `accounts.User` | user rows, role counts, the users table, user create/edit/delete |
| `accounts.UserSession` | device rows, the active/total counts, the os/browser/device breakdown |
| `accounts.AuthEvent` | the daily login series and the recent-activity stream |
| `access.AccessRole`, `access.RoleAssignment`, `access.AuditEvent` | role definitions, effective user-role summaries, and paged access-change audit history |
| `accounts.serializers` | the payload shapes, shared with `/api/auth/*` |
| `courses.Course`, `scholarships.Scholarship`, `events.EventItem`, `competitions.Competition` | the four managed content types |
| `videohosting` (via `diagnostics.py`) | provider `available`/`reason` gating, asset health columns, and the staged `/admin/video-diagnostics` report |
| `videohosting.ingest` | the `POST /admin/video-assets/upload` worker: the file reaches a temp path and a `ProgressTracker` follows source bytes → packaging → segment publishing on the row's `progress`/`stage` fields |

## Payload notes

- `/api/admin/users/:id` returns `events` **without** an `email` key — the
  user is already identified by the surrounding profile. The global
  `/api/admin/events` stream *does* carry `email`, because there the question
  is "who acted".
- Both list endpoints return `{total, page, pageSize, results}`.
- Asset rows (list / detail / upload) share one shape: `{id, slug, title, status, provider, progress, stage, qualities, createdAt[, error]}` — the upload tracker polls the detail row until `status` is `ready`, `staged`, or `error`.
- `POST /api/admin/video-assets/upload` is multipart (`file`, `slug`, optional `title`/`provider`): it responds `202` with the asset row once the file is on disk, then ingests on a worker thread. Telegram is refused with its diagnostics reason until the env checks pass, and a slug already mid-ingest answers `409`. Because the request dies before the work finishes, this endpoint belongs on a real server, not an ephemeral serverless worker.
- A content row is `{id, key, title, values}` where `key` is the type's business
  key (`slug`, `event_id`, `competition_id`) and `values` is every schema field
  read straight off the model — so the console's edit form is seeded from one
  payload and the PATCH it sends back is the same shape.

## Related

- Auth & accounts (the models and serializers this reads): [`../auth/README.md`](../auth/README.md)
- Backend architecture: [`../../../docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md)
- Frontend twin: [`../../../frontend/src/features/admin/README.md`](../../../frontend/src/features/admin/README.md)
