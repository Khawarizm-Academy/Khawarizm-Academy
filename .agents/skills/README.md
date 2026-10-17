# Khawarizm Academy — Agent Skills

Fourteen skills. Read the one that matches what you are doing. **Starting a new
app (or a new area of one)? Begin with [`khawarizm-app-blueprint`](khawarizm-app-blueprint/SKILL.md)** —
it maps the rest.

| Skill | Use it when |
| :--- | :--- |
| **[khawarizm-code-style](khawarizm-code-style/SKILL.md)** | Writing, reviewing, or refactoring **any** `.ts` / `.tsx` — and the same rules for backend `.py`. One-line comments, no if-chains, static data in JSON, no desktop/mobile duplication, repeated class strings → CSS, verification gates. |
| **[khawarizm-routing](khawarizm-routing/SKILL.md)** | Adding or changing a **route, path, redirect, nav tab, or query param** — or debugging a URL that renders the wrong thing. |
| **[khawarizm-navigation-cache](khawarizm-navigation-cache/SKILL.md)** | **Loading states, skeletons, caching, page transitions, scroll memory.** Read `references/page-loading-caching-guide.md` before touching a page. |
| **[khawarizm-frontend](khawarizm-frontend/SKILL.md)** | **Design system** — observatory tokens, Tailwind v4 concept classes (incl. `.auth-*`, `.admin-*`, `.catalog-*`, `.course-*`, `.dash-*`), repeated-class extraction (§3.7), component catalog, RTL rules, directory placement. |
| **[khawarizm-desktop-mobile-views](khawarizm-desktop-mobile-views/SKILL.md)** | **Splitting a page into Desktop and Mobile view components** — folder-per-component organization (`<Component>/Desktop…View.tsx` + `Mobile…View.tsx`), context or props for shared surface state, surface data records instead of `isMobile` branches. |
| **[khawarizm-organization-and-imports](khawarizm-organization-and-imports/SKILL.md)** | **Structuring feature `components/` folders and writing imports** — the category taxonomy (`layout`, `views`, `chrome`, `cards`, `hero`, `overlays`, `controls`, `states`, `filters`, `toolbar`) and the `@/` alias import rules (`@/` → `src/`, direct-file imports, extension rules). |
| **[khawarizm-page-builder](khawarizm-page-builder/SKILL.md)** | Building a **new page or feature end to end** — the 10-step protocol. |
| **[khawarizm-motion](khawarizm-motion/SKILL.md)** | **Animations & micro-interactions** — the Celestial Motion System: entrance cascades, hover lifts/tilts, sliding-puck switches (`SlidingSegmentedControl`), shine sweeps, `btn-attention` halos, countdowns, and their fill-mode caveats. |
| **[khawarizm-layout-edit](khawarizm-layout-edit/SKILL.md)** | **Fixing/editing existing pages** — content hugging one side, centering (`mx-auto`), two-column grids + sticky asides, actions pushed down by a taller column, slim top navigators, sticky offsets, CTA hierarchy, filling gaps. |
| **[khawarizm-backend](khawarizm-backend/SKILL.md)** | **Anything in the Django + DRF backend** — one app per feature, the camelCase JSON contract, thin views, data-over-branches filters, readable/editable models, the admin data editor, the shared testing kit, one-line comments, and the verification gate. |
| **[khawarizm-backend-feature](khawarizm-backend-feature/SKILL.md)** | **Adding a new backend feature end to end** — the 13-step scaffold: apps, models → serializers → views → urls → admin → settings + URL mounting → migrations → tests → README, and the verification gate. |
| **[khawarizm-auth-and-sessions](khawarizm-auth-and-sessions/SKILL.md)** | **Anything authentication, roles, or sessions** — Firebase sign-in (Email/Google/Facebook), the email-first `User` with student/instructor/admin roles, HS256 access + rotating refresh tokens, the `UserSession` table with per-device footprint, single-device enforcement, the `/api/auth` and `/api/admin` contracts, the admin console, and the frontend `AuthProvider`/`apiClient` refresh flow. |
| **[khawarizm-environment-and-deploy](khawarizm-environment-and-deploy/SKILL.md)** | **Config, secrets, and shipping** — the `DJANGO_ENV` env profiles, committed vs gitignored `.env` files, the Firebase web-config/service-account split (the SPA reads its config from the backend), `DATABASE_URL`/SQLite-vs-Postgres, Vercel for both apps, and the troubleshooting table (401 on login, Application Default Credentials, clock skew, origin 403, `dev:` tokens off). |
| **[khawarizm-app-blueprint](khawarizm-app-blueprint/SKILL.md)** | **Starting a new app or a new large area** — the master blueprint: the invariants, the stack, the mirror rule (one Django app + one frontend folder per feature), the bootstrap order, the first features to build, and the verification gates. |

