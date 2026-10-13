# Khawarizm Academy — Frontend

The React + TypeScript + Vite application for Khawarizm Academy: an Arabic-first (RTL) platform for courses and international scholarships, built on the *Observatory & Cyber-Intelligence* design system.

> Product and design documentation live in [`../docs/`](../docs/README.md). Agent playbooks live in [`../.agents/skills/`](../.agents/skills/README.md).

---

## Stack

| Concern | Choice |
| :--- | :--- |
| Framework | React 19 (React Compiler enabled) |
| Language | TypeScript — strict, `verbatimModuleSyntax` |
| Build | Vite |
| Styling | Tailwind CSS v4 (`@theme` tokens) + plain-CSS concept classes |
| Routing | A custom, data-driven router in `src/app/` (no router library) |
| Icons | lucide-react exclusively |
| Data | In-memory SWR cache (`useCachedData` + `dataCacheManager`) over REST fetchers |
| Localization | English internal keys + Arabic dictionary (`shared/json/localization.json`) |

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build — `tsc -b` then `vite build` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run brand:generate` | Regenerate brand icons, favicons, and OG image from the source logo |

### Environment

`.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

The app is fully API-driven and needs the Django backend running. Every feature fetcher calls the API through `shared/lib/apiClient.ts`; components only ever read the cache. See [`../docs/07-backend-contract.md`](../docs/07-backend-contract.md).

---

## Project structure

```text
src/
├── main.tsx                 createRoot + StrictMode
├── App.tsx                  <Router><RootLayout/></Router>
├── index.css                @import "./styles/globals.css"
├── app/                     router, route table, layouts, app-level pages
├── features/                one folder per feature (+ its README)
├── shared/                  components, hooks, lib, json, types
├── styles/                  tokens.css + globals.css
├── assets/brand/            source/ + generated/
└── scripts/                 brand asset generation
```

**Three layers, one-way dependencies:** `app → features → shared`. A feature never imports from another feature; anything used twice moves to `shared/`.

---

## Conventions

- **`@/` alias.** `@/` maps to `src/`. Every internal import uses it — relative `../../../` chains are banned. Direct file paths (no barrels); `.ts`/`.tsx` extensionless, `.json`/`.css` keep their extension; types use `import type`.
- **Component folders.** Feature components sit in a purpose folder: `layout/`, `views/`, `chrome/`, `cards/`, `hero/`, `overlays/`, `controls/`, `states/`, `filters/`, `toolbar/`.
- **Desktop/Mobile split.** A component with different markup per surface lives in `views/<ComponentName>/` as `Desktop<ComponentName>View.tsx` + `Mobile<ComponentName>View.tsx`, sharing state via a context provider + hook.
- **Data over branches.** Configuration lives in `src/shared/json/`; components look it up rather than chaining `if`/`else`.
- **Concept classes.** A utility run repeated twice for the same kind of element becomes a short CSS class — feature-owned for one feature, `globals.css` for two or more.
- **RTL-native.** Logical properties everywhere; in RTL flex, child #1 renders on the right.
- **URL is the source of truth** for view state (`?type=`, `?q=`, `?view=`, `?mode=`).

---

## Adding a page (summary)

1. Lazy chunk in `src/app/pageLoads.ts`.
2. Route entry in `src/shared/json/routes.json` (path, title, `activeTab`, `skeletonVariant`, optional `hideShell` / `immersive` / `tabsByQuery`).
3. Path → component in `src/app/routes.tsx` `PAGE_BY_PATH`.
4. Build the page as `<main className="content-container">` — no shell, no `<PageSkeleton>`, no fake timers.

Full workflow: [`../docs/06-development-guide.md`](../docs/06-development-guide.md).

---

## Verification

```bash
npm run build      # tsc -b + vite build — must be clean
npx eslint src     # must be clean
```

Then verify behavior: cold loads skeleton once, cached returns are instant, filter changes never flash the skeleton, back/forward restores scroll.

---

## Documentation map

- Product & pillars — [`../docs/00-overview.md`](../docs/00-overview.md)
- Design system — [`../docs/01-design-system.md`](../docs/01-design-system.md)
- Architecture — [`../docs/02-architecture.md`](../docs/02-architecture.md)
- Routing — [`../docs/03-routing-and-navigation.md`](../docs/03-routing-and-navigation.md)
- Loading, caching & motion — [`../docs/04-loading-caching-and-motion.md`](../docs/04-loading-caching-and-motion.md)
- Features — [`../docs/05-feature-directory.md`](../docs/05-feature-directory.md)
- Development guide — [`../docs/06-development-guide.md`](../docs/06-development-guide.md)
- Backend contract — [`../docs/07-backend-contract.md`](../docs/07-backend-contract.md)
