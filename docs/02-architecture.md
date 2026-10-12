# 02 · Architecture

This document describes how the frontend is layered, where every kind of file belongs, how imports are written, and how state and data flow through the app.

---

## 1. The three layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│  app/        wiring        router, route table, layouts, app-level pages  │
├──────────────────────────────────────────────────────────────────────────┤
│  features/   product       one self-contained folder per product feature  │
├──────────────────────────────────────────────────────────────────────────┤
│  shared/     foundations   components, hooks, lib, json, mocks, types     │
└──────────────────────────────────────────────────────────────────────────┘
```

- **`app/`** owns how the app is assembled: the custom router, the declarative route table, the persistent shell, and the two app-level pages (404, error boundary).
- **`features/`** owns what the product does. A feature is a folder with its own pages, components, context, data, styles, and README.
- **`shared/`** owns the reusable building blocks. Anything used by **two or more** features lives here.

**The dependency direction is one-way:** `app → features → shared`. Shared never imports from a feature, and a feature never imports from another feature.

---

## 2. Frontend directory map

```text
frontend/src/
├── main.tsx                     createRoot + StrictMode
├── App.tsx                      <Router><RootLayout/></Router>
├── index.css                    @import "./styles/globals.css"
├── app/
│   ├── router.tsx               navigation engine, scroll memory, view transitions
│   ├── routes.tsx               route model, PAGE_BY_PATH, lookups
│   ├── routerContext.ts         RouterContext + useRouter/useNavigate/… hooks
│   ├── pageLoads.ts             one React.lazy chunk per page
│   ├── Navigate.tsx             declarative redirect component
│   ├── RouteErrorBoundary.tsx   per-page error boundary
│   ├── layouts/RootLayout.tsx   persistent shell + Suspense + transition wrapper
│   └── pages/NotFoundPage.tsx   the `*` catch-all
├── features/
│   ├── home/        (+ README.md)
│   ├── catalog/     (+ README.md)
│   ├── courses/     (+ README.md)
│   ├── dashboard/   (+ README.md)
│   ├── auth/        (+ README.md)
│   ├── profile/     (+ README.md)
│   ├── events/      (+ README.md)
│   ├── competitions/(+ README.md)
│   └── scholarships/(+ README.md)
├── shared/
│   ├── components/  Artwork, Banners, BottomNav, Cards, Controls, Detail,
│   │                Events, Footer, Form, Loading, Navbar, Placeholder,
│   │                Search, State
│   ├── hooks/       useCachedData, useCountdown, useHorizontalScroll
│   ├── lib/         cacheManager, localization, navigation
│   ├── json/        all static configuration + mock data
│   ├── mocks/       typed JSON wrappers (types + casts) + barrel
│   └── types/       entities.ts (domain interfaces)
├── styles/
│   ├── tokens.css   @theme tokens + :root variables
│   └── globals.css  base, shared concept classes, keyframes; imports feature CSS
├── assets/brand/    source/ + generated/
└── scripts/         generate-brand-assets.mjs
```

---

## 3. Placement matrix — where every file goes

| What you are adding | Where it lives | Pattern / example |
| :--- | :--- | :--- |
| Shared component (2+ features) | `src/shared/components/<Category>/` | `Cards/CourseCard.tsx`, `Search/SmartSearchBox.tsx` |
| Feature component (1 feature) | `src/features/<feature>/components/<category>/` | `dashboard/components/cards/PriorityContinueCard.tsx` |
| Component with Desktop + Mobile views | `src/features/<feature>/components/views/<Component>/` | `views/LoginView/DesktopLoginView.tsx` |
| Page state shared per surface | `src/features/<feature>/context/` | `authLoginContext.ts` + `AuthLoginProvider.tsx` |
| Page view | `src/features/<feature>/pages/` | `<Feature>Page.tsx` |
| Feature view types | `src/features/<feature>/types.ts` | `CatalogTab`, `LearningLevel` |
| Shared entity types | `src/shared/types/entities.ts` | `Course`, `Scholarship` |
| Shared hook | `src/shared/hooks/` | `useCachedData.ts` |
| Feature hook | `src/features/<feature>/hooks/` | `useLiveCountdown.ts` |
| Feature data (non-JSON) | `src/features/<feature>/data/` | `dashboardFetchers.ts`, `playerPanels.ts` |
| Feature styles | `src/features/<feature>/<feature>.css` | `auth.css` — imported by `globals.css` only |
| Static data | `src/shared/json/` | `routes.json`, `catalog.json` |
| Hydrated mock modules | `src/shared/mocks/` | `catalog.ts` (types + JSON casts) |
| Shared lib / helpers | `src/shared/lib/` | `navigation.ts`, `localization.ts` |
| Tokens + shared styles | `src/styles/` | `tokens.css`, `globals.css` |
| Routes & root app | `src/app/` | `router.tsx`, `routes.tsx`, `layouts/`, `pages/` |
| Brand assets | `src/assets/brand/` | `source/`, `generated/` |

---

## 4. Feature component taxonomy

Every file under `features/<feature>/components/` sits in **one lowercase plural category folder** that says what the component is *for*. A feature only creates the categories it uses.

| Folder | What lives there | Examples |
| :--- | :--- | :--- |
| `layout/` | Page composition roots, shells, data-boundary sections | `DashboardShell`, `CatalogDataSection`, `HomeContent`, `TwinPillarRails` |
| `views/` | Render-complete page surfaces; surface-pair folders go inside | `EnrolledCoursesView`, `views/LoginView/DesktopLoginView.tsx` |
| `chrome/` | Navigation and page furniture — bars, sidebars, sub-nav, rails | `DesktopDashboardSidebar`, `AuthTopBar`, `QuickAccessRail` |
| `cards/` | Cards, card rows, list items, sub-visuals | `CatalogCard`, `EnrolledCourseRow`, `NotificationListItem`, `RadialProgressRing` |
| `hero/` | Hero banners and artwork panels | `CatalogHero`, `AuthHeroPanel`, `ProfileHero` |
| `overlays/` | Modals, drawers, toasts | `CourseWorkspaceModal`, `NotificationsDrawer`, `AuthToast` |
| `controls/` | Inputs, buttons, switches, toggles, action rows | `AuthModeSwitch`, `FieldText`, `ToggleSwitch` |
| `states/` | Skeletons and empty/error states | `CatalogGridSkeleton`, `EmptyDashboardState` |
| `filters/` | Filter and sort panels (any surface) | `CatalogFilterSidebar`, `CatalogFilterGroups` |
| `toolbar/` | Toolbar and pagination strips | `CatalogToolbar`, `CatalogPagination` |

> Do not invent a new category name for a lone file — place it in the closest existing bucket.

---

## 5. The Desktop/Mobile split

When a page genuinely needs **different markup** on `lg+` and below, it is split into two view components inside **one folder named after the component, under `views/`**:

```
features/<feature>/components/views/<ComponentName>/
├── Desktop<ComponentName>View.tsx
└── Mobile<ComponentName>View.tsx
```

- The **page** becomes a thin orchestrator: mount the provider, render both views as siblings, mount the shared overlays.
- The **views** hold only surface-specific layout and read shared state from context.
- **Shared chrome** (top bar, legal notice, active-card selector) stays a flat single-file component beside the views folder; surface differences are a `Record<Surface, …>`, never an `if (isMobile)` branch.
- **Shared overlays** return `null` when hidden.

Share page state with a **context provider + hook** when three or more consumers would otherwise prop-drill:

```
features/<feature>/context/
├── <feature><Area>Context.ts     # createContext + type + use<Feature><Area>() hook
└── <Feature><Area>Provider.tsx   # the component that owns the state
```

Two files because `react-refresh/only-export-components` fails when one file exports both a component and a hook. The hook throws if used outside its provider.

When only the two views consume two or three values, plain props from the page are fine.

---

## 6. Import rules

`@/` maps to `frontend/src/` (declared once in `vite.config.ts` `resolve.alias` and `tsconfig.app.json` `paths`). **Every internal import uses it; relative `../../../` chains are banned.**

```ts
// BAD — depth noise
import { DashboardTopBar } from '../../../shared/components/chrome/DashboardTopBar';

