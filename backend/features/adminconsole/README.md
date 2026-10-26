# Admin Console — لوحة الإدارة

The staff-only surface that watches and controls the whole platform: every
account, every device session, the login series, and the recent audit trail.

This feature **owns no tables.** It reads across `accounts` (users, sessions,
events) and answers with the same payload shapes `features/auth/serializers.py`
already defines, so there is one definition of "a session row" in the codebase.

## At a glance

| | |
| :--- | :--- |
| **App label** | `adminconsole` |
| **Routes** | `GET /api/admin/overview`, `GET|POST /api/admin/users`, `GET|PATCH|DELETE /api/admin/users/:id`, `POST /api/admin/users/:id/role`, `GET /api/admin/sessions`, `POST /api/admin/sessions/:id/revoke`, `GET /api/admin/analytics/logins`, `GET /api/admin/analytics/devices`, `GET /api/admin/events`, `GET /api/admin/content/schema`, `GET|POST /api/admin/content/:type`, `PATCH|DELETE /api/admin/content/:type/:id`, `GET /api/admin/video-providers`, `GET|POST /api/admin/video-assets`, `POST /api/admin/video-assets/upload`, `GET|DELETE /api/admin/video-assets/:id`, `GET /api/admin/video-diagnostics` |
| **Owns** | — (reads across features) |
| **Imports** | `User`, `UserSession`, `AuthEvent` (accounts); `user_profile`, `session_payload`, `session_with_user`; `Course`/`Scholarship`/`EventItem`/`Competition` (content) |
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
├── views.py          thin staff-only views + the two label maps
├── urls.py           /api/admin routes
├── admin.py          (none — it owns no models)
├── tests.py          permissions, filters, the current-session flag, the 400s, content CRUD
└── README.md
```

## How it works

- **Every view is double-gated:** `IsAuthenticated` then `IsAdminRole`
  (`features/auth/permissions.py`), which reads `user.is_staff` — so a Django
  staff member is an admin even without the `admin` role, and a learner gets a
  403 with the console's `Bearer` scheme advertised (not a 401).
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
  matching profile row. An admin cannot change their own role.
- **Accounts are fully managed:** `POST /api/admin/users` creates an account
  (email lowercased + a password), `PATCH /api/admin/users/:id` updates any
  subset of `USER_FIELDS`, `DELETE /api/admin/users/:id` removes it. An admin
  cannot demote or delete their own account.
- **The content editor is schema-driven:** `serializers.py` declares
  `USER_FIELDS` and `CONTENT_TYPES` — one row per managed type listing its
  label, the model it maps to, its key field, and the fields the form renders
  (`AdminFieldKind`: text/textarea/url/number/decimal/bool/select/json).
  `GET /api/admin/content/schema` hands that registry to the console, so adding
  a managed field is one registry row, never a new branch.

## Data

| Source | Provides |
| :--- | :--- |
| `accounts.User` | user rows, role counts, the users table, user create/edit/delete |
| `accounts.UserSession` | device rows, the active/total counts, the os/browser/device breakdown |
| `accounts.AuthEvent` | the daily login series and the recent-activity stream |
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
