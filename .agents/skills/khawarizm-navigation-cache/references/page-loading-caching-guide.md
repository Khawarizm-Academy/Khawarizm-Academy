# Khawarizm Academy — Page Loading, Caching & Routing: 8-Step Application Guide

The universal run-book for applying the routing / dual-tier skeleton / caching / transition system to **any** page. Follow it every time you create or refactor a page, listing which future or placeholder pages still need to be wired.

---

## Step 0 — Locate the touch points

| Concern | File |
| :--- | :--- |
| Route registry (declarative) | `frontend/src/app/routes.tsx` |
| Lazy page loaders (one chunk per page) | `frontend/src/app/pageLoads.ts` |
| Persistent shell + Suspense skeleton + error boundary | `frontend/src/app/layouts/RootLayout.tsx` |
| Router engine (scroll memory, View Transitions) | `frontend/src/app/router.tsx` |
| Hooks | `frontend/src/app/routerContext.ts` |
| Tier 1 / Tier 2 / primitives | `frontend/src/shared/components/Loading/*` |
| In-memory SWR cache | `frontend/src/shared/lib/cacheManager.ts` |
| SWR hook (+ `keepPreviousData`) | `frontend/src/shared/hooks/useCachedData.ts` |
| Transition / skeleton / reduced-motion CSS | `frontend/src/styles/globals.css` |

---

## Step 1 — Register the lazy route

1. Add a lazy loader to `pageLoads.ts`:
   ```ts
   export const MyPage = lazy(() => import('../features/my-feature/pages/MyPage').then((m) => ({ default: m.MyPage })));
   ```
2. Add the route in `routes.tsx` with `meta.title` (Arabic), `meta.activeTab`, and `skeletonVariant`:
   ```tsx
   {
     path: '/my-path',
     component: MyPage,
     meta: { title: '… — أكاديمية خوارزم', activeTab: 'myfeature' },
     skeletonVariant: 'default', // 'home' | 'catalog' | 'detail' | 'default'
   }
   ```
3. If the URL is a duplicate of another canonical path → use `component: () => <Navigate to="/canonical?…" />`.
4. If the feature isn't built yet → a tiny page that renders `<FeaturePlaceholder title description …/>` from `shared/components/Placeholder/FeaturePlaceholder.tsx`.

> Rules: `*` catch-all → `NotFoundPage`, never `null`. No two routes render the same page view.

## Step 2 — Build the page view without a shell

```tsx
export const MyPage: React.FC = () => {
  return <main className="content-container">{/* page content */}</main>;
};
```
- **No** `<DesktopNavbar>` / `<Footer>` / `<MobileBottomBar>` / `<MobileHeader>`.
- **No** `<PageSkeleton>` inside the page — Tier 1 is automatic via Suspense.
- **No** fake `setTimeout` loading timers — never. Skeleton is driven by chunk suspense + data loading.

## Step 3 — Derive URL-driven state at render (no effect-sync)

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeType = searchParams.get('type') || 'all'; // derived, no useState
```
- Only persist the parts that aren't in the URL (e.g. `filter.field`, `page`).
- Merge at render: `const viewState = { ...localState, type: activeType, q: queryFromUrl }`.
- Use `setSearchParams({...})` to change URL-backed state — it replaces and preserves scroll.
- **Never** mirror URL values into `useState` + `useEffect` (lint blocks it; it causes stale closure + double renders).

## Step 4 — Isolate the dynamic data boundary

- Static controls (titles, search box, filter sidebar, toolbar) stay in the page.
- The dynamic cards/list/countdown go into their own component: `features/<feature>/components/MyDataSection.tsx`.

## Step 5 — Wire `useCachedData` in the data section

```tsx
const cacheKey = ['my-feature-key', { ...all filter fields, page }]; // deterministic
const { data, isLoading, isFetching, isError, error, refetch } = useCachedData<MyResult>(cacheKey, fetcher, {
  staleTime: 5 * 60 * 1000,
  cacheTime: 30 * 60 * 1000,
  keepPreviousData: true,          // ← old cards stay mounted on filter change
});
```
Render order: `isLoading` → Tier 2 skeleton → `isError` → retry block → `data` empty → empty state → grid.

## Step 6 — Warm the detail page (prefetch on hover)

```tsx
<MyCard
  onSelect={…}
  onPrefetch={() => dataCacheManager.prefetch(['my-detail', id], async () => item)}
/>
```
The detail route reads the **same** key via `useCachedData(['my-detail', slug], …)` → instant navigation.

## Step 7 — Handle loading / error / empty / reduced-motion

- Loading: Tier 2 skeleton only on a true cold miss.
- Error: themed glass panel + `refetch()` retry — never an infinite skeleton.
- Empty: search-empty-state with a `onResetFilters` affordance.
- Respect `prefers-reduced-motion` (already global in `globals.css`; don't add motion that ignores it).

## Step 8 — Verify

```bash
cd frontend && npm run build && npm run lint
```
Manual checklist:
- [ ] Cold visit to the route → Tier 1 `PageSkeleton` (matching variant) once, then content.
- [ ] Navigating back to a visited route → content instant (cached), no skeleton.
- [ ] Filter / search / pagination changes → only the data section re-renders; no page remount; previous cards stay while shimmering.
- [ ] Back/Forward restores scroll; cross-page nav scrolls to top.
- [ ] Unknown URL → 404 page; broken tab → placeholder page (never blank).
- [ ] `prefers-reduced-motion: reduce` → no page-transition / shimmer motion.