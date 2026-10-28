---
name: be-api-design
description: REST/JSON API design rules - resource naming, HTTP methods and status codes, consistent response and error envelopes, pagination (offset vs cursor), filtering, sorting, field selection, versioning, idempotency keys, batch endpoints, bulk operations, rate-limit headers, caching headers, CORS, and OpenAPI documentation. Use when designing or reviewing any endpoint, changing a response shape, or building a client-facing contract.
---

# API Design

The API is a product. Make it predictable, cacheable, batch-friendly, and hard to misuse.

## 1. Resources and methods

- Nouns, plural, lowercase, kebab or snake consistently: `/courses`, `/courses/{slug}`, `/courses/{slug}/lessons`.
- Methods: `GET` read (safe, cacheable), `POST` create/action, `PUT` replace, `PATCH` partial update, `DELETE` remove. `GET` never changes state.
- Actions that are not CRUD: a sub-resource verb as a `POST` (`POST /videos/{slug}/token`), not a `GET` with side effects.
- Nesting at most two levels; beyond that, use query filters (`/lessons?course=slug`).
- Static routes declared before parameterized ones.

## 2. Responses

- JSON object at the top level (not a bare array) so you can add metadata later: `{ "items": [...], "nextCursor": "..." }`.
- Keys follow one convention (the contract); conversion lives in the serializer ([`be-architecture`](../be-architecture/SKILL.md)).
- Omit empty/null optional fields (`compact`) so payloads stay lean, and document which keys are optional.
- Dates in ISO 8601 UTC; money as integer minor units + currency; ids as strings.
- Include only what the view needs; heavy detail belongs on the detail endpoint ([`perf-backend-speed`](../perf-backend-speed/SKILL.md)).

## 3. Errors: one envelope

```json
{ "detail": "Course not found", "code": "not_found", "fields": { "email": ["Invalid address"] } }
```
Status codes and semantics: see [`core-error-handling`](../core-error-handling/SKILL.md) §4. Validation errors list field-level messages. Messages are defined once as constants and are safe to show or map to translated copy.

## 4. Pagination

| Style | Use | Shape |
| --- | --- | --- |
| **Cursor** (keyset) | feeds, large or growing lists | `?limit=20&cursor=abc` -> `{ items, nextCursor }` |
| **Page/offset** | small, bounded lists, admin tables | `?page=2&pageSize=20` -> `{ items, page, pageSize, total? }` |

- Always default and **cap** the page size server-side.
- `total` is optional and expensive on big tables; prefer `hasNext` or an approximate/cached count ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §7).
- Stable ordering (add `id` as a tiebreaker) so pages do not skip or repeat rows.

## 5. Filtering, sorting, search, field selection

- Filters as query params with the same names the UI uses (`?type=courses&level=beginner`), implemented as data rows ([`core-code-style`](../core-code-style/SKILL.md) §3). Unknown filter -> 400 listing valid ones, not a silent ignore.
- `?sort=-created_at,title`; whitelist sortable fields (and index them).
- `?q=` for search; backed by a real index or search engine ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §3).
- Optional `?fields=id,title,price` for sparse fieldsets on heavy resources.

## 6. Batch and bulk endpoints (weak-database friendly)

- Offer `POST /items/batch` with `{ create: [], update: [], delete: [] }` applied in **one transaction**, returning per-item results. One request, one commit ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)).
- Accept lists for reads of many ids (`GET /items?ids=1,2,3`) instead of making clients loop.
- Return created/updated resources in the response so clients never need a refetch.

## 7. Idempotency and concurrency

- `PUT`/`DELETE` are idempotent by definition. For `POST`s that must not repeat (payments, orders, webhooks), accept an `Idempotency-Key` header and store the result for a window.
- Optimistic concurrency: `ETag` + `If-Match` (or a `version` field) to reject lost updates with 409/412.

## 8. Caching headers and CORS

- Public GETs: `Cache-Control` + `ETag` ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md) §3). Private data: `private, no-store`.
- CORS: an explicit allow-list of origins, methods, and headers; never `*` with credentials. Reject unknown origins server-side if the project requires it, and give tests an allowed `Origin`.

## 9. Versioning and change policy

- Prefer **additive** changes (new optional fields, new endpoints). Removing or renaming a key is a breaking change: version it (`/v2/...` or a header), deprecate with a `Sunset`/notice, keep both during the migration window.
- Never change the meaning of an existing field.

## 10. Rate limiting and abuse

Limit per IP/user/key on auth, search, and expensive routes; answer `429` with `Retry-After`; expose remaining quota headers if clients need them ([`be-auth-and-security`](../be-auth-and-security/SKILL.md)).

## 11. Documentation

Generate an OpenAPI spec from code or keep it hand-written and tested; examples for every endpoint; list status codes and error codes. The spec doubles as the contract the frontend types are generated from.

## 12. Checklist

- [ ] Resource names, methods, and status codes are conventional; GET has no side effects.
- [ ] One error envelope; field errors are structured; 404 not empty 200.
- [ ] Lists are paginated with a capped size and stable order.
- [ ] Filters/sort are whitelisted and indexed; unknown params rejected.
- [ ] Batch endpoint exists where clients write many items; mutations return the new resource.
- [ ] Idempotency key on repeatable POSTs; ETag/Cache-Control set deliberately.
- [ ] Changes are additive or versioned; OpenAPI is up to date.
