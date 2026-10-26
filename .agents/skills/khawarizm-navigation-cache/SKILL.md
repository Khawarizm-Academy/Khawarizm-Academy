---
name: khawarizm-navigation-cache
description: Master engineering playbook for professional routing, dual-tier celestial skeleton loading (page vs data-section), fluid page transitions, and in-memory SWR caching in Khawarizm Academy. Use whenever adding or refactoring pages, data boundaries, loading states, routes, or caching.
---

# Khawarizm Academy — Navigation, Dual-Tier Skeleton Loading & Caching

The **definitive operational guide and standard** for high-performance navigation, loading states and data caching across Khawarizm Academy.

> 📖 **Per-page workflow (8 steps):** read [`references/page-loading-caching-guide.md`](references/page-loading-caching-guide.md) before touching any page.
> 📖 **Routes and URLs:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md) owns the route table, redirects, tabs and query params.
> 📖 **Styling & concept classes:** [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) owns tokens, the class catalog and the repeated-class-string rule (§3.7).

---

## 1. Core mental model — the 4 pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KHAWARIZM PLATFORM ENGINE                       │
├───────────────────────┬────────────────────────────────────────────────┤
│  1. ROUTING & SHELL   │ Persistent RootLayout + lazy route chunks      │
│                       │ (navbars/footer stay mounted, zero remounts)   │
├───────────────────────┼────────────────────────────────────────────────┤
│  2. VIEW TRANSITIONS  │ Native View Transitions API (CSS themed)       │
│                       │ + .animate-page-enter fallback + scroll memory │
├───────────────────────┼────────────────────────────────────────────────┤
│  3. DUAL-TIER         │ Tier 1: PageSkeleton (Suspense, auto via       │
│     SKELETONS         │   skeletonVariant). Tier 2: DataSectionSkeleton│
├───────────────────────┼────────────────────────────────────────────────┤
│  4. CACHING & SWR     │ dataCacheManager + useCachedData +             │
│                       │   keepPreviousData (only the data section      │
│                       │   re-renders)                                  │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

## 2. Pillar 1 — dual-tier skeleton loading

**HARD RULE:** never run a fake `setTimeout` skeleton. A skeleton is a real loading trigger, one of two tiers.

### Tier 1 — Full-page skeleton (`<PageSkeleton />`)
- **When:** cold load / hard refresh / lazy route-chunk suspense.
- **How it is triggered — automatically.** Every route declares `skeletonVariant` in `routes.json`. `RootLayout` wraps `<Outlet />` in `<Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>` and each page is a `React.lazy` chunk in `pageLoads.ts`. Pages must **not** render `<PageSkeleton>` themselves and must **not** contain fake loading timers.
- **Variants:** `"home" | "catalog" | "detail" | "dashboard" | "default"`.
- **Purpose:** pre-renders the full structure → **0 cumulative layout shift**.

### Tier 2 — Data-section skeleton (`<DataSectionSkeleton />` / `<CatalogGridSkeleton />` / `<CourseLandingSkeleton />`)
- **When:** a data query is a true cold miss (never-fetched key).
- **Components:** `<CatalogGridSkeleton count={6} />` for card grids, `<DataSectionSkeleton variant="grid" | "rail" | "list" count={6} />` for generic dynamic sections, and the course landing/player skeletons in `features/courses/components/states/`.
- **Rule:** surrounding controls (navbars, search, sidebar, active pills, footer) **stay mounted, visible and interactive**.
- **Important:** do **not** show a Tier 2 skeleton on every filter change. Use `keepPreviousData: true` so the previous cards stay mounted while the new filter combination loads in the background (shimmer line only). The skeleton appears only on a genuine first load of that key.

### Atomic skeleton primitives (`src/shared/components/Loading/SkeletonPrimitives.tsx`)
- `<SkeletonBox className="w-48 h-8 rounded-lg" />`
- `<SkeletonText lines={2} lastLineWidth="70%" />`
- `<SkeletonCircle size={40} />`
- `<SkeletonBadge width="75px" />`

---

