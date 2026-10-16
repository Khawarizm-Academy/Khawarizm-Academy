# Backend Plan

The plan that this backend was built from. It records the decisions so the code
stays explainable rather than arbitrary.

## Goal

Make the frontend fully API-driven: it keeps its presentation config and copy,
but every piece of **data** is served by the backend. All mock data and mock
files were deleted from the frontend; nothing is behind a switch anymore.

## Scope

**Backend owns all data:**

- Catalog, course details, course problems, homepage, and dashboard records.
- The database ships **empty** — there is no seed data and no `seed_data`
  command. Records are added through the Django admin or the ORM.

**Stays in the frontend (presentation config):**

- `routes`, `shellNav`, `dashboardNav`
- `localization`, `footer`
- Catalog filter *configuration* (labels, groups), dashboard filter chips
- Dashboard view/chamber chrome (`shared/json/dashboardContent.json`)
- `courseSystem` copy, `auth` (untouched for now; handled separately later)

**Removed from the frontend:**

- `shared/mocks/*` and `shared/json/mock*.json`
- `shared/json/dashboardViews.json`, `dashboardChambers.json`,
  `dashboardNotifications.json` — their chrome now lives in
  `shared/json/dashboardContent.json`

## Stack

Django 6.1 · DRF 3.18 · django-cors-headers · SQLite · no auth.

## Shape rule

Every response uses the **exact camelCase keys** the frontend types already
declare (`shared/types/entities.ts` + per-feature `types.ts`). A shared
`compact` helper drops empty/`None` fields so payloads stay lean, which is why
the frontend never needs an `as` cast.

## Identity rule

Slugs equal the entity ids and are the primary keys/route params, so a catalog
link and a `/courses/:slug` request resolve to the same row.

## No auth yet

A single demo learner (`ahmad.q@example.com`) is the current user, created on
first request and resolved by `features/auth/services.py`. `auth/*` are stubs;
swapping in real sessions later should only touch that folder.

## Layout rule

**One feature = one Django app = one folder** under `backend/features/`,
mirroring `frontend/src/features/`. Each folder holds its own `models.py`,
`serializers.py`, `views.py`, `urls.py`, `admin.py`, and `README.md`. Views stay
thin (resolve learner → query → serialize); serializers own the camelCase
mapping. `common/` holds shared choices and serializer helpers and owns no data.

The auth feature uses the app **label `accounts`** (folder `features/auth`) so it
never collides with `django.contrib.auth`.

## Readability rule

Code is written to be read: one-line comments that say *why*, data-driven
filters instead of `if` chains (`catalog/filters.py`), grouped model fields with
short comments, real `help_text` where a field name is unclear, and an
`admin.py` per feature so the database is easy to inspect and edit.

## Build order

1. Scaffold `config/` + one app per feature with its models + migrations.
2. Add each feature's serializers, then views, then `urls.py`.
3. Smoke-test every endpoint and mutation with `curl` (with an allowed Origin).
4. Delete the frontend mocks and rewire every fetcher/consumer to the API;
   verify with `npm run build` + `npx eslint src`.
5. Document (`docs/07-backend-contract.md`, `docs/08-backend-architecture.md`,
   `features/README.md`, this folder's README, root README).
