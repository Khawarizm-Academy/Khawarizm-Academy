# Catalog — دليل الدورات والمنح

The unified explorer for both pillars. One surface to search, filter, sort, and paginate courses and scholarships.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/catalog` (with `?type=courses` / `?type=scholarships` highlighting tabs) |
| **Shell** | Standard |
| **Skeleton variant** | `catalog` |
| **Active tab** | `catalog`, or `courses` / `scholarships` via `tabsByQuery` |
| **Entry** | `pages/CatalogPage.tsx` |
| **State provider** | `context/CatalogProvider.tsx` |
| **Styles** | `catalog.css` (concept classes `catalog-*`) |

## Purpose

Catalog answers "find the right course or scholarship". Users switch tabs (`all` / `courses` / `scholarships`), refine by field, level, language, cost, country, and status, sort, paginate, search by keyword, and open a detail page. The active tab (`type`) and query (`q`) live in the URL so results are shareable and back-button friendly; the heavier filtering and pagination are cached.

## Structure

```text
catalog/
├── pages/
│   └── CatalogPage.tsx                    mounts provider + hero + results + drawer
├── components/
│   ├── cards/
│   │   └── CatalogCard.tsx                course/scholarship card, accent by pillar
│   ├── filters/
│   │   ├── CatalogFilterGroups.tsx        the pill rows, written once for both surfaces
│   │   ├── CatalogFilterSidebar.tsx       desktop aside rail
│   │   └── CatalogMobileFilterDrawer.tsx  mobile bottom-sheet drawer
│   ├── hero/
│   │   └── CatalogHero.tsx                title + SmartSearchBox
│   ├── layout/
│   │   ├── CatalogDataSection.tsx         the only re-rendering island
│   │   └── CatalogResults.tsx             results composition
│   ├── states/
│   │   └── CatalogGridSkeleton.tsx        Tier-2 card grid skeleton
│   └── toolbar/
│       ├── CatalogPagination.tsx          page controls
│       └── CatalogToolbar.tsx             count, sort, filter trigger
├── context/
│   ├── catalogContext.ts                  context + useCatalog() + filter types + maps
│   └── CatalogProvider.tsx                owns URL-derived and local filter state
├── data/
│   ├── catalogFetcher.ts                  live GET /catalog + fetchCatalogFilters()
│   └── catalogFilters.ts                  ResolvedFilterGroup / FilterOption types
├── types.ts                               feature view types
├── catalog.css                            feature concept classes
└── README.md
```

## How it works

- **URL owns the view:** `CatalogProvider` derives `activeTab` from `?type=` and the query from `?q=` at render. It never copies them into `useState`.
- **Filters come from the API:** at boot, and on every tab change, the provider fetches `GET /api/catalog/filters` for desktop and mobile (`data/catalogFetcher.ts` → `fetchCatalogFilters(surface, tab)`), typed as `ResolvedFilterGroup[]` / `SortOptionItem[]`, and exposes `filterGroups`, `sortOptions`, and `isFiltersLoading`. `shared/json/catalog.json` no longer holds filter config — only page titles, search-type maps, status labels, and filter-chrome copy.
- **Local state:** `persistentFilters` (`field`, `level`, `language`, `cost`, `country`, `status`, `sortBy`, `page`) and `isFilterDrawerOpen`. The merged `filters` object combines both.
- **Actions:** `changeTab` (resets page + level), `search`, `changeFilter`, `resetFilters`, `selectCard` (navigates to `/courses/:id` or `/scholarships/:id`), plus drawer open/close and prebuilt `searchProps` for both search surfaces.
- **One data section:** `CatalogDataSection` is the only component that re-renders on filter/data change. It runs the filter → sort → paginate pipeline (`ITEMS_PER_PAGE = 6`) behind `useCachedData` with a deterministic composite key and `keepPreviousData`, so changing filters never flashes the skeleton.
- **Prefetch:** hovering a card warms `['catalog-detail', id]` for instant detail navigation.
- **States:** skeleton (true cold miss), error panel with retry, and empty panel with a "reset filters" CTA — all sharing `glass-panel` + `.catalog-state`.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/json/catalog.json` | page titles, search-type maps, status labels, filter-chrome copy (no filter groups) |
| `@/shared/types/entities` | `CatalogItem` |
| `data/catalogFetcher.ts` | live `GET /catalog` (server-side filter/sort/paginate) + `fetchCatalogFilters(surface, tab)` → `GET /catalog/filters` |
| `data/catalogFilters.ts` | `ResolvedFilterGroup` / `FilterOption` types for the fetched groups |
| `@/shared/hooks/useCachedData` | cached item queries |
| `@/shared/lib/cacheManager` | `prefetch` for detail warm-up |

## Reused components

| Component | Role |
| :--- | :--- |
| `Search/SmartSearchBox` | Hero search (shares one `searchProps` object across surfaces) |
| `Loading/SkeletonPrimitives` | `SkeletonBox/Text/Badge/Circle` inside the grid skeleton |

## Notes

- Both filter surfaces render **one** `CatalogFilterGroups`; only the wrapper differs. Never duplicate the pill rows.
- `/courses` and `/scholarships` redirect here (`?type=courses` / `?type=scholarships`); this is the canonical URL for both.

## Related

- Routing & query params: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Caching & skeletons: [`docs/04-loading-caching-and-motion.md`](../../../../docs/04-loading-caching-and-motion.md)
- Scholarship detail: [`../scholarships/README.md`](../scholarships/README.md) · Course pages: [`../courses/README.md`](../courses/README.md)