## 3. Pillar 2 — persistent shell & 60fps page transitions

### Rule: never duplicate the app shell in a page view
Pages must **never** render `<DesktopNavbar>`, `<MobileHeader>`, `<MobileBottomBar>` or `<Footer>`. The frame lives in `src/app/layouts/RootLayout.tsx`; only the `<Outlet />` region changes.

### Page transition container (RootLayout)
```tsx
<div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
      <Outlet />
    </Suspense>
  </RouteErrorBoundary>
</div>
```
- `key={pathname}` → page remounts only on *path* change; `?query` changes do **not** remount the page (the data section re-renders alone).

### Native view transitions
- `router.tsx` wraps page-change state updates in `document.startViewTransition` and sets `html[data-vt-enabled='true']` so CSS disables the `.animate-page-enter` fallback (no double animation).
- Themed `::view-transition-old(root)` / `::view-transition-new(root)` animations live in `globals.css`.
- **Never add new JS animation libs** for page transitions — the CSS + View Transitions API is the standard.
- **Entrance fades use the concept class** `.animate-fade-in` (defined in `globals.css`) for modals, toasts and data sections that mount after a cache hit. Check [`references/design-tokens-and-classes.md`](../khawarizm-frontend/references/design-tokens-and-classes.md) → *Animations* before typing an `animate-*` string — undefined classes render nothing.

### Smart scroll restoration (`router.tsx`)
- Cross-page navigation → smooth scroll to `(0, 0)`.
- Back/forward → exact scroll restore from the memory map.
- Query-param updates → scroll position preserved.

### Accessibility
Add nothing that ignores `prefers-reduced-motion` — transitions and shimmer are already disabled globally in `globals.css`.

---

## 4. Pillar 3 — in-memory caching & SWR (`useCachedData`)

### Mental model: stale-while-revalidate + keepPreviousData
1. Check `dataCacheManager` synchronously.
2. Fresh & cached (< `staleTime`) → instant 0ms render, no skeleton.
3. Stale but cached → render cached data now, background refresh (`isFetching = true`, shimmer line).
4. Cache miss → **if `keepPreviousData`** render last data with shimmer; **else** `isLoading = true` → Tier 2 skeleton.
5. Error entry → `isError = true` → themed retry block (never an endless spinner).

> **Implementation note (keepPreviousData internals):** `useCachedData` commits the last successful entry *inside the store-notification callback* (`dataCacheManager.subscribe`), never with a guarded `setState` during render. Calling `setState` in the render body — even guarded with an `Object.is` bail-out — loops under the React Compiler (`Too many re-renders`), so the previous-data memory must live in the subscription callback only.

### Usage in a data section (canonical pattern)
```tsx
import { useCachedData } from '@/shared/hooks/useCachedData';

export const MyDataSection: React.FC<{ filters: MyFilters }> = ({ filters }) => {
  const { data, isLoading, isFetching, isError, error, refetch } = useCachedData(
    ['my-feature-key', filters],       // deterministic, full-filter key
    async () => fetchMyData(filters),
    { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000, keepPreviousData: true }
  );

  if (isLoading) return <CatalogGridSkeleton count={6} />;
  if (isError) return <StatePanel tone="danger" title="تعذّر التحميل" text={error?.message} onRetry={refetch} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((item) => <CourseCard key={item.id} course={item} layout="desktop" />)}
    </div>
  );
};
```

### Cache API (`src/shared/lib/cacheManager.ts`)
- `dataCacheManager.set(key, data)` — optimistic update / mutation result.
- `dataCacheManager.invalidate(['catalog-items'])` — marks **every** `['catalog-items', …]` variant stale (namespace-token matching). Dashboard sections use the same pattern: `dataCacheManager.invalidate(['dashboard', '…'])` matches every dashboard section key.
- `dataCacheManager.prefetch(['catalog-detail', id], fetcher)` — warm cache on hover → instant detail navigation.
- `dataCacheManager.clear()` — logout / hard reset.

