# Common — الأنماط المشتركة

Shared, model-free building blocks every feature app imports. Nothing here owns
data; it owns the vocabulary and the small HTTP helpers.

## What lives here

| File | Provides | Used by |
| :--- | :--- | :--- |
| `choices.py` | Every enum-style `TextChoices` (course levels, scholarship statuses, notification types…) | every feature's `models.py` |
| `serializers.py` | `compact(**fields)` — drops empty/`None` keys; `as_number(Decimal)` — Decimal → float | every feature's serializers |
| `errors.py` | `api_exception_handler` — the DRF exception handler named in `settings.py` | the project |

## Rules

- **One source of truth for choices.** A value like `fully_funded` is declared
  once here and imported; never re-typed as a literal in a model.
- **No models, no migrations.** `common` is a plain Python package, not a Django
  app, so it never appears in `INSTALLED_APPS`.
- **No feature imports.** This package depends on nothing in `features/*` — only
  on Django — so it can be imported from anywhere without cycles.

## Importing

```python
from features.common.choices import CourseLevel
from features.common.serializers import compact, as_number
```

## Related

- Feature map: [`../README.md`](../README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
