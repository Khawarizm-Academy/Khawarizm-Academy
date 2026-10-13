# Backend Plan

The plan that this backend was built from. It records the decisions so the code
stays explainable rather than arbitrary.

## Goal

Replace the frontend's in-repo mocks and the data embedded in `shared/json/*`
with a real service, without changing any component. The frontend keeps its
`VITE_USE_MOCK_API` switch and defaults to mock, so the demo is unchanged until
someone flips it.

## Scope

**Moves to the backend (data):**

- `mockCatalog`, `mockCourses`, `mockCourseProblems`
- `mockDashboard` + `dashboardNotifications`
- `mockHomepage`
- The **content** half of `dashboardViews` / `dashboardChambers` (stored as
  `DashboardContentBlock` JSON blobs)

**Stays in the frontend (presentation config):**

- `routes`, `shellNav`, `dashboardNav`
- `localization`, `footer`
- Catalog filter *configuration* (labels, groups) — the backend only filters
- `courseSystem` copy, `auth`

`dashboardViews.json` / `dashboardChambers.json` still have synchronous
direct-JSON consumers (`dashboardContext.ts`, modal components), so those were
deliberately left as-is. The matching endpoints exist for the contract.

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
2. Copy the frontend JSON into `academy/seeds/` and write the idempotent
   `seed_data` command.
3. Add `api/` serializers, then views, then `urls.py` — feature by feature.
4. Smoke-test every endpoint and mutation with `curl`.
5. Rewire frontend fetchers behind `isMockApi`; verify with
   `npm run build` + `npx eslint src`.
6. Document (`docs/07-backend-contract.md`, this folder's README, root README).
