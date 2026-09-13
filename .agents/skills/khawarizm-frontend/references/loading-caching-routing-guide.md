# Khawarizm Academy — Loading, Caching & Routing Architecture Reference Guide

This reference document details the architecture, code contracts, and design tokens for page loading, skeleton animations, route management, and in-memory SWR caching in Khawarizm Academy.

---

## 1. Directory Structure

```
src/
├── app/
│   ├── layouts/
│   │   └── RootLayout.tsx          # Permanent shell (Navbars, Footers, Atmosphere, Transitions)
│   ├── router.tsx                  # Core router engine (Router, Outlet)
│   ├── routerContext.ts            # Context, hooks (useNavigate, useLocation, useParams, useSearchParams)
│   └── routes.ts                   # Centralized declarative Route Registry
├── shared/
│   ├── components/
│   │   └── Loading/
│   │       ├── SkeletonPrimitives.tsx   # Atomic skeleton elements (Box, Text, Circle, Badge)
│   │       ├── PageSkeleton.tsx         # Tier 1 Full-Page Skeleton (cold loads, suspense)
│   │       ├── DataSectionSkeleton.tsx  # Tier 2 Data Section Skeleton (grid, rail, list)
│   │       └── AstrolabeLoader.tsx      # Branded astrological loader
│   ├── hooks/
│   │   └── useCachedData.ts        # Universal SWR hook powered by useSyncExternalStore
│   └── lib/
│       └── cacheManager.ts         # In-memory SWR data cache engine
└── features/
    └── catalog/
        ├── components/
        │   ├── CatalogGridSkeleton.tsx  # 6-Card high-fidelity grid skeleton
        │   └── CatalogDataSection.tsx   # Dynamic isolated data boundary
        └── pages/
            └── CatalogPage.tsx          # Page view with static controls & data boundary
```

---

## 2. Design Tokens for Skeletons & Transitions

Located in `src/styles/tokens.css`:
```css
/* Celestial Skeleton Shimmer Tokens */
--skeleton-base: #061A3A;
--skeleton-surface: #092557;
--skeleton-border: #1B3F80;
--skeleton-highlight-cyan: rgba(41, 169, 255, 0.12);
--skeleton-highlight-gold: rgba(229, 182, 92, 0.10);

/* Page Transition Tokens */
--transition-page-duration: 220ms;
--transition-page-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

### Keyframe Animations & Utilities (`src/styles/globals.css`)
- `@keyframes skeleton-celestial-shimmer`: Starlight sweep gradient at 2.2s ease-in-out.
- `.skeleton-box`: Base animated shimmering block.
- `.skeleton-card`: Translucent glass card container with blur and subtle border.
- `.skeleton-text`: Text line skeleton.
- `.skeleton-badge`: Pill badge skeleton.
- `.skeleton-circle`: Rounded avatar / icon skeleton.
- `.animate-page-enter`: 220ms smooth opacity + translateY entry for route changes.

---

## 3. Dual-Tier Skeleton Guidelines

| Tier | Component | Triggered When | What Stays Mounted? |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Page)** | `<PageSkeleton variant="home" \| "catalog" />` | Initial visit, route code-split suspense | Global Navbar & Mobile Bottom Bar (in RootLayout) |
| **Tier 2 (Data)** | `<DataSectionSkeleton />` / `<CatalogGridSkeleton />` | Filter change, search typing, tab switch, page turn | Navbar, Header, Hero, Search Box, Filter Sidebar, Footer |

---

## 4. Cache Management (`dataCacheManager` & `useCachedData`)

### Cache Key Conventions
Keys must be deterministic arrays or objects:
- Single resource: `['course', courseId]`
- Query list: `['catalog-items', { type, field, level, page, q }]`
- Featured items: `['home-featured-courses']`

### Invalidation & Prefetching
```ts
import { dataCacheManager } from 'src/shared/lib/cacheManager';

// Invalidate on mutation (e.g. user enrolls):
dataCacheManager.invalidate(['catalog-items']);

// Prefetch on link hover:
dataCacheManager.prefetch(
  ['catalog-items', { type: 'courses' }],
  () => fetchCatalogCourses()
);
```

---

## 5. Navigation & Persistent Layout Rules

1. **RootLayout handles all shared chrome:**
   `DesktopNavbar`, `MobileHeader`, `MobileBottomBar`, `Footer`, and atmospheric background.
2. **Never wrap page views in `.page-wrapper`:**
   Page views must start with `<main className="content-container">`.
3. **Derived state for URL synchronization:**
   Derive query-dependent state (such as active tab) directly from `useSearchParams`. Do not duplicate in `useState` + `useEffect`.
4. **Scroll Restoration:**
   Browser Back/Forward automatically restores scroll position. Cross-page navigation scrolls to `(0, 0)`. In-page query changes preserve scroll position.
