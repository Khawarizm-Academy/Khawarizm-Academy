---
name: be-architecture
description: Backend architecture for any web API (Django/DRF, Node/Express/Nest/Fastify, FastAPI, Rails-style) - one module per feature mirroring the frontend, the thin-handler rule, one serializer per entity shape as the only naming/casing boundary, services for business rules, shared foundation module, admin or back-office as the data editor, idempotent seeding, README per feature, and the 13-step feature scaffold. Use when creating or restructuring any backend feature, endpoint, model, serializer, or module.
---

# Backend Architecture

The backend exists to serve clients with a **stable contract**. It owns record data; the frontend owns presentation and copy. Every decision is judged by one test: **does the payload match the declared contract?**

## 1. Layout: one module per feature

```
backend/features/<feature>/          (names mirror frontend/src/features/<feature>/)
  models.py | schema         the feature's tables
  serializers.py | dto       row -> contract JSON (the only casing boundary)
  services.py                business rules that are more than one query
  views.py | routes | controller   thin handlers
  urls.py | router           the feature's routes
  admin.py | backoffice      data editor (if the stack has one)
  tests.py | __tests__       models, serializers, routes
  migrations/                schema history (if the feature owns tables)
  README.md                  what it does, routes, data, gotchas
shared/common/               abstract models, enums/choices, testing kit, seed command
```

Create only the files a feature needs. A feature that stores nothing (a facade over another module's table) has no models/migrations. A feature that only reads across others (analytics) owns no tables.

## 2. Ownership rules

- A feature **owns its tables**. Other features **import** the owner's model and serializer; they never duplicate a table or re-declare a shape.
- Shared enums/choices live once in the common module and are imported everywhere - never retyped as literals.
- If the framework reserves a name (Django reserves `auth`), the folder name can differ from the app label; keep the mapping in one place and use the label in foreign keys.

## 3. Handlers are thin

A handler does: **resolve the caller -> validate input -> call a query/service -> serialize -> return**. Nothing else.

```python
@api_view(["GET"])
def course_detail_view(request, slug):
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        return Response(NOT_FOUND, status=404)          # message defined once
    return Response(course_detail(course))
```

- Return serialized data, never ORM objects or QuerySets.
- Missing resource -> **404 with a clear message**, never an empty 200.
- Business rules with more than a query or two go in `services`, so handlers and background jobs share them.
- Mutations return a small acknowledgement or the updated resource; persistence is real, not faked.

## 4. Serializers: the only boundary

- Model fields are `snake_case`; the contract may be `camelCase` (or whatever the client declared). **The conversion happens in the serializer and nowhere else.**
- **One serializer per entity shape**, reused by every caller (list item, detail, card).
- Helpers: `compact(**fields)` drops `None`/`""` so payloads stay lean; `as_number(Decimal)` converts decimals once at the edge.
- Never rename a contract key to match a model field. The contract wins.
- Serializers must not hit the database: prefetch first ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §6).

## 5. Data-driven filtering and sorting

Filters and sorters are rows in a table, not an `if/else` ladder (see [`core-code-style`](../core-code-style/SKILL.md) §3).

```python
FILTERS = (("type", "all", type_matches), ("field", "all", field_matches))
SORTERS = {"newest": "-created_at", "popular": "-enrolled_count", "rating": "-rating"}
```
Push filtering into the database query whenever possible; filtering in Python is only for small, already-cached lists.

## 6. The data editor: admin / back-office

Content beyond the seed is created through the admin, not by editing the seed. **Every model is registered** with useful `list_display`, `list_filter`, `search_fields`, and **inlines** for child rows. Staff can then manage real content without code. Seeds are idempotent and clearly separate demo data from reference data ([`db-schema-design-and-migrations`](../db-schema-design-and-migrations/SKILL.md) §8).

## 7. Cross-cutting concerns live in shared code

Auth/permissions ([`be-auth-and-security`](../be-auth-and-security/SKILL.md)), config/secrets ([`be-config-and-secrets`](../be-config-and-secrets/SKILL.md)), logging ([`be-observability-and-logging`](../be-observability-and-logging/SKILL.md)), error envelope ([`core-error-handling`](../core-error-handling/SKILL.md)), caching ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)). Features consume them; they do not reimplement them.

## 8. The 13-step feature scaffold

1. Read the frontend twin: its types, fetchers (exact URLs/params), and README. The contract is the spec.
2. Decide ownership: which tables this feature owns vs imports.
3. Scaffold the folder and app config.
4. `models`: grouped fields with one-line comments, constraints, indexes, `__str__`.
5. `serializers`: one per shape, the only casing boundary.
6. `views`: thin handlers, 404 with a defined message.
7. `urls`: the feature's routes; declare static paths before parameterized ones.
8. Register the module (installed apps / module list).
9. Mount the routes under the API prefix.
10. `admin`: register every model with inlines.
11. Generate and apply migrations.
12. `tests`: models, serializers, routes using the shared kit.
13. `README` + a row in the features index.

## 9. Route-order pitfall

A parameterized route (`videos/<slug>`) swallows static siblings (`videos/providers`). Declare **static routes first**.

## 10. Pitfalls

| Pitfall | Prevention |
| --- | --- |
| One giant `api/` app | one module per feature, mirroring the frontend |
| Field mapping in views | one serializer per shape |
| `if param == ...` ladders | filter/sorter tables |
| Empty 200 for a missing row | 404 with a defined message |
| Unregistered models | register all, with inlines |
| Literal enum values retyped | import from the shared enums |
| Serializer that queries | prefetch before serializing |
| Business logic in handlers | move to `services` |

## 11. Checklist

- [ ] Module mirrors the frontend feature; owns only its tables.
- [ ] Handlers thin; services hold rules; serializers are the only casing boundary.
- [ ] Filters/sorters are data; 404s are real; messages defined once.
- [ ] Admin registered with inlines; seed idempotent.
- [ ] Tests, README, index row, migrations done; gates pass ([`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md)).