### Key conventions
- **Catalog:** `['catalog-items', { type, field, level, page, q }]`, `['catalog-detail', slug]`.
- **Courses:** `['course-detail', slug]`, `['course-problems', slug]`.
- **Home:** `['home-featured-courses']`.
- **Dashboard (per-section, namespace-prefixed):** `['dashboard', 'stats']`, `['dashboard', 'upcoming-events']`, `['dashboard', 'courses-list']`, `['dashboard', 'competitions']`, `['dashboard', 'certificates']`, `['dashboard', 'saved-scholarships']`, `['dashboard', 'favorite-courses']`, `['dashboard', 'notifications-view']`, `['dashboard', 'notifications-drawer']` — each holds its own data (fetchers in `features/dashboard/data/dashboardFetchers.ts`).

---

## 5. Pillar 4 — declarative route registry

> 📖 **Full routing guide:** [`khawarizm-routing`](../khawarizm-routing/SKILL.md).

Routes are **data in JSON**, not JSX. `routes.json` declares each path; `routes.tsx` only adds the lazy component. A route renders a page **or** redirects, never both.

```json
{ "path": "/", "title": "…", "activeTab": "home", "skeletonVariant": "home" }
{ "path": "/courses", "redirect": "/catalog?type=courses", "activeTab": "courses", "skeletonVariant": "catalog" }
{ "path": "/courses/:slug", "title": "…", "activeTab": "courses", "skeletonVariant": "detail" }
{ "path": "/dashboard", "title": "…", "immersive": true, "tabsByQuery": { "profile": "profile" }, "skeletonVariant": "dashboard" }
{ "path": "*", "title": "…", "skeletonVariant": "default" }
```

```ts
// routes.tsx — the only thing TS owns is the component per path
const PAGE_BY_PATH: Record<string, ComponentType> = {
  '/': HomePage, '/courses/:slug': CourseLandingPage, '*': NotFoundPage,
};
```

Lookups live in the same file: `findRoute(pathname)`, `matchRoute(pattern, pathname)`, `resolveActiveTab(pathname, search)`. Lazy loaders are in `pageLoads.ts` (one chunk per page).

### Routing rules
- **One canonical catalog URL:** `/catalog?type=courses|scholarships`. `/courses` & `/scholarships` **redirect** to it. Never register duplicate page routes for the same view.
- **Redirects are data:** a `redirect` field, never an inline `<Navigate />` in the table.
- **`skeletonVariant` drives Tier 1 automatically.** `RootLayout` reads it from the active route.
- **Placeholder policy:** tabs without a built page get a lazy `FeaturePlaceholder` page + a route — **never** a blank `Outlet`.
- `*` catch-all → `NotFoundPage` (never `null`), and it must be the **last** entry since `findRoute` returns the first match.
- Each page is wrapped by `RouteErrorBoundary` in `RootLayout` → a crash shows a themed error, the shell stays alive.

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

## 6. Universal blueprint for building any new page

Walk through [`references/page-loading-caching-guide.md`](references/page-loading-caching-guide.md) for the full 8 steps. Summary:

1. **Register the lazy route** — chunk in `pageLoads.ts`, entry in `routes.json`, path in `PAGE_BY_PATH`.
2. **Build the page view** as `<main className="content-container">` — no shell markup, no `<PageSkeleton>`, no fake timers.
3. **Derive URL-driven state** from `useSearchParams` / `useParams` at render; local `useState` only for the rest.
4. **Extract dynamic parts** into an isolated data-section component.
5. **Wire `useCachedData`** with a deterministic full-filter key, `keepPreviousData`, error/retry (via `StatePanel`), and the Tier 2 skeleton.
6. **Prefetch detail** on hover via `dataCacheManager.prefetch`.
7. **Verify build & lint**, then confirm: cold load skeletons once, cached returns are instant, filter changes never flash the skeleton, back/forward restores scroll.

---

## 7. Project docs

Human-facing: [`docs/04-loading-caching-and-motion.md`](../../../docs/04-loading-caching-and-motion.md) · [`docs/03-routing-and-navigation.md`](../../../docs/03-routing-and-navigation.md).
