---
name: khawarizm-navigation-cache
description: Master engineering playbook for professional routing, dual-tier celestial skeleton loading (page vs data-section), fluid page transitions, and in-memory SWR caching in Khawarizm Academy. Use whenever adding or refactoring pages, data boundaries, loading states, routes, or caching.
---

# Khawarizm Academy — Navigation, Dual-Tier Skeleton Loading & Caching Skill

This skill is the **definitive operational guide and standard** for building high-performance, professional navigation, loading states, and data caching across Khawarizm Academy.

> 📖 **Per-page workflow (8 steps):** read `references/page-loading-caching-guide.md` before touching any page.
> 📖 **Routes and URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) owns the route table, redirects, tabs, and query params.
> 📖 **Styling & concept classes:** [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) owns tokens, the class catalog, and the repeated-class-string rule (§3.7).

---

## 1. Core Mental Model & The 4 Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KHAWARIZM PLATFORM ENGINE                       │
├────────────────────────────────────────────────────────────────────────┤
│  1. ROUTING & SHELL   │ Persistent RootLayout + lazy route chunks      │
│                       │ (Navbars/Footers stay mounted, 0 remounts)     │
├───────────────────────┼────────────────────────────────────────────────┤
│  2. VIEW TRANSITIONS  │ Native View Transitions API (CSS themed)       │
│                       │ + .animate-page-enter fallback + scroll memory │
├───────────────────────┼────────────────────────────────────────────────┤
│  3. DUAL-TIER         │ Tier 1: PageSkeleton (Suspense, auto via       │
│     SKELETONS         │   skeletonVariant) Tier 2: DataSectionSkeleton │
├───────────────────────┼────────────────────────────────────────────────┤
│  4. CACHING & SWR     │ dataCacheManager + useCachedData + keepPrevious│
│                       │   Data (only the data section re-renders)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pillar 1: Dual-Tier Skeleton Loading System

**HARD RULE:** Never run a fake `setTimeout` skeleton. Skeleton = real loading trigger, one of two tiers.

### Tier 1: Full-Page Skeleton (`<PageSkeleton />`)
- **When to use:** Cold load / hard refresh / lazy route-chunk suspense.
- **How it's triggered — automatically.** Every route declares `skeletonVariant` in `src/app/routes.tsx`. `RootLayout` wraps `<Outlet />` in `<Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>` and each page is a `React.lazy` chunk in `src/app/pageLoads.ts`. Pages must **NOT** render `<PageSkeleton>` themselves and must **NOT** contain fake loading timers.
- **Components:** `<PageSkeleton variant="home" | "catalog" | "detail" | "default" />`.
- **Purpose:** Pre-renders full structure → **0 Cumulative Layout Shift (CLS)**.

### Tier 2: Data-Section Skeleton (`<DataSectionSkeleton />` / `<CatalogGridSkeleton />`)
- **When to use:** A data query is a true cold miss (never-fetched key).
- **Components:**
  - `<CatalogGridSkeleton count={6} />` for course/scholarship card grids.
  - `<DataSectionSkeleton variant="grid" | "rail" | "list" count={6} />` for generic dynamic sections.
- **Rule:** Surrounding controls (Navbars, Search, Sidebar, Active Pills, Footer) **stay mounted, visible, interactive**.
- **IMPORTANT:** Do NOT show Tier 2 skeleton on every filter change. Use `keepPreviousData: true` in `useCachedData` so the **previous cards stay mounted** while a new filter combination loads in the background (shimmer line only). The skeleton appears only on a genuine first load of that key.

### Atomic Skeleton Primitives (`src/shared/components/Loading/SkeletonPrimitives.tsx`)
- `<SkeletonBox className="w-48 h-8 rounded-lg" />`
- `<SkeletonText lines={2} lastLineWidth="70%" />`
- `<SkeletonCircle size={40} />`
- `<SkeletonBadge width="75px" />`

---

## 3. Pillar 2: Persistent Shell & 60fps Page Transitions

