# Khawarizm Academy — Loading, Caching & Routing Architecture Reference Guide

This reference document details the architecture, code contracts, and design tokens for page loading, skeleton animations, route management, and in-memory SWR caching in Khawarizm Academy.

> Live conventions supersede this summary: see `.agents/skills/khawarizm-navigation-cache/` (SKILL.md + `references/page-loading-caching-guide.md`) for the enforced workflow, `.agents/skills/khawarizm-routing/` for routes and URLs, and `.agents/skills/khawarizm-code-style/` for comment and branching rules.

---

## 1. Directory Structure

```
src/
├── app/
│   ├── layouts/
│   │   └── RootLayout.tsx          # Permanent shell: Navbars, Footer, Atmosphere,
│   │                               #   Suspense Tier-1 skeleton, RouteErrorBoundary
│   ├── router.tsx                  # Core router engine (Router, Outlet, VT, scroll memory)
│   ├── routerContext.ts            # Context + hooks (useNavigate, useLocation, useParams, useSearchParams)
│   ├── routes.tsx                  # PAGE_BY_PATH (path -> chunk) + findRoute / resolveActiveTab
│   ├── pageLoads.ts                # React.lazy per-page chunks (code splitting)
│   ├── Navigate.tsx                # Declarative canonical-URL redirect helper
│   ├── RouteErrorBoundary.tsx      # Per-route error UI (shell stays alive)
│   └── pages/NotFoundPage.tsx      # Themed 404 (never blank)
├── shared/
│   ├── components/
│   │   ├── Loading/                # SkeletonPrimitives, PageSkeleton, DataSectionSkeleton
│   │   ├── Placeholder/FeaturePlaceholder.tsx  # Under-construction pages
│   │   └── Detail/ItemDetailView.tsx           # Shared course/scholarship detail layout
│   ├── hooks/useCachedData.ts      # Universal SWR hook (useSyncExternalStore + keepPreviousData)
│   ├── json/                       # All static data: routes.json, shellNav.json, catalog.json, mocks…
│   └── lib/cacheManager.ts         # In-memory SWR data cache engine
└── features/
    └── catalog/
        ├── components/CatalogGridSkeleton.tsx # 6-Card high-fidelity grid skeleton
        ├── components/CatalogDataSection.tsx  # Isolated dynamic data boundary
        └── pages/CatalogPage.tsx   # Page view: static controls + data boundary
```

## 2. Design Tokens for Skeletons & Transitions

`src/styles/tokens.css`:
```css
--skeleton-base: #061A3A;
--skeleton-surface: #092557;
--skeleton-border: #1B3F80;
--skeleton-highlight-cyan: rgba(41, 169, 255, 0.12);
--skeleton-highlight-gold: rgba(229, 182, 92, 0.10);
--transition-page-duration: 220ms;
--transition-page-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

`src/styles/globals.css`:
- `@keyframes skeleton-celestial-shimmer` — starlight sweep.
- `.skeleton-box` / `.skeleton-card` / `.skeleton-text` / `.skeleton-badge` / `.skeleton-circle`.
- `.animate-page-enter` — CSS-entrance fallback, **disabled when `html[data-vt-enabled='true']`**.
- `::view-transition-old(root)` / `::view-transition-new(root)` — Native View Transitions theming.
- `@media (prefers-reduced-motion: reduce)` — kills transition + shimmer motion globally.

## 3. Dual-Tier Skeleton Guidelines

| Tier | Component | Triggered When | What Stays Mounted? |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Page)** | `<PageSkeleton variant="home" \| "catalog" \| "detail" \| "default" />` | Lazy chunk suspense (cold visit). Automatic — no page code involved. | Global Navbar & Mobile Bottom Bar (in RootLayout) |
| **Tier 2 (Data)** | `<DataSectionSkeleton/>` / `<CatalogGridSkeleton/>` | **True cache miss only.** Filter/search/tab/page changes use `keepPreviousData`. | Navbar, Header, Hero, Search Box, Filter Sidebar, Footer |

Never render `<PageSkeleton>` inside a page and never gate loading on a `setTimeout`.

## 4. Cache Management (`dataCacheManager` & `useCachedData`)

### Cache Key Conventions (deterministic arrays/objects)
- Single resource: `['course', courseId]`
- Query list: `['catalog-items', { type, field, level, page, q }]`
- Featured items: `['home-featured-courses']`
- Detail (prefetched on hover + read by detail page): `['catalog-detail', slug]`

### Hook Flags
- `isLoading` → true only on a true cold miss (render Tier 2 skeleton).
- `isFetching` → background revalidation / keepPreviousData swap (shimmer line only).
- `isError` `error` `refetch()` → themed retry block (never an endless spinner).
- `keepPreviousData: true` → previous cards stay mounted while a new key loads.

### Invalidation & Prefetching
```ts
import { dataCacheManager } from 'src/shared/lib/cacheManager';
dataCacheManager.invalidate(['catalog-items']);   // marks every catalog-items variant stale
dataCacheManager.prefetch(['catalog-detail', id], fetchDetail); // on card hover
dataCacheManager.clear();                          // logout
```

## 5. Navigation & Persistent Layout Rules

1. **RootLayout owns all shared chrome** and wraps the page in:
   ```tsx
   <div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
     <RouteErrorBoundary>
       <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
         <Outlet />
       </Suspense>
     </RouteErrorBoundary>
   </div>
   ```
2. **Never wrap page views in `.page-wrapper`** — pages start with `<main className="content-container">`.
3. **Derive URL state from `useSearchParams` / `useParams`** at render — no `useState` + `useEffect` URL mirrors.
4. **One canonical catalog URL** — `/catalog?type=courses|scholarships`; `/courses` & `/scholarships` redirect via `<Navigate/>`.
5. **Placeholders instead of blank tabs** — unbuilt features use `FeaturePlaceholder`; `*` → `NotFoundPage`.
6. **Scroll Restoration** — Back/Forward restores scroll; cross-page nav scrolls to `(0,0)`; query changes preserve scroll.