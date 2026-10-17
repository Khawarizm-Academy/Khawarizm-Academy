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
├── serializers.py    catalog_item_for() — dispatches to course/scholarship serializers
├── filters.py        FILTERS / SORTERS — data-driven filter/sorter tables
├── views.py          catalog_list, catalog_detail, catalog_filters_view
├── urls.py           /api/catalog routes
├── admin.py          Category, filter group/option admin
├── migrations/       schema history
├── tests.py
└── README.md
```

## How it works

- **Interleaved union:** builds an array alternating `Course` and `Scholarship`
  objects in the order they exist, serializes each to a `CatalogItem`, applies
  filters (type/tab, q, field, level, cost, country, status), optional
  `ids=` filter (used by the related-courses rail), then sorts and paginates (6
  per page).
- **DB-driven taxonomy:** `GET /api/catalog/filters?surface=desktop|mobile&tab=all|courses|scholarships`
  returns `{"groups": [...], "sortOptions": [...]}` built from `FilterGroup` /
  `FilterOption` rows (no frontend JSON). A group carries surface, kind
  (filter|sort), key, label, tone, and glow; an option belongs to a group and
  carries `tabs` so one group can serve different catalog tabs.
- **Data-driven filters:** every filter is a row in `filters.FILTERS`; `sort_key`
  reads from `filters.SORTERS`. There are **no `if/else` chains** — the lists
  are the specification.
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