### Rule: Never Duplicate the App Shell in Page Views
Pages **must never** render `<DesktopNavbar>`, `<MobileHeader>`, `<MobileBottomBar>`, or `<Footer>`. The frame lives in `src/app/layouts/RootLayout.tsx`. Only the `<Outlet />` region changes.

### Page Transition Container (RootLayout)
```tsx
<div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
      <Outlet />
    </Suspense>
  </RouteErrorBoundary>
</div>
```
- `key={pathname}` → page remount only on *path* change; `?query` changes do **NOT** remount the page (data section re-renders alone).

### Native View Transitions (browser uses these when supported)
- `router.tsx` wraps page-change state updates in `document.startViewTransition` and sets `html[data-vt-enabled='true']` so CSS disables the `.animate-page-enter` fallback (no double animation).
- Themed `::view-transition-old(root)` / `::view-transition-new(root)` animations live in `src/styles/globals.css`.
- **Never add new JS animation libs** for page transitions — the CSS + View Transitions API is the standard.
- **Entrance fades use the concept class** `.animate-fade-in` (defined in `globals.css`) for modals, toasts, and data sections that mount after a cache hit. Check `references/design-tokens-and-classes.md` → *Animations* before typing an `animate-*` string — undefined classes render nothing.

### Smart Scroll Restoration (router.tsx)
- Cross-page navigation → smooth scroll to `(0, 0)`.
- Back/Forward → exact scroll restore from memory map.
- Query param updates → scroll position preserved.

### Accessibility
Add nothing that ignores `prefers-reduced-motion` — transitions and shimmer are already disabled globally in `globals.css`.

---

## 4. Pillar 3: In-Memory Caching & SWR (`useCachedData`) — "Only the data section updates"

### Mental Model: Stale-While-Revalidate + keepPreviousData
1. Check `dataCacheManager` synchronously.
2. Fresh & cached (< `staleTime`) → instant 0ms render, no skeleton.
3. Stale but cached → render cached data now, background refresh (`isFetching = true`, shimmer line).
4. Cache miss → **if `keepPreviousData`** render last data with shimmer; **else** `isLoading = true` → Tier 2 skeleton.
5. Error entry → `isError = true` → render themed retry block (never an endless spinner).

> **Implementation note (keepPreviousData internals):** `useCachedData` commits the last
> successful entry *inside the store-notification callback* (`dataCacheManager.subscribe`), never
> with a guarded `setState` during render. Calling `setState` in the render body — even guarded
> with an `Object.is` bail-out — loops under the React Compiler (`Too many re-renders`), so the
> previous-data memory must live in the subscription callback only.

### Usage in a Data Section (canonical pattern)
```tsx
import { useCachedData } from '../../../shared/hooks/useCachedData';

export const MyDataSection: React.FC<{ filters: MyFilters }> = ({ filters }) => {
  const { data, isLoading, isFetching, isError, error, refetch } = useCachedData(
    ['my-feature-key', filters],       // deterministic, full-filter key
    async () => fetchMyData(filters),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      keepPreviousData: true,
    }
  );

  if (isLoading) return <CatalogGridSkeleton count={6} />;
  if (isError) return <ErrorState message={error?.message} onRetry={refetch} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((item) => (
        <CourseCard key={item.id} course={item} layout="desktop" />
      ))}
    </div>
  );
};
```

### Cache API (`src/shared/lib/cacheManager.ts`)
- `dataCacheManager.set(key, data)` — optimistic update / mutation result.
- `dataCacheManager.invalidate('catalog-items')` — marks **every** `['catalog-items', …]` variant stale (namespace-token matching). Dashboard sections use the same pattern: `dataCacheManager.invalidate(['dashboard', '…'])` matches every dashboard section key.
- `dataCacheManager.prefetch(['catalog-detail', id], fetcher)` — warm cache on hover → instant detail navigation.
- **Dashboard keys are per-section, namespace-prefixed:** `['dashboard', 'stats']`, `['dashboard', 'upcoming-events']`, `['dashboard', 'courses-list']`, `['dashboard', 'competitions']`, `['dashboard', 'certificates']`, `['dashboard', 'saved-scholarships']`, `['dashboard', 'favorite-courses']`, `['dashboard', 'notifications-view']`, `['dashboard', 'notifications-drawer']`. Each holds its own data (mocks or `blogPosting` fetchers in `features/dashboard/data/dashboardFetchers.ts`).
- `dataCacheManager.clear()` — logout / hard reset.

