---
name: khawarizm-app-blueprint
description: The master blueprint for standing up a Khawarizm-style app from scratch — a Django + DRF API and a React 19 + Vite + Tailwind v4 SPA that mirror each other one folder per feature. Use when starting a new app (or a new large area of one), cloning this architecture, deciding the stack and folder shape, bootstrapping settings/auth/theming/routing, or onboarding someone to how the pieces fit. Covers the non-negotiable invariants, the bootstrap order, the mirror rule, the first features to build, and the verification gates.
---

# Khawarizm Academy — App Blueprint (clone this architecture)

How to build a **similar app** — Arabic-first, RTL, feature-per-folder, Django +
React — without re-deriving every decision. This is the entry point; each step
points at the skill that owns the detail.

> This skill is the map. The territory: [`khawarizm-backend`](../khawarizm-backend/SKILL.md),
> [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md),
> [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md),
> [`khawarizm-environment-and-deploy`](../khawarizm-environment-and-deploy/SKILL.md).

---

## 1. The shape of the app

```
Khawarizm-Academy/
├── backend/                 Django + DRF — owns all record data
│   ├── config/              settings, urls, wsgi/asgi, middleware
│   └── features/            ONE FOLDER PER PRODUCT FEATURE
│       ├── common/          shared: UUID/timestamp base models, choices, testing kit, seed
│       ├── auth/            User + profiles + sessions (app label "accounts")
│       ├── adminconsole/    staff analytics (owns no tables)
│       └── <feature>/       models → serializers → views → urls → admin → tests → README
├── frontend/                React 19 + Vite + Tailwind v4 — owns all presentation
│   └── src/
│       ├── app/             router, routes, guards, RootLayout, pageLoads
│       ├── features/        ONE FOLDER PER PRODUCT FEATURE (mirrors backend/)
│       ├── shared/          components, hooks, lib, json, types, styles
│       └── styles/          tokens.css + globals.css (imports each feature css)
└── docs/                    human-facing twins of the skills
```

**The mirror rule.** A product feature is **one Django app + one frontend
feature folder with the same name**. `courses` is `backend/features/courses/`
*and* `frontend/src/features/courses/`. The frontend's `types.ts` and
`entities.ts` are the contract; the backend returns exactly those camelCase keys.

---

## 2. The non-negotiable invariants

1. **UUID primary keys.** Every table inherits `UUIDModel`; catalog rows also keep
   a unique `slug` (the business key and route param, emitted as `id`). Never an
   integer public id, never a slug as the PK.
2. **camelCase only at the serializer boundary.** snake_case is the model,
   camelCase is the JSON. Nothing else converts.
3. **One app + folder per feature**, names aligned, mirroring the frontend.
   Shared tables live once, in their owner; readers import, never duplicate.
4. **The database ships empty.** The Django admin **is** the data editor — every
   model registered, children inline. A `seed_demo` command exists for reference
   data and demo content.
5. **Filters are data, not branches.** Alternatives are a record or a list of
   rows (`features/catalog/filters.py`). No `if/else` ladders.
6. **The backend env is the single source of truth.** The SPA holds only
   `VITE_API_BASE_URL`; public config is served over the API.
7. **Auth is Firebase-verified, authority is ours.** Firebase proves identity;
   roles, sessions, and permissions live in Django.
8. **Fail loudly.** Bad config raises at boot (`ImproperlyConfigured`); a missing
   row is a 404 with a message, never an empty 200.
9. **One-line comments, why not what.** No clever code; static data in JSON.

Details and exceptions for each live in the owning skills.

---

## 3. Stack (pin these)

| Layer | Choice |
| :--- | :--- |
| API | Django 6.x · DRF (function-based views) · `django-cors-headers` · `python-dotenv` |
| DB | SQLite locally · Postgres via `DATABASE_URL` |
| Auth | Firebase Admin SDK (verify ID tokens) · PyJWT (HS256 access) · opaque refresh |
| SPA | React 19 + React Compiler · TypeScript strict · Vite 8 |
| Styling | Tailwind v4 (`@import "tailwindcss"`) + a tokens file + `@apply` concept classes |
| Icons | `lucide-react` only — no emoji, no ad-hoc SVGs |
| Routing | hand-rolled data-driven router (`routes.json`) — no router library |
| Data | in-memory SWR cache (`useCachedData` + a `dataCacheManager`) |
| Tests | Django `TestCase` on a shared kit · Vitest + Testing Library (mocks global `fetch`) |

---

## 4. Bootstrap order

### 4.1 Repository
1. `backend/` and `frontend/` at the root, plus `docs/`.
2. `.gitignore`: ignore `.env.*` but keep safe profiles (`.env.development`,
   `.env.test`, `!.env.*.example`); ignore `*.sqlite3`. **Never** commit
   `.env.production` or a service account.

### 4.2 Backend (`khawarizm-backend`)
3. `config/settings.py` with the env-profile loader (`DJANGO_ENV` →
   `.env.<profile>`), `env_bool`/`env_list`/`env_int`, boot guards, CORS, DRF
   defaults (`DEFAULT_AUTHENTICATION_CLASSES`, `EXCEPTION_HANDLER`).
4. `config/middleware.py` — the `/api/` origin guard (tests and curl must send an
   `Origin`).
5. `features/common/` — the foundation everything inherits:
   - `models.py`: `UUIDModel`, `TimeStampedModel`.
   - `choices.py`: every enum (`TextChoices`), imported everywhere (never literals).
   - `serializers.py`: `compact`, `as_number`.
   - `testing.py`: `ApiTestCase`, `api_client`, `authenticate`, `make_user`/`make_admin`, factories.
   - `management/commands/seed_demo.py`: reference data + demo accounts/content.
   - **`common` IS an installed app** (it owns the seed command).
