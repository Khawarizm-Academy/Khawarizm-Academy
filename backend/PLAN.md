# Backend Plan

The plan that this backend was built from. It records the decisions so the code
stays explainable rather than arbitrary.

## Goal

Make the frontend fully API-driven: it keeps its presentation config and copy,
but every piece of **data** is served by the backend. All mock data and mock
files were deleted from the frontend; nothing is behind a switch anymore.

## Scope

**Backend owns all data:**

- Catalog, course details, course problems, homepage, dashboard records, and
  the dashboard content blocks (views, chambers, notifications) — seeded into
  SQLite from the Python literals in `academy/seed_data.py` (no JSON files).
- The seed data is defined in code and written through the ORM into SQLite by
  the idempotent `seed_data` command.

**Stays in the frontend (presentation config):**

- `routes`, `shellNav`, `dashboardNav`
- `localization`, `footer`
- Catalog filter *configuration* (labels, groups), dashboard filter chips
- `courseSystem` copy, `auth` (untouched for now; handled separately later)

**Removed from the frontend:**

- `shared/mocks/*` and `shared/json/mock*.json`
- `shared/json/dashboardViews.json`, `dashboardChambers.json`,
  `dashboardNotifications.json` — their content is fetched via
  `/dashboard/content` and `/dashboard/chambers`

## Stack

Django 6.1 · DRF 3.18 · django-cors-headers · SQLite · no auth.

## Shape rule

Every response uses the **exact camelCase keys** the frontend types already
declare (`shared/types/entities.ts` + per-feature `types.ts`). A shared
`compact` helper drops empty/`None` fields so payloads mirror the mocks, which
is why the frontend never needs an `as` cast.

## Identity rule

Slugs equal the mock ids and are the primary keys/route params, so a `/catalog`
link and a `/courses/:slug` request resolve to the same row (`course-1` → row
`course-1`).

## No auth yet

A single seeded demo learner (`ahmad.q@example.com`) is the current user, resolved
by `api/learners.py`. `auth/*` are stubs; swapping in real sessions later should
only touch that module.

## Layout rule

One feature = one view module + one serializer module. Views stay thin
(resolve learner → query → serialize); serializers own the camelCase mapping.
Models are split by group and star-imported into `academy/models.py` so Django
registers them and `academy.models.<Name>` resolves.

## Build order

1. Scaffold `config/` + `academy/models*` + migrations.
2. Define the demo data as Python literals in `academy/seed_data.py` and write
   the idempotent `seed_data` command.
3. Add `api/` serializers, then views, then `urls.py` — feature by feature.
4. Smoke-test every endpoint and mutation with `curl`.
5. Delete the frontend mocks and rewire every fetcher/consumer to the API;
   verify with `npm run build` + `npx eslint src`.
6. Document (`docs/07-backend-contract.md`, this folder's README, root README).