---

## 5. Pillar 4: Declarative Route Registry

> 📖 **Full routing guide:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) — adding routes, redirects, tabs, query params, and URL debugging.

Routes are **data in JSON**, not JSX. `src/shared/json/routes.json` declares each path, and `src/app/routes.tsx` only adds the lazy component. A route renders a page **or** redirects, never both.

```json
// src/shared/json/routes.json
{ "path": "/", "title": "…", "activeTab": "home", "skeletonVariant": "home" }
{ "path": "/courses", "redirect": "/catalog?type=courses", "activeTab": "courses", "skeletonVariant": "catalog" }
{ "path": "/courses/:slug", "title": "…", "activeTab": "courses", "skeletonVariant": "detail" }
{ "path": "/dashboard", "title": "…", "immersive": true, "tabsByQuery": { "profile": "profile" }, "skeletonVariant": "dashboard" }
{ "path": "*", "title": "…", "skeletonVariant": "default" }
```

```ts
// src/app/routes.tsx — the only thing TS owns is the component per path
const PAGE_BY_PATH: Record<string, ComponentType> = {
  '/': HomePage, '/courses/:slug': CourseDetailPage, '*': NotFoundPage,
};
```

Lookups live in the same file: `findRoute(pathname)`, `matchRoute(pattern, pathname)`, `resolveActiveTab(pathname, search)`. Lazy loaders are in `src/app/pageLoads.ts` (one chunk per page).

### Routing rules
- **One canonical catalog URL:** `/catalog?type=courses|scholarships`. `/courses` & `/scholarships` **redirect** to it. Never register duplicate page routes for the same view.
- **Redirects are data:** a `redirect` field, never an inline `<Navigate />` component.
- **`skeletonVariant` drives Tier 1 automatically.** RootLayout reads it from the active route.
- **Placeholder policies:** tabs without a built page get a lazy `FeaturePlaceholder` page + a route — **never** a blank `Outlet`.
- `*` catch-all → `NotFoundPage` (never `null`), and it must be the **last** entry since `findRoute` returns the first match.
- Each page is wrapped by `RouteErrorBoundary` in RootLayout → a crash shows a themed error, shell stays alive.

### Hooks (from `src/app/routerContext.ts`)
```tsx
const { slug } = useParams<{ slug: string }>();
const [searchParams, setSearchParams] = useSearchParams();
const activeType = searchParams.get('type') || 'all';
setSearchParams({ type: 'courses', q: 'python' }); // replace, preserves scroll
const navigate = useNavigate();
const { pathname, search } = useLocation();
```

### URL is the single source of truth for view state
**Never** duplicate URL values (`?type=`, `?q=`) into `useState` + `useEffect`. Derive them at render (see `CatalogPage`): keep only the non-URL filters in state and merge:
```tsx
const filters: CatalogFiltersState = { ...persistentFilters, type: activeTab, searchQuery: qFromUrl };
```

---

## 6. Universal Blueprint for Building Any New Page

Walk through **`references/page-loading-caching-guide.md`** for the full 8-step flow. Summary:

1. **Register the lazy route** — chunk in `pageLoads.ts`, entry in `routes.json`, path in `PAGE_BY_PATH` (`routes.tsx`).
2. **Build the page view** as `<main className="content-container">` — no shell markup, no `<PageSkeleton>`, no fake timers.
3. **Derive URL-driven state** from `useSearchParams` / `useParams` at render; local `useState` only for the rest.
4. **Extract dynamic parts** into an isolated Data Section component.
5. **Wire `useCachedData`** with a deterministic full-filter key + `keepPreviousData` + error/retry + Tier 2 skeleton.
6. **Prefetch detail** on hover via `dataCacheManager.prefetch`.
7. **Verify build & lint**, then confirm: cold load skeletons once, cached returns are instant, filter changes never flash the skeleton, back/forward restores scroll.