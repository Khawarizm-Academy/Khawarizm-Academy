# Scholarships — المنح والفرص الدولية

The scholarship detail view. Browsing lives in the catalog; this feature renders one scholarship by slug.

## At a glance

| | |
| :--- | :--- |
| **Routes** | `/scholarships/:slug` (detail); `/scholarships` redirects to `/catalog?type=scholarships` |
| **Shell** | Standard |
| **Skeleton variant** | `detail` |
| **Active tab** | `scholarships` |
| **Entry** | `pages/ScholarshipDetailPage.tsx` |
| **Styles** | shared only (no feature CSS) |

## Purpose

When a learner selects a funded scholarship from the catalog, this page loads it by URL slug and shows a full detail layout with an application CTA, plus loading and not-found/deadline-closed states. It is the detail half of the scholarship experience; the catalog owns the list/browse half.

## Structure

```text
scholarships/
├── pages/
│   └── ScholarshipDetailPage.tsx     slug → cached item → ItemDetailView
└── README.md
```

There is no feature state store, context, or component folder.

## How it works

- Reads `slug` via `useParams`.
- Loads the item with `useCachedData(['catalog-detail', slug], fetcher, { keepPreviousData, staleTime: 10min, cacheTime: 30min })`, matching on `type === 'scholarship'` inside `mockCatalogAll`. The fetcher simulates a 60ms delay.
- Renders `PageSkeleton` (detail variant) while loading and `StatePanel` for the not-found state, then the shared `ItemDetailView` with `backPath="/catalog?type=scholarships"` and the primary CTA label.
- Entered from `features/catalog/context/CatalogProvider.tsx` (`selectCard` navigates to `/scholarships/:id`), with hover prefetch warming the same cache key.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/mocks/catalog` | `mockCatalogAll`, `CatalogItem` |
| `@/shared/hooks/useCachedData` | cached detail read |
| `@/shared/components/Detail/ItemDetailView` | the detail layout (shared with courses pattern) |
| `@/shared/components/State/StatePanel` | not-found / closed state |
| `@/shared/components/Loading/PageSkeleton` | detail skeleton |

## Notes

- The course and scholarship detail pages share the same `ItemDetailView` layout; the tone (gold vs. cyan) switches by pillar.
- `/scholarships` is a redirect, not a page — the scholarship list is `/catalog?type=scholarships`.

## Related

- Catalog: [`../catalog/README.md`](../catalog/README.md)
- Routing & redirects: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Backend application endpoint: [`docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
