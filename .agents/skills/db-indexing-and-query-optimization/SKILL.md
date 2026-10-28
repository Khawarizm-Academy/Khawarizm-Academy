---
name: db-indexing-and-query-optimization
description: Indexing and query optimization for SQL databases (PostgreSQL, MySQL, SQLite) and ORMs (Django, Prisma, others). Covers choosing composite/partial/covering/expression indexes, foreign-key indexes, reading EXPLAIN, eliminating N+1, projection, keyset pagination, cheap counts, text/JSON search indexes, safe index creation in production, and a find-fix-measure workflow. Use when adding a model or filter, when a page or endpoint is slow, or when reviewing queries.
---

# Indexing & Query Optimization

An index is a pre-sorted shortcut. It makes reads cheaper and **every write slightly more expensive**, so add the ones your real queries need and remove the ones nothing uses. Work from evidence (`EXPLAIN`), not guesses.

## 1. Workflow: find -> explain -> fix -> measure

1. **Find** the slow or frequent query: slow-query log, `pg_stat_statements`, ORM query logging, Django Debug Toolbar, APM.
2. **Explain** it: `EXPLAIN (ANALYZE, BUFFERS)` (Postgres), `EXPLAIN ANALYZE` (MySQL 8), `EXPLAIN QUERY PLAN` (SQLite). `ANALYZE` actually runs the query - do not run it on destructive statements outside a transaction you roll back.
3. **Fix** with the smallest change (index, query shape, projection, pagination).
4. **Measure** again on realistic data volume (an index that helps 100 rows may be ignored at 100,000 and vice versa). Keep the change only if the numbers improve.

## 2. Reading the plan

| You see | Meaning | Usually do |
| --- | --- | --- |
| Seq Scan / full table scan on a big table with a selective filter | no usable index | add an index matching the filter |
| Index Scan / Index Only Scan | index used (Only = no table visit) | good; check rows and loops |
| estimated rows far from actual rows | stale statistics | `ANALYZE` (SQLite: `PRAGMA optimize`) |
| Sort with disk spill / filesort / temp b-tree | sort not served by an index | index in `ORDER BY` order, or add `LIMIT` |
| Nested loop with a huge `loops` count | N+1 inside the database | join/index the inner side |
| high "Rows Removed by Filter" | index returns many rows then filters | make the index more specific (composite/partial) |

## 3. Choosing an index

**Composite order rule:** equality columns first, then the range column, then the sort column. The index serves the **leftmost prefix**.

```sql
-- query: WHERE tenant_id = ? AND status = 'live' AND created_at > ? ORDER BY created_at DESC
CREATE INDEX idx_item_tenant_status_created ON item (tenant_id, status, created_at DESC);
```

| Query pattern | Index |
| --- | --- |
| `WHERE a = ?` | `(a)` |
| `WHERE a = ? AND b = ?` | `(a, b)` (or `(b, a)` - put the more selective/most-used leading) |
| `WHERE a = ? ORDER BY c` | `(a, c)` - the sort comes free |
| `WHERE a = ? AND b > ?` | `(a, b)` - range last |
| only a few rows qualify (`status='pending'` of millions) | **partial** index `... WHERE status = 'pending'` |
| list view reads 2 extra columns | **covering**: `INCLUDE (col)` (Postgres 11+/SQL Server) or add trailing columns, to allow index-only scans |
| `WHERE lower(email) = ?` | **expression** index on `lower(email)` (functions on a column defeat a plain index) |
| `WHERE slug = ?` / natural keys | **unique** index (also enforces integrity) |
| `LIKE 'abc%'` | b-tree works (with right collation/ops class); `LIKE '%abc'` does not |
| substring / fuzzy search | trigram (`pg_trgm` GIN) or full-text search, not b-tree |
| JSON containment (`@>`) | GIN on the JSONB column |
| huge append-only time series | BRIN on the time column |

**Foreign keys:** PostgreSQL does **not** index the referencing column automatically; add one (joins and cascading deletes scan it). MySQL/InnoDB creates it.

**Do not index:** low-cardinality booleans alone, columns never filtered/sorted/joined, or duplicate prefixes (`(a)` is redundant if `(a, b)` exists - unless uniqueness or size matters).

**Cost:** every index slows inserts/updates and uses memory. On a write-heavy weak database, keep indexes to what the queries prove they need, and batch writes ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)). Periodically list unused indexes (`pg_stat_user_indexes.idx_scan = 0`) and drop them.

