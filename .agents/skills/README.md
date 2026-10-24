# Khawarizm Academy — Agent Skills

Thirteen skills. Read the one that matches what you are doing.

| Skill | Use it when |
| :--- | :--- |
| **[khawarizm-code-style](khawarizm-code-style/SKILL.md)** | Writing, reviewing, or refactoring **any** `.ts` / `.tsx` — and the same rules for backend `.py`. One-line comments, no if-chains, static data in JSON, no desktop/mobile duplication, repeated class strings → CSS, verification gates. |
| **[khawarizm-routing](khawarizm-routing/SKILL.md)** | Adding or changing a **route, path, redirect, nav tab, or query param** — or debugging a URL that renders the wrong thing. |
| **[khawarizm-navigation-cache](khawarizm-navigation-cache/SKILL.md)** | **Loading states, skeletons, caching, page transitions, scroll memory.** Read `references/page-loading-caching-guide.md` before touching a page. |
| **[khawarizm-frontend](khawarizm-frontend/SKILL.md)** | **Design system** — observatory tokens, Tailwind v4 concept classes (incl. `.auth-*`, `.catalog-*`, `.course-*`, `.dash-*`), repeated-class extraction (§3.7), component catalog, RTL rules, directory placement. |
| **[khawarizm-desktop-mobile-views](khawarizm-desktop-mobile-views/SKILL.md)** | **Splitting a page into Desktop and Mobile view components** — folder-per-component organization (`<Component>/Desktop…View.tsx` + `Mobile…View.tsx`), context or props for shared surface state, surface data records instead of `isMobile` branches. |
| **[khawarizm-organization-and-imports](khawarizm-organization-and-imports/SKILL.md)** | **Structuring feature `components/` folders and writing imports** — the category taxonomy (`layout`, `views`, `chrome`, `cards`, `hero`, `overlays`, `controls`, `states`, `filters`, `toolbar`) and the `@/` alias import rules (`@/` → `src/`, direct-file imports, extension rules). |
| **[khawarizm-page-builder](khawarizm-page-builder/SKILL.md)** | Building a **new page or feature end to end** — the 10-step protocol. |
| **[khawarizm-motion](khawarizm-motion/SKILL.md)** | **Animations & micro-interactions** — the Celestial Motion System: entrance cascades, hover lifts/tilts, sliding-puck switches (`SlidingSegmentedControl`), shine sweeps, `btn-attention` halos, countdowns, and their fill-mode caveats. |
| **[khawarizm-layout-edit](khawarizm-layout-edit/SKILL.md)** | **Fixing/editing existing pages** — content hugging one side, centering (`mx-auto`), two-column grids + sticky asides, actions pushed down by a taller column, slim top navigators, sticky offsets, CTA hierarchy, filling gaps. |
| **[khawarizm-backend](khawarizm-backend/SKILL.md)** | **Anything in the Django + DRF backend** — one app per feature, the camelCase JSON contract, thin views, data-over-branches filters, readable/editable models, the admin data editor, the shared testing kit, one-line comments, and the verification gate. |
| **[khawarizm-backend-feature](khawarizm-backend-feature/SKILL.md)** | **Adding a new backend feature end to end** — the 13-step scaffold: apps, models → serializers → views → urls → admin → settings + URL mounting → migrations → tests → README, and the verification gate. |
| **[khawarizm-env-config](khawarizm-env-config/SKILL.md)** | **Any env var, API key, provider credential, or settings.py value** — the three `.env*` profiles, the read rules (`os.environ` only ever in settings), the fail-loudly validation gates, the key inventory, and deployment keys (Vercel / host env). |
| **[khawarizm-videohosting](khawarizm-videohosting/SKILL.md)** | **Video hosting** — adding a provider (`providers/` registry, 3 steps), the ingest → FFmpeg → storage pipeline, HLS token-gated serving routes, stream tokens, and the Vercel packaging constraints. |

## The rules that cause most rework

1. **Static data goes in `src/shared/json/`.** A `.ts` next to it may only add types or hydrate icon names. Cross-feature record types live in `src/shared/types/entities.ts`.
2. **No `if` / `else` chains.** Every branch is a field in the config. `resolveActiveTab`, `findRoute`, `getDashboardNavItem` all exist so nothing needs to branch.
3. **One value, written once.** Paths come from `NAV_TARGETS`, Arabic labels from `localization.json`, nav tabs from `shellNav.json`.
4. **A class string you repeat is a missing concept class.** Extract it into the owning CSS file — `src/features/<feature>/<feature>.css` (e.g. `auth.css`, `catalog.css`, `courses.css`, `dashboard.css`, `home.css`, `profile.css`) for one-feature classes, `src/styles/globals.css` for shared ones — inside `@layer components` (so JSX utilities can still override it), use `var(--shadow-elev-2)` / `var(--color-overlay-scrim)` / `var(--shadow-glow-gold)` instead of literals, and check the class actually exists. `@apply` accepts real utilities only — plain global helpers (`animate-fade-in-up`, `animation-delay-100`, `group`) stay in the JSX `className`.
5. **Motion comes from the Celestial Motion System only** (`khawarizm-motion`): `animate-pop-in` + staggered `animationDelay` for entrances, `SlidingSegmentedControl` for every side-by-side switch, `btn-attention` on at most one hero CTA per screen, and never hand-roll keyframes for shared motion.
6. **Center wide content wrappers** (`khawarizm-layout-edit`): a `w-full max-w-[1280px]` wrapper inside an `items-start` flex column needs `mx-auto`, or the whole page hugs the RTL start edge and leaves the far side empty — and trailing action rows follow the *tallest* column, so anchor them in the primary column with `hidden lg:flex` / `lg:hidden` mounts.
7. **One backend app per feature** (`khawarizm-backend`): the folder mirrors `frontend/src/features/<name>/`, camelCase happens **only** in `serializers.py`, views stay thin, filters are data (`features/catalog/filters.py`), every model is registered in `admin.py` (the seed fills demo data — real content is managed there), and every feature ships a `tests.py` built on the shared kit (`features/common/testing.py`). Hang a new key off env → `settings.py`, never into feature code (`khawarizm-env-config`).

## Before you finish

Frontend:

```bash
cd frontend
npm run build      # tsc -b + vite build
npx eslint src
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
