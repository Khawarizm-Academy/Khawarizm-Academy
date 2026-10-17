# Khawarizm Academy — Loading, Caching & Routing Architecture Reference

Architecture, code contracts and design tokens for page loading, skeleton animations, route management, and in-memory SWR caching.

> Live conventions supersede this summary: [`khawarizm-navigation-cache`](../../khawarizm-navigation-cache/SKILL.md) + its `references/page-loading-caching-guide.md` own the enforced workflow, [`khawarizm-routing`](../../khawarizm-routing/SKILL.md) owns routes/URLs, and [`khawarizm-code-style`](../../khawarizm-code-style/SKILL.md) owns comment/branching rules.

---

## 1. Directory structure

```
src/
├── app/
│   ├── layouts/RootLayout.tsx      # Permanent shell: navbars, footer, atmosphere,
│   │                               #   Suspense Tier-1 skeleton, RouteErrorBoundary
│   ├── router.tsx                  # Router engine (Router, Outlet, view transitions, scroll memory)
│   ├── routerContext.ts            # Context + hooks (useNavigate, useLocation, useParams, useSearchParams)
│   ├── routes.tsx                  # PAGE_BY_PATH (path -> chunk) + findRoute / resolveActiveTab
│   ├── pageLoads.ts                # React.lazy per-page chunks (one chunk per page)
│   ├── Navigate.tsx                # Declarative redirect helper used by the redirect route variant
│   ├── RouteErrorBoundary.tsx      # Per-route error UI (shell stays alive)
│   └── pages/NotFoundPage.tsx      # Themed 404 (never blank)
├── shared/
│   ├── components/
│   │   ├── Loading/                # SkeletonPrimitives, PageSkeleton, DataSectionSkeleton
│   │   ├── Placeholder/FeaturePlaceholder.tsx
│   │   └── Detail/ItemDetailView.tsx          # Shared course/scholarship detail layout
│   ├── hooks/useCachedData.ts      # Universal SWR hook (useSyncExternalStore + keepPreviousData)
│   ├── json/                       # All static UI data: routes.json, shellNav.json, …
│   └── lib/cacheManager.ts         # In-memory SWR data cache engine
└── features/
    ├── catalog/
    │   ├── catalog.css                          # Feature-owned .catalog-* concept classes
    │   ├── components/states/CatalogGridSkeleton.tsx
    │   ├── components/layout/CatalogDataSection.tsx  # Isolated dynamic data boundary
    │   └── pages/CatalogPage.tsx                # Static controls + data boundary
    └── dashboard/
        ├── dashboard.css                        # Feature-owned .dash-* concept classes
        ├── components/                          # Views, hero cards, sidebar, drawers, chambers
        ├── pages/DashboardPage.tsx              # Self-contained workspace (?view= / ?state= demo modes)
        └── data/dashboardFetchers.ts            # Per-section mock/fetch functions
```

---

## 2. Design tokens for skeletons & transitions

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
- `.animate-page-enter` — CSS entrance fallback, **disabled when `html[data-vt-enabled='true']`**.
- `::view-transition-old(root)` / `::view-transition-new(root)` — native View Transitions theming.
- `@media (prefers-reduced-motion: reduce)` — kills transition + shimmer motion globally.

---

## 3. Dual-tier skeleton guidelines

| Tier | Component | Triggered when | What stays mounted |
| :--- | :--- | :--- | :--- |
| **Tier 1 (page)** | `<PageSkeleton variant="home" \| "catalog" \| "detail" \| "dashboard" \| "default" />` | Lazy-chunk suspense (cold visit). Automatic — no page code. | Global navbar & mobile bottom bar (in RootLayout) |
| **Tier 2 (data)** | `<DataSectionSkeleton />` / `<CatalogGridSkeleton />` | **True cache miss only.** Filter/search/tab/page changes use `keepPreviousData`. | Navbar, header, hero, search box, filter sidebar, footer |

Never render `<PageSkeleton>` inside a page and never gate loading on a `setTimeout`.

---

## 4. Cache management (`dataCacheManager` & `useCachedData`)

### Cache key conventions (deterministic arrays/objects)
- Single resource: `['course', courseId]`
- Query list: `['catalog-items', { type, field, level, page, q }]`
- Featured items: `['home-featured-courses']`
- Detail (prefetched on hover, read by the detail page): `['catalog-detail', slug]`
- Course player: `['course-detail', slug]`, `['course-problems', slug]`
- Dashboard (per-section, namespaced): `['dashboard', 'stats']`, `['dashboard', 'courses-list']`, `['dashboard', 'competitions']`, `['dashboard', 'saved-scholarships']`, `['dashboard', 'notifications-view']`, …

### Hook flags
- `isLoading` → true only on a true cold miss (render Tier 2 skeleton).
- `isFetching` → background revalidation / keepPreviousData swap (shimmer line only).
- `isError` / `error` / `refetch()` → themed retry block (never an endless spinner).
- `keepPreviousData: true` → previous cards stay mounted while a new key loads.

### Invalidation & prefetching
```ts
import { dataCacheManager } from '@/shared/lib/cacheManager';
dataCacheManager.invalidate(['catalog-items']);   // marks every catalog-items variant stale
dataCacheManager.prefetch(['catalog-detail', id], fetchDetail); // on card hover
dataCacheManager.clear();                          // logout
```

---

## 5. Navigation & persistent layout rules

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
2. **Never wrap a page view in `.page-wrapper`** — pages start with `<main className="content-container">`.
3. **Derive URL state from `useSearchParams` / `useParams`** at render — no `useState` + `useEffect` URL mirrors.
4. **One canonical catalog URL** — `/catalog?type=courses|scholarships`; `/courses` and `/scholarships` are `redirect` entries in `routes.json` (the router renders the redirect variant, which mounts `<Navigate to={redirect} replace />`).
5. **Placeholders instead of blank tabs** — unbuilt features use `FeaturePlaceholder`; `*` → `NotFoundPage`.
6. **Scroll restoration** — back/forward restores scroll; cross-page nav scrolls to `(0,0)`; query changes preserve scroll.

---

## 6. Project docs

Human-facing: [`docs/04-loading-caching-and-motion.md`](../../../../docs/04-loading-caching-and-motion.md) and [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md).