## The rules that cause most rework

1. **Static UI data goes in `src/shared/json/`.** A `.ts` next to it may only add types or hydrate icon names. Record data (courses, scholarships, users, sessions…) comes **from the API** via a feature `data/<feature>Fetchers.ts` + `useCachedData` — there are no mock modules.
2. **No `if` / `else` chains.** Every branch is a field in the config. `resolveActiveTab`, `findRoute`, `getDashboardNavItem` all exist so nothing needs to branch.
3. **One value, written once.** Paths come from `NAV_TARGETS`, Arabic labels from `localization.json`, nav tabs from `shellNav.json`.
4. **A class string you repeat is a missing concept class.** Extract it into the owning CSS file — `src/features/<feature>/<feature>.css` (e.g. `auth.css`, `catalog.css`, `courses.css`, `dashboard.css`, `home.css`, `profile.css`) for one-feature classes, `src/styles/globals.css` for shared ones — inside `@layer components` (so JSX utilities can still override it), use `var(--shadow-elev-2)` / `var(--color-overlay-scrim)` / `var(--shadow-glow-gold)` instead of literals, and check the class actually exists. `@apply` accepts real utilities only — plain global helpers (`animate-fade-in-up`, `animation-delay-100`, `group`) stay in the JSX `className`.
5. **Motion comes from the Celestial Motion System only** (`khawarizm-motion`): `animate-pop-in` + staggered `animationDelay` for entrances, `SlidingSegmentedControl` for every side-by-side switch, `btn-attention` on at most one hero CTA per screen, and never hand-roll keyframes for shared motion.
6. **Center wide content wrappers** (`khawarizm-layout-edit`): a `w-full max-w-[1280px]` wrapper inside an `items-start` flex column needs `mx-auto`, or the whole page hugs the RTL start edge and leaves the far side empty — and trailing action rows follow the *tallest* column, so anchor them in the primary column with `hidden lg:flex` / `lg:hidden` mounts.
7. **One backend app per feature** (`khawarizm-backend`): the folder mirrors `frontend/src/features/<name>/`, camelCase happens **only** in `serializers.py`, views stay thin, filters are data (`features/catalog/filters.py`), every model is registered in `admin.py` because the database ships empty, and every feature ships a `tests.py` built on the shared kit (`features/common/testing.py`).
8. **Identity is Firebase, authority is ours** (`khawarizm-auth-and-sessions`): Firebase proves *who*; roles, sessions, and permissions live in Django. Two token types (HS256 access + rotating refresh stored hashed), one active `UserSession` per user, a per-device footprint, and a 401 that always carries a `code`.
9. **The backend env is the single source of truth** (`khawarizm-environment-and-deploy`): the SPA holds only `VITE_API_BASE_URL` and fetches public config from `GET /api/auth/config`. Never commit `.env.production` or a service account; a secret that touched git history must be rotated.

## Before you finish

Frontend:

```bash
cd frontend
npm run build      # tsc -b + vite build
npx eslint src
npm test           # vitest
```

Backend:

```bash
cd backend
source .venv/bin/activate
python manage.py check            # framework sanity
python manage.py makemigrations   # must print "No changes detected"
python manage.py migrate
python manage.py test             # every feature's tests must pass
```

Then verify **behavior**, not just types — print the old and new output for anything you refactored and confirm they match.

## Human-facing docs

These skills are the canonical source for agents. The polished, human-facing twins live in [`docs/`](../../docs/README.md) — start with [`docs/00-overview.md`](../../docs/00-overview.md), then the design system ([`docs/01-design-system.md`](../../docs/01-design-system.md)), architecture ([`docs/02-architecture.md`](../../docs/02-architecture.md)), routing ([`docs/03-routing-and-navigation.md`](../../docs/03-routing-and-navigation.md)), loading/caching/motion ([`docs/04-loading-caching-and-motion.md`](../../docs/04-loading-caching-and-motion.md)), the feature directory ([`docs/05-feature-directory.md`](../../docs/05-feature-directory.md)), the development guide ([`docs/06-development-guide.md`](../../docs/06-development-guide.md)), the backend contract ([`docs/07-backend-contract.md`](../../docs/07-backend-contract.md)), and backend architecture ([`docs/08-backend-architecture.md`](../../docs/08-backend-architecture.md)).
