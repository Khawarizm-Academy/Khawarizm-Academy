---
name: db-weak-database-playbook
description: Entry point for any project whose database is weak, small, shared, remote, or slow (free-tier Postgres, SQLite, low IOPS, few connections, serverless). Gives the cheapest-first optimization ladder - stop the query, fewer queries, fewer commits, faster queries, smaller data, engine tuning, infrastructure - plus per-request budgets, a triage worksheet, and links to the batching, indexing, and caching skills. Use at the start of any backend/data work, when pages feel slow, or when the DB is the bottleneck.
---

# Weak Database Playbook

A weak database is not fixed by a bigger server first; it is fixed by **asking it for less**. Work the ladder top-down and stop when the budget is met. Read the DB engine, size, and limits from the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)).

## 1. What makes a database "weak" - and what each one punishes

| Weakness | What it punishes | Main cure |
| --- | --- | --- |
| Slow disk / low IOPS / shared host | every **commit** (fsync), every table scan | batch commits, indexes, cache |
| High latency to the DB (remote, cross-region) | every **round trip** | fewer queries, batch reads, cache |
| Few connections (free tiers) | many workers, serverless fan-out | pooling, short transactions, cache |
| Small RAM / small buffer cache | big sorts, wide rows, large result sets | projection, pagination, indexes |
| Single writer (SQLite) | concurrent writes | short write transactions, queue writes, WAL |
| Cold starts (serverless) | connection setup per invocation | pooler, reuse connection, edge cache |

## 2. The cheapest-first ladder

1. **Do not run the query.** Serve it from a cache layer, derive it from data you already hold, or skip it. -> [`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)
2. **Run fewer queries.** Kill N+1, join or prefetch, batch lookups with `IN`, memoize within a request. -> [`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §6
3. **Commit less.** Group compatible writes into one transaction and one commit; use bulk operations; coalesce or buffer non-critical writes. -> [`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)
4. **Make each query cheaper.** Right indexes, select only needed columns, keyset pagination. -> [`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md)
5. **Touch less data.** Paginate, archive cold rows, precompute aggregates, store thumbnails not originals. -> [`db-schema-design-and-migrations`](../db-schema-design-and-migrations/SKILL.md)
6. **Tune the engine.** SQLite pragmas, Postgres settings, connection pool size. (Only after 1-5.)
7. **Scale the infrastructure.** Pooler, read replica, bigger instance. (Last resort, not first.)

## 3. Per-request budgets (set them, then enforce them in tests)

| Request type | Budget |
| --- | --- |
| Read/list endpoint | constant number of queries (typically 1-5) regardless of row count |
| Read of one resource | at most a handful of queries; zero when cached |
| Write endpoint | **at most one transaction and one commit** |
| Page load (all calls together) | no endpoint called twice for the same data |
| Background job | commit per chunk (e.g. 500-5000 rows), not per row |

Enforce in tests with a query-count assertion (`assertNumQueries` in Django; query counters in other stacks).

## 4. Triage worksheet (fill this before changing anything)

1. **Measure**: slowest endpoints (p50/p95), queries per request, total DB time per request, commits per request.
2. **Classify** each slow request: too many queries? too many commits? one slow query? too much data? connection wait?
3. **Pick the rung** on the ladder that matches, fix, **measure again**.
4. Record the before/after numbers in the PR or profile.

## 5. Habits that quietly kill a weak database

- A `save()` or `INSERT` inside a loop. -> bulk operation, one commit.
- A refresh/refetch after every write "to be safe". -> use the returned row and update the cache.
- Polling the API every few seconds. -> SWR with `staleTime`, ETag/304, or server push ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).
- `COUNT(*)` on a big table for every page view. -> cached or approximate count, or "has next page" pagination.
- `SELECT *` including big text/JSON columns on list views. -> project only list fields.
- Transactions held open across network calls or user think-time. -> keep them to the DB work only.
- Using in-process memory as a cache on serverless. -> it is per-instance and cold; use a shared cache.
- Missing index on a foreign key or filter column. -> add it after reading `EXPLAIN`.

## 6. Engine quick-tuning (after the ladder)

**SQLite (local/dev or single-node apps)**: `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout` (e.g. 5000), `foreign_keys=ON`, larger `cache_size`, `temp_store=MEMORY`; keep write transactions short; one writer at a time. SQLite on an ephemeral/read-only serverless filesystem is not a database - use a hosted one.

**PostgreSQL**: connection pooler in front (PgBouncer or the host's pooler) for serverless and many workers; `statement_timeout` and `idle_in_transaction_session_timeout` as safety nets; `pg_stat_statements` on; autovacuum healthy; right-size `work_mem` for your sorts.

**MySQL/MariaDB**: InnoDB buffer pool sized to the working set; multi-row inserts; check `EXPLAIN` for filesort/temporary tables.

Exact setting values depend on hardware and engine version - verify against the engine's docs for your version rather than copying numbers blindly.

## 7. Checklist

- [ ] Engine and limits read from the profile; budgets set.
- [ ] Baseline measured; the bottleneck classified.
- [ ] Ladder worked top-down; each rung's result measured.
- [ ] No per-row commits, no refresh-after-write, no polling loops, no N+1.
- [ ] Query-count assertions guard the budgets.
