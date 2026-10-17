# Scholarships — المنح والفرص الدولية

The scholarship domain. Catalog owns the list union; this feature owns the
`Scholarship` entity and the detail/apply/save endpoints.

## At a glance

| | |
| :--- | :--- |
| **App label** | `scholarships` |
| **Routes** | `GET /api/scholarships/:slug`, `POST /api/scholarships/:slug/apply`, `POST /api/scholarships/:slug/save` |
| **Owns** | `Scholarship` |
| **Frontend twin** | `frontend/src/features/scholarships/` |

## Purpose

Represents an international scholarship/opportunity. The `Scholarship` row is the
single source of truth for the catalog `CatalogItem` (type `scholarship`) and
for the scholarship detail page.

## Structure

```text
scholarships/
├── apps.py           AppConfig (label "scholarships")
├── models.py         Scholarship
├── serializers.py    scholarship_catalog_item
├── views.py          scholarship_detail_view, scholarship_apply_view, scholarship_save_view
├── urls.py           /api/scholarships/*
├── admin.py          Scholarship admin
├── tests.py          models, serializers, and routes
├── migrations/       schema history
└── README.md
```

## How it works

- **Catalog shape:** `scholarship_catalog_item()` returns the discriminated
  `CatalogItem` with `type: 'scholarship'` (country, degree level, provider,
  coverage, deadline urgency/status, days remaining). The catalog dispatches to
  it via `catalog_item_for()`.
- **Detail:** returns the same `CatalogItem` shape by slug; a missing
  scholarship returns `المنحة غير موجودة` (404).
- **Actions:** `apply` and `save` are acknowledgement-only — they validate the
  scholarship and echo the result, with no persistence yet. `save` accepts an
  optional `saved` flag from the request body and echoes it back.

## Data

| Source | Provides |
| :--- | :--- |
| `Scholarship` | title, category, thumbnail, country, degree level/label, provider, coverage type/label, days remaining, deadline badge/urgency, status |

## Related

- Catalog (browse): [`../catalog/README.md`](../catalog/README.md)
- Dashboard (saved scholarships): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