6. `features/auth/` — see [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md):
   the email-first `User` (label `accounts`), profiles, `UserSession` + device
   footprint, tokens, `firebase.py`, the `/api/auth` views, `IsAdminRole`.
7. `features/adminconsole/` — staff analytics that owns no tables (optional but
   cheap once auth exists).
8. `config/urls.py` — mount `path("api/", include("features.<feature>.urls"))`
   per feature; Django admin at `/admin/`.
9. `requirements.txt`, run `makemigrations` + `migrate`.

### 4.3 Frontend (`khawarizm-frontend`)
10. Vite + React 19 + TS strict + Tailwind v4 (`@tailwindcss/vite`), the `@` alias
    → `src/`, React Compiler via the Babel plugin.
11. `src/styles/tokens.css` (design tokens) + `globals.css`
    (`@import "tailwindcss"`, tokens, then each feature CSS — **one entry point**),
    imported by `index.css`.
12. `src/app/` — `router.tsx` (history, transitions, scroll), `routes.tsx`
    (`findRoute`, `resolveActiveTab`), `routes.json` (the route table),
    `RouteGuard.tsx`, `Navigate.tsx`, `pageLoads.ts` (lazy chunks),
    `layouts/RootLayout.tsx` (the shell + `AuthToast`).
13. `src/shared/` — `components/`, `hooks/useCachedData.ts`, `lib/`
    (`apiClient.ts`, `cacheManager.ts`, `navigation.ts`, `localization.ts`,
    `authStorage.ts`), `json/`, `types/entities.ts`.
14. `features/auth/` — `AuthProvider` + `useAuth`, lazy Firebase client,
    fetchers, the login page. `apiClient` handles the 401-refresh-replay.
15. `.env.development` / `.env.production` / `.env.test` — **only**
    `VITE_API_BASE_URL`.

### 4.4 Wire them together
16. `GET /api/auth/config` serves the Firebase web config → the SPA initialises
    Firebase from it. No keys in the frontend env.
17. `apiClient` prepends `VITE_API_BASE_URL`, attaches the Bearer token, and
    refreshes on 401.
18. Add the first feature's route to `routes.json`, its lazy chunk to
    `pageLoads.ts`, its page to `routes.tsx`'s `PAGE_BY_PATH`.

---

## 5. The first features to build (in order)

1. `common` — the foundation (base models, choices, testing).
2. `auth` — you cannot scope anything to a user without it.
3. One **domain owner** feature end to end (`courses`): model → serializer →
   view → url → admin → test → README, plus its frontend twin. This is the
   reference you copy for every feature after.
4. `catalog` — the taxonomy/reader that proves the data-driven filter pattern.
5. `dashboard` or a scoped view — proves learner-scoped rows (`request.user`).
6. `adminconsole` — once auth and a couple of features exist, the analytics
   read-only app is quick.

Each one follows the 13-step backend protocol
([`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md)) and the
10-step frontend protocol
([`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md)).

---

## 6. Keeping it consistent

| Topic | Skill |
| :--- | :--- |
| Backend rules every file follows | [`khawarizm-backend`](../khawarizm-backend/SKILL.md) |
| Adding a backend feature (13 steps) | [`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md) |
| Design system, tokens, concept classes | [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) |
| Building a page (10 steps) | [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md) |
| Routes, flags, guards | [`khawarizm-routing`](../khawarizm-routing/SKILL.md) |
| Loading, skeletons, SWR cache | [`khawarizm-navigation-cache`](../khawarizm-navigation-cache/SKILL.md) |
| Desktop/Mobile view split | [`khawarizm-desktop-mobile-views`](../khawarizm-desktop-mobile-views/SKILL.md) |
| Folder taxonomy & imports | [`khawarizm-organization-and-imports`](../khawarizm-organization-and-imports/SKILL.md) |
| Motion | [`khawarizm-motion`](../khawarizm-motion/SKILL.md) |
| Layout fixes | [`khawarizm-layout-edit`](../khawarizm-layout-edit/SKILL.md) |
| Code style | [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) |
| Auth, sessions, roles | [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md) |
| Env, secrets, deploy | [`khawarizm-environment-and-deploy`](../khawarizm-environment-and-deploy/SKILL.md) |

---

## 7. Verification gates

```bash
# Backend
cd backend && source .venv/bin/activate
python manage.py check
python manage.py makemigrations --check --dry-run   # must print "No changes detected"
python manage.py test

# Frontend
cd frontend
npx tsc -b
npm run lint
npm run build
npm test
```

Then verify **behavior**, not just types: print the old and new payload for
anything refactored, curl the routes with an allowed `Origin`, and confirm a
missing slug returns 404 with a message.

---

## 8. Do / Don't

| Do | Don't |
| :--- | :--- |
| Keep one folder per feature on both sides, mirrored | Let a feature import another feature's internals |
| Inherit `UUIDModel`; keep `slug` as the business key | Use integer public ids |
| Convert naming once, in the serializer | Rename keys in views or models |
| Serve public config from the API | Duplicate secrets into the frontend |
| Copy the first domain feature as the template | Invent a new structure per feature |
| Run the four frontend gates + the four backend gates | Ship on a green build alone |

---

## Related

- Auth & sessions: [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md)
- Environments & deploy: [`khawarizm-environment-and-deploy`](../khawarizm-environment-and-deploy/SKILL.md)
- Backend feature protocol: [`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md)
- Frontend page protocol: [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md)
