# Catalog — دليل الدورات والمنح

The unified explorer for both pillars (courses and scholarships). This feature
owns the **taxonomy** (`Category`) and the **filter/sort taxonomy**
(`FilterGroup` / `FilterOption`, edited in Django admin), plus the **browse**
endpoints (`catalog list`, `catalog filters`, and `catalog detail`).

## At a glance

| | |
| :--- | :--- |
| **App label** | `catalog` |
| **Routes** | `GET /api/catalog`, `GET /api/catalog/filters?surface=&tab=`, `GET /api/catalog/:slug` |
| **Owns** | `Category`, `FilterGroup`, `FilterOption` |
| **Imports** | `Course` (courses), `Scholarship` (scholarships); uses their catalog serializers |
| **Frontend twin** | `frontend/src/features/catalog/` |

## Purpose

Returns a paged, filterable, and sortable union of courses and scholarships in
an **interleaved** order, matching the original frontend behavior. The detail
endpoint resolves a single item by slug (first tries a course, then a
scholarship). The filter sidebar taxonomy comes from the database, not from
frontend JSON.

## Structure

```text
catalog/
├── apps.py           AppConfig (label "catalog")
├── models.py         Category, FilterGroup, FilterOption
├── service.py        the engine — cached interleave, list/detail/filters, validation
├── serializers.py    catalog_item_for() — dispatches to course/scholarship serializers
├── filters.py        FILTERS / SORTERS — data-driven filter/sorter tables
├── views.py          thin handlers over the service
├── urls.py           /api/catalog routes
├── admin.py          Category, filter group/option admin
├── migrations/       schema history
├── tests.py
└── README.md
```

## How it works

- **The engine (`service.py`):** the interleaved union is built once and cached
  whole (`kh:catalog:v*:items` — see the backend README's Caching section). A
  cache miss costs exactly two queries (courses + scholarships); filtering,
  sorting, and pagination then run over the cached list. Unknown `type`/`sort`
  values are `400`s naming the valid options (`KNOWN_TYPES`/`KNOWN_SORTS` —
  `newest` and `popular` both keep the interleave order; `rating`/`deadline`
  reorder).
- **Interleaved union:** courses and scholarships alternate in the order they
  exist; filters (type/tab, q, field, level, cost, country, status), the
  optional `ids=` filter (related-courses rail), sorting, and 6-per-page
  pagination apply on top. Note: a scholarship beyond the course count is not
  shown in the list (original interleaving, kept for parity) — the **detail**
  endpoint still resolves it by slug.
- **DB-driven taxonomy:** `GET /api/catalog/filters?surface=desktop|mobile&tab=all|courses|scholarships`
  returns `{"groups": [...], "sortOptions": [...]}` built from `FilterGroup` /
  `FilterOption` rows (no frontend JSON). A group carries surface, kind
  (filter|sort), key, label, tone, and glow; an option belongs to a group and
  carries `tabs` so one group can serve different catalog tabs.
- **Data-driven filters:** every filter is a row in `filters.FILTERS`; `sort_key`
  reads from `filters.SORTERS`. There are **no `if/else` chains** — the lists
  are the specification. If the catalog ever exceeds ~2k rows, the engine's
  docstring names the DB-pushdown rework (filters become `QuerySet.filter()`
  per type, keyset pagination).
- **One shape:** `catalog_item_for()` returns the shared `CatalogItem` (a
  discriminated shape with `type: 'course' | 'scholarship'`). The per-entity
  mappings live in `courses.serializers.course_catalog_item` and
  `scholarships.serializers.scholarship_catalog_item`.

## Data

| Source | Provides |
| :--- | :--- |
| `Category` | taxonomy used by catalog filters (via choices) |
| `FilterGroup` | one filter/sort row: key, label, kind, tone, glow, surfaces, order |
| `FilterOption` | selectable value inside a group, scoped by `tabs` |
| `courses.Course` | course summaries |
| `scholarships.Scholarship` | scholarship summaries |

## Related

- Courses (course detail + curriculum): [`../courses/README.md`](../courses/README.md)
- Scholarships (detail/apply/save): [`../scholarships/README.md`](../scholarships/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