## 4. Query shape that keeps indexes usable

- No function/arithmetic/cast on the indexed column in `WHERE` (`WHERE date(created_at) = ...` -> range on `created_at`).
- Match types (a string compared to an integer column can disable the index through implicit cast).
- Prefer `EXISTS` for "is there any", and `LIMIT 1`; avoid `COUNT(*) > 0`.
- Replace `OR` across different columns with `UNION ALL` or separate indexed queries when the planner cannot use one index.
- Avoid huge `IN (...)` lists; join against a temp/values list instead.
- `DISTINCT` hiding duplicate joins is a smell: fix the join.

## 5. Projection and row width

- Select only the columns the view needs (`SELECT id, title, price`), never `SELECT *` for lists. Big `TEXT`/`JSON` columns stay out of list queries.
- ORM: Django `.only()`/`.defer()`/`.values()`/`.values_list()`; Prisma `select`; SQLAlchemy `load_only`.
- Narrow rows = more rows per page of memory = fewer disk reads on a weak server.

## 6. N+1: the most common slowdown

One query for the list + one query per row for a relation. Detect it with a query counter; fix with a join or batched fetch.

```python
# Django
Course.objects.select_related("category").prefetch_related("lessons")   # FK/one-to-one: join; reverse/M2M: one extra query
# conditional or filtered prefetch
Course.objects.prefetch_related(Prefetch("lessons", queryset=Lesson.objects.only("id", "title")))
```
```ts
// Prisma
prisma.course.findMany({ include: { category: true, lessons: { select: { id: true, title: true } } } });
```
Serializers must not trigger queries (`SerializerMethodField`, properties that hit the DB): prefetch first, serialize second. Assert the query count in tests.

## 7. Pagination and counts

- **OFFSET gets slower the deeper you go** (the database still walks the skipped rows). For feeds and large lists use **keyset (cursor) pagination**: `WHERE (created_at, id) < (:last_created, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20` with a matching index.
- Always `LIMIT`; cap the page size server-side (e.g. max 100).
- `COUNT(*)` on a large table is a scan. Options: "has next page" (fetch `limit + 1`), cached count with a TTL, approximate count from planner statistics, or a maintained counter. Do not recount on every page view.

## 8. Writes also use indexes

`UPDATE ... WHERE x = ?` and `DELETE ... WHERE x = ?` need the same indexes as reads. An unindexed foreign key makes parent deletes scan the child table. Bulk-load first, then create secondary indexes, when loading very large datasets.

## 9. Creating indexes safely in production

- PostgreSQL: `CREATE INDEX CONCURRENTLY` (does not block writes; cannot run inside a transaction block). Django: `AddIndexConcurrently` from `django.contrib.postgres.operations` in a migration with `atomic = False`.
- MySQL 8: online DDL (`ALGORITHM=INPLACE, LOCK=NONE` where supported).
- SQLite: index creation locks the database - do it in a quiet window.
- Name indexes predictably: `idx_<table>_<cols>`; declare them in the model/schema so they are versioned ([`db-schema-design-and-migrations`](../db-schema-design-and-migrations/SKILL.md)).

```python
class Meta:                                    # Django
    indexes = [
        models.Index(fields=["tenant", "status", "-created_at"], name="idx_item_tenant_status_created"),
        models.Index(fields=["created_at"], condition=models.Q(status="pending"), name="idx_item_pending"),  # partial
        models.Index(fields=["slug"], include=["title"], name="idx_item_slug_cover"),   # covering (PostgreSQL)
    ]
```

## 10. Statistics and housekeeping

- Keep planner statistics fresh (`ANALYZE`; autovacuum on in Postgres; `PRAGMA optimize` in SQLite).
- Vacuum/bloat: large churn tables need healthy autovacuum.
- Re-check plans after big data growth or a version upgrade.

## 11. Checklist

- [ ] Every filter/sort/join column in a hot query is covered by an index chosen from `EXPLAIN`.
- [ ] Composite indexes follow equality -> range -> sort; no redundant prefixes.
- [ ] Foreign keys are indexed (Postgres).
- [ ] No function on an indexed column in `WHERE`.
- [ ] No N+1; query counts asserted; serializers do not query.
- [ ] Lists project only needed columns; pages are capped; deep lists use keyset pagination.
- [ ] No per-view `COUNT(*)` on big tables.
- [ ] New indexes created online in production; unused indexes reviewed.
