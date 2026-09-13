---
name: khawarizm-navigation-cache
description: Master engineering playbook for professional routing, dual-tier celestial skeleton loading (page vs data-section), fluid page transitions, and in-memory SWR caching in Khawarizm Academy. Use whenever adding or refactoring pages, data boundaries, loading states, routes, or caching.
---

# Khawarizm Academy — Navigation, Dual-Tier Skeleton Loading & Caching Skill

This skill is the **definitive operational guide and standard** for building high-performance, professional navigation, loading states, and data caching across Khawarizm Academy.

---

## 1. Core Mental Model & The 4 Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KHAWARIZM PLATFORM ENGINE                       │
├────────────────────────────────────────────────────────────────────────┤
│  1. ROUTING & SHELL   │ Persistent RootLayout (Navbars/Footers stay    │
│                       │ mounted, 0 flicker, 0 unneeded remounts)       │
├───────────────────────┼────────────────────────────────────────────────┤
│  2. VIEW TRANSITIONS  │ Native View Transitions API + 60fps CSS        │
│                       │ .animate-page-enter with smart scroll memory   │
├───────────────────────┼────────────────────────────────────────────────┤
│  3. DUAL-TIER         │ Tier 1: PageSkeleton (cold load / suspense)    │
│     SKELETONS         │ Tier 2: DataSectionSkeleton (filter/tab/page)  │
├───────────────────────┼────────────────────────────────────────────────┤
│  4. CACHING & SWR     │ In-memory dataCacheManager + useCachedData     │
│                       │ (Instant 0ms cached re-render, background SWR) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pillar 1: Dual-Tier Skeleton Loading System

Never use a full-page spinner when the user is simply filtering, paginating, or searching data. Always distinguish between **entering a new screen** vs **filtering data inside an existing screen**:

### Tier 1: Full-Page Skeleton (`<PageSkeleton />`)
- **When to use:** Cold page load (first visit), hard refresh, or lazy route code-splitting suspense.
- **Components:** `<PageSkeleton variant="home" | "catalog" | "detail" | "default" />` from `src/shared/components/Loading/PageSkeleton.tsx`.
- **Purpose:** Pre-renders the full structure (Header, Hero, Sidebar, Grid) to guarantee **0 Cumulative Layout Shift (CLS)**.

### Tier 2: Data-Section Skeleton (`<DataSectionSkeleton />` or `<CatalogGridSkeleton />`)
- **When to use:** User changes a filter chip, clicks a category tab, types a search query, or navigates pagination.
- **Components:**
  - `<CatalogGridSkeleton count={6} />` for course/scholarship card grids.
  - `<DataSectionSkeleton variant="grid" | "rail" | "list" count={6} />` for generic dynamic sections.
- **Rule:** The surrounding page controls (Desktop Navbar, Mobile Header, Search Input, Filter Sidebar, Active Pills, Footer) **remain completely mounted, visible, and fully interactive**.

### Atomic Skeleton Primitives (`src/shared/components/Loading/SkeletonPrimitives.tsx`)
When constructing custom skeletons, use atomic primitives styled with the celestial starlight shimmer:
- `<SkeletonBox className="w-48 h-8 rounded-lg" />`
- `<SkeletonText lines={2} lastLineWidth="70%" />`
- `<SkeletonCircle size={40} />`
- `<SkeletonBadge width="75px" />`

---

## 3. Pillar 2: Persistent Shell & 60fps Page Transitions

### Rule: Never Duplicate the App Shell in Page Views
Page components (`HomePage.tsx`, `CatalogPage.tsx`, etc.) **must never** render `<DesktopNavbar>`, `<MobileHeader>`, `<MobileBottomBar>`, or `<Footer>`.
- The persistent frame is managed globally by `src/app/layouts/RootLayout.tsx`.
- When navigating from `/` to `/catalog`, the navbars stay mounted, the active glowing indicator glides smoothly via CSS, and only the `<Outlet />` transition container animates.

### Page Transition Container
Each route view is wrapped in:
```tsx
<div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
  <Outlet />
</div>
```

