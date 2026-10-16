# Backend Plan

The plan this backend was built from, and the decisions behind it. Kept current
so the code stays explainable rather than arbitrary.

## Goal

Make the frontend fully API-driven: it keeps its presentation config and copy,
but every piece of **data** is served by the backend. Mock data and mock files
were deleted from the frontend; nothing is behind a switch anymore.

Accounts are real: Firebase issues the identity, this backend owns the session,
and an administrator can see and control every device from one console.

## Scope

**Backend owns all data:**

- Catalog, course details, course problems, homepage, dashboard, and profile
  records.
- **Accounts, roles, sessions, device footprints, and the audit trail.**
- **The catalog taxonomy and every filter/sort option** (`FilterGroup`,
  `FilterOption`) — the frontend asks the API which filters exist.
- Analytics for the admin console (counts, login series, device breakdown,
  recent activity).

`python manage.py seed_demo` fills a development database with the demo catalog,
the demo learner, and the seeded admin. A production database ships empty and is
filled through the Django admin.

**Stays in the frontend (presentation config):**

- `routes`, `shellNav`, `dashboardNav`
- `localization`, `footer`
- Catalog filter *chrome* (header/reset/apply labels), page titles, and the
  search-type maps
- Dashboard view/chamber chrome (`shared/json/dashboardContent.json`)
- `courseSystem` copy

**Removed from the frontend:**

- `shared/mocks/*` and `shared/json/mock*.json`
- `shared/json/dashboardViews.json`, `dashboardChambers.json`,
  `dashboardNotifications.json` — their chrome now lives in
  `shared/json/dashboardContent.json`
- `shared/json/auth.json` and the dummy auth cards — the login page is real
- The filter/sort option lists inside `shared/json/catalog.json`

## Stack

Django 6.1 · DRF 3.18 · django-cors-headers · SQLite · Firebase Admin SDK for
ID-token verification · PyJWT (HS256 access tokens).

## Shape rule

Every response uses the **exact camelCase keys** the frontend types already
declare (`shared/types/entities.ts` + per-feature `types.ts`). A shared
`compact` helper drops empty/`None` fields so payloads stay lean, which is why
the frontend never needs an `as` cast.

## Identity rule

Catalog entities keep `slug` as their **business** key and route param, so a
catalog link and a `/courses/:slug` request resolve to the same row; the
serializer emits it as `id` and the frontend IDs never changed.

Everything else — users, sessions, auth events, filter groups/options, home and
dashboard projections — is keyed by a **UUID** from
`features/common/models.py`. New code should always use `UUIDModel`.

## Accounts rule

`features/auth` owns `User` (an `AbstractUser` with `email` as the username field
and no username column), the two profile tables, `UserSession`, and `AuthEvent`.
Roles come from `features/common/choices.py` (`student` / `instructor` /
`admin`); admin rights are Django's `is_staff`, so the built-in admin site and
`ModelBackend` permissions work unchanged.

Auth is layered so each file has one job:

| File | Job |
| :--- | :--- |
| `firebase.py` | verify a Firebase ID token → an identity dict |
| `tokens.py` | mint/decode the access token, hash the refresh token |
| `services.py` | `open_session` / `rotate_session` / `record_event` |
| `authentication.py` | Bearer header → live `UserSession`, or a coded 401 |
| `permissions.py` | `IsAdminRole` |
| `serializers.py` | the payloads every other feature imports |

## Layout rule

**One feature = one Django app = one folder** under `backend/features/`,
mirroring `frontend/src/features/`. Each folder holds its own `models.py`,
`serializers.py`, `views.py`, `urls.py`, `admin.py`, `tests.py`, and
`README.md`. Views stay thin (resolve → query → serialize); serializers own the
camelCase mapping.

`features/common` **is** an installed app: it holds the shared abstract models,
the choice enums, and `management/commands/seed_demo.py`.
`features/adminconsole` owns no tables — it reads across the other features.
`features/profile` is model-less and is mounted without being installed.

The auth feature uses the app **label `accounts`** (folder `features/auth`) so it
never collides with `django.contrib.auth`.

## Readability rule

Code is written to be read: one-line comments that say *why*, data-driven
filters instead of `if` chains (`catalog/filters.py`, `adminconsole`'s label
maps), grouped model fields with short comments, real `help_text` where a field
name is unclear, and an `admin.py` per feature so the database is easy to
inspect and edit.

## Verification gate

```bash
cd backend && source .venv/bin/activate
python manage.py check
python manage.py makemigrations --check --dry-run   # must report no changes
python manage.py test
```

Every feature ships tests in its own `tests.py`, built on the shared kit in
`features/common/testing.py`.