// GOOD — self-locating from anywhere
import { DashboardTopBar } from '@/features/dashboard/components/chrome/DashboardTopBar';
import { toArabic } from '@/shared/lib/localization';
```

1. **Direct file paths, no barrels.** Import a component from its exact file. One exception: `@/shared/mocks` keeps its `index.ts` barrel.
2. **`.ts` / `.tsx` extensionless**; **`.json` and `.css` keep the extension** (`@/shared/json/catalog.json`).
3. **Types use `import type`** — the repo runs `verbatimModuleSyntax`:
   ```ts
   import type { CatalogItem } from '@/shared/mocks/catalog';
   import { CatalogCard, type CatalogCardProps } from '@/features/catalog/components/cards/CatalogCard';
   ```
4. **External packages stay bare** (`import { Trophy } from 'lucide-react'`).

---

## 7. State management

There is deliberately no global store. State is placed by scope:

| Kind of state | Where it lives | Example |
| :--- | :--- | :--- |
| **View state that must be shareable** | the URL (`?type=`, `?q=`, `?view=`, `?mode=`) — derived at render | Catalog tab, dashboard view, login mode |
| **Local interactive UI** | `useState` in the component | filter drawer open, search overlay open |
| **Page-wide state shared across surfaces** | a feature context provider | `CatalogProvider`, `DashboardProvider`, `CoursePlayerProvider` |
| **Async/server data** | the in-memory SWR cache via `useCachedData` | catalog items, course detail, dashboard sections |
| **Non-React imperative state** | a module singleton + `useSyncExternalStore` | `videoPlayerStore` |

**Rule:** never copy a URL value into `useState` and sync it back with `useEffect`. Derive it at render and keep only non-URL state local.

---

## 8. Data flow

Static configuration is JSON in `src/shared/json/`. JSON cannot hold a component or a type, so a **`.ts` file next to the JSON hydrates it**: it may import the JSON, add a type or cast, and turn names into components — nothing else.

```
shared/json/routes.json      ──►  app/routes.tsx            path → component
shared/json/shellNav.json    ──►  shared/lib/navigation.ts  NAV_TARGETS + tabs
shared/json/dashboardNav.json──►  shared/lib/navigation.ts  dashboard nav items
shared/json/localization.json──►  shared/lib/localization.ts EN→AR dictionaries
shared/json/*.json           ──►  shared/mocks/*.ts          typed mock modules
```

Data access happens through **fetchers** (feature `data/` or shared mocks) wrapped by `useCachedData`, which reads/writes the singleton `dataCacheManager`. See [04 · Loading, Caching & Motion](04-loading-caching-and-motion.md).

---

## 9. Routing at a glance

The URL pipeline is four files with one job each:

| File | Job |
| :--- | :--- |
| `shared/json/routes.json` | What each path **is** (path, redirect, title, tab, shell flags, skeleton variant). |
| `app/routes.tsx` | Which **component** renders it (`PAGE_BY_PATH`) + lookups. |
| `app/router.tsx` | How the URL **changes** (navigate, history, scroll memory, transitions). |
| `app/pageLoads.ts` | The **lazy chunk** per page. |

Full details — adding routes, redirects, tabs, and query params — are in [03 · Routing & Navigation](03-routing-and-navigation.md).

---

## 10. Styling architecture

```
index.css
└── @import "tailwindcss"
└── @import "./tokens.css"     design tokens (@theme + :root)
└── @import <each feature>.css feature-scoped concept classes
└── globals.css body          base, shared concept classes, keyframes
```

There is exactly **one stylesheet entry point**. A feature CSS is never imported from a `.tsx`. Shared concepts (2+ features) live in `globals.css`; feature concepts live beside the feature's components.

---

## 11. Anti-duplication rules

1. **One source of truth.** A path, Arabic label, icon choice, filter option, footer link, status label, or class string exists once and is imported everywhere else.
2. **Data over branches.** Replace `if`/`else`/`switch` chains with records and config fields.
3. **One component, two surfaces.** Desktop/mobile differences are data or CSS, never a JS branch.
4. **Casts at the boundary.** Cast JSON once with a named type at the boundary — never sprinkle `as` through components.
5. **Real JSON booleans.** `"false"` is truthy; write `false`.
6. **Fail loudly.** Unknown icon names, missing required route fields, and half-defined routes throw at build/runtime instead of rendering wrong.