### Smart Scroll Restoration
Managed automatically by `src/app/router.tsx`:
- **Cross-page route navigation (`/` → `/catalog`):** Smoothly scrolls window to top `(0, 0)`.
- **Browser Back / Forward (`popstate`):** Restores exact scroll coordinates from memory map.
- **Query param updates (`?type=courses` → `?type=courses&field=ai`):** Preserves current scroll position so the user stays in place while toggling filters.

---

## 4. Pillar 3: In-Memory Caching & SWR (`useCachedData`)

### Mental Model: Stale-While-Revalidate
Whenever fetching or computing data:
1. Check `dataCacheManager` in memory synchronously.
2. If cached and fresh (< `staleTime`), return data immediately with `isLoading = false` (Instant 0ms render, 0 skeletons!).
3. If cached and stale, return cached data immediately and fire a background refresh (`isFetching = true`).
4. If cache miss, set `isLoading = true` to render Tier 2 skeleton, fetch data, and cache the result.

### Usage in Components
```tsx
import { useCachedData } from '../../../shared/hooks/useCachedData';

export const MyDataSection: React.FC<{ filters: MyFilters }> = ({ filters }) => {
  const { data, isLoading, isFetching } = useCachedData(
    ['my-feature-key', filters],
    async () => fetchMyData(filters),
    {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes memory retention
    }
  );

  if (isLoading) {
    return <CatalogGridSkeleton count={6} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((item) => (
        <CourseCard key={item.id} course={item} layout="desktop" />
      ))}
    </div>
  );
};
```

---

## 5. Pillar 4: Declarative Route Registry

All routes must be declared in `src/app/routes.ts`:

```ts
export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: HomePage,
    meta: {
      title: 'أكاديمية خوارزم — المرصد الأكاديمي والفرص الدولية',
      description: 'بوابة خوارزم للدورات التدريبية المتقدمة والمنح الدراسية العالمية.',
      activeTab: 'home',
    },
    skeletonVariant: 'home',
  },
  {
    path: '/catalog',
    component: CatalogPage,
    meta: {
      title: 'دليل الدورات والمنح — أكاديمية خوارزم',
      activeTab: 'catalog',
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses/:slug',
    component: CourseDetailPage,
    meta: {
      title: 'تفاصيل الدورة — أكاديمية خوارزم',
      activeTab: 'courses',
    },
    skeletonVariant: 'detail',
  },
];
```

### Dynamic Parameters
Inside any route component:
```tsx
import { useParams } from '../../../app/routerContext';

const { slug } = useParams<{ slug: string }>();
```

### URL Search Parameters & Derived State
Always derive active view state directly from `useSearchParams`:
```tsx
import { useSearchParams } from '../../../app/routerContext';

const [searchParams, setSearchParams] = useSearchParams();
const activeType = searchParams.get('type') || 'all';

// To update URL search params:
setSearchParams({ type: 'courses', q: 'python' });
```

---

## 6. Universal Blueprint for Building Any New Page

When creating any new page, follow this 5-step checklist:

1. **Step 1: Register Route in `src/app/routes.ts`**
   - Add path, component, Arabic title in `meta`, and `activeTab`.
2. **Step 2: Assemble Page View without Shell Markup**
   - Use `<main className="content-container">`.
   - Do NOT add `<DesktopNavbar>` or `<Footer>` (handled by `RootLayout`).
3. **Step 3: Separate Static Controls from Dynamic Data**
   - Static controls (Page Title, Search Box, Filter Sidebar) stay in the page view.
   - Dynamic cards/lists are extracted into an isolated Data Section component (e.g. `MyDataSection.tsx`).
4. **Step 4: Connect `useCachedData` in the Data Section**
   - Define a deterministic query key: `['feature-name', filters]`.
   - Render Tier 2 skeleton when `isLoading` is true.
   - Render items when `data` is loaded.
5. **Step 5: Verify Build & Instant Caching**
   - Run `npm run build` and `npm run lint`.
   - Verify that toggling back to a previously visited tab renders instantly from cache.
