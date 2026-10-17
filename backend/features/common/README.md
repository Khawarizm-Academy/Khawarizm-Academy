# Common — الأنماط المشتركة

The shared building blocks every feature app imports. It owns no product data,
but it **is** an installed app: it hosts the abstract model bases every feature
table inherits, the vocabulary (choices), the small HTTP helpers, the shared
test kit, and the `seed_demo` command.

## What lives here

| File | Provides | Used by |
| :--- | :--- | :--- |
| `models.py` | `UUIDModel` — a UUID primary key; `TimeStampedModel` — `created_at` / `updated_at` | every feature's `models.py` |
| `choices.py` | Every enum-style `TextChoices` (roles, course levels, scholarship statuses, notification types…) | every feature's `models.py` |
| `serializers.py` | `compact(**fields)` — drops empty/`None` keys; `as_number(Decimal)` — Decimal → float | every feature's serializers |
| `errors.py` | `api_exception_handler` — the DRF exception handler named in `settings.py` | the project |
| `testing.py` | `ApiTestCase`, `api_client()`, `FakeRequest()`, `authenticate()`, and the `make_*` row builders | every feature's `tests.py` |
| `management/commands/seed_demo.py` | `python manage.py seed_demo` — fills a dev DB with the demo catalog, learner, and admin | local development |
| `apps.py` | `CommonConfig` (label `common`) | `INSTALLED_APPS` |

## Rules

- **One source of truth for choices.** A value like `fully_funded` is declared
  once here and imported; never re-typed as a literal in a model.
- **One source of truth for primary keys.** Every table inherits `UUIDModel`
  (optionally with `TimeStampedModel`); no feature invents its own id scheme.
- **No feature imports.** This package depends on nothing in `features/*` — only
  on Django — so it can be imported from anywhere without cycles.

## Importing

```python
from features.common.choices import CourseLevel, Role
from features.common.models import TimeStampedModel, UUIDModel
from features.common.serializers import compact, as_number
```

## Related

- Feature map: [`../README.md`](../README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
