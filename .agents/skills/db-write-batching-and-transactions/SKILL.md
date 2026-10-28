---
name: db-write-batching-and-transactions
description: How to write to a weak or slow database efficiently - group compatible statements into one transaction and ONE commit instead of a commit per action, use bulk insert/update/upsert, the unit-of-work pattern, write coalescing, write-behind buffers for counters and analytics, client-side mutation batching, and never refresh/re-fetch after writes (use RETURNING, the returned object, and the cache). Includes safe-vs-unsafe-to-batch rules, durability trade-offs, Django, Node, and SQL examples. Use for any code that inserts, updates, imports, seeds, syncs, or saves in loops.
---

# Write Batching, Transactions & One Commit

On a weak database the expensive part of a write is usually the **commit** (a durable flush to disk) and the **round trip**, not the row. `N` separate commits cost `N` flushes; one transaction with `N` statements costs one. So: **collect compatible commands, send them together, commit once, and do not ask the database to hand the same data back again.**

## 1. The mental model

```
BAD   request -> INSERT, COMMIT, SELECT (refresh) -> UPDATE, COMMIT, SELECT -> ...
GOOD  request -> collect changes in memory -> BEGIN -> one bulk INSERT, one bulk UPDATE -> COMMIT -> done
                                              (returned rows/ids reused; cache updated, no refetch)
```

Five levels, use as many as the data allows (cheapest to adopt first):

1. **One transaction per request/job** - all writes of a unit of work commit together.
2. **Bulk operations** - multi-row insert, bulk update, upsert, `COPY`.
3. **Write coalescing** - several updates to the same row/key in one window become one write (last write wins; counters sum).
4. **Write-behind buffer** - non-critical, high-frequency writes (views, progress, last-seen, analytics) are buffered and flushed on a size/time trigger.
5. **Client-side batching** - the UI debounces autosave, queues mutations, and calls a batch endpoint.

## 2. Safe vs must-commit-now

| Batch it (loss of the last moments is acceptable or rebuildable) | Commit immediately (never buffer) |
| --- | --- |
| page/video views, impressions, analytics events | payments, refunds, wallet/credit balances |
| learning progress, watch position, last-seen | stock/inventory decrements that must not oversell |
| notifications marked read, preference toggles | account creation, password/role changes, auth sessions |
| search history, recently viewed, likes counters | anything the next request must read and rely on correctness |
| bulk imports, seeds, migrations of data | anything with a legal/audit requirement |

In-memory buffers are **lost on crash/restart and are not shared across workers or serverless instances**. If losing them is unacceptable, use a durable store (Redis list/stream, a queue, or an outbox table) for the buffer.

## 3. Level 1 - one transaction, one commit

**Django**
```python
from django.db import transaction

@transaction.atomic                      # one commit for everything below
def enroll(user, course_ids):
    rows = [Enrollment(user=user, course_id=c) for c in course_ids]
    Enrollment.objects.bulk_create(rows, ignore_conflicts=True)   # one INSERT, duplicates skipped
    Course.objects.filter(id__in=course_ids).update(enrolled=F("enrolled") + 1)  # one UPDATE
```
- `ATOMIC_REQUESTS = True` wraps each request in a transaction (one commit per request). Good default for write-heavy APIs as long as views stay short and make no slow network calls.
- Nested `atomic()` blocks are savepoints, not extra commits.
- Side effects that must happen only after a successful commit (emails, queue publish, cache invalidation): `transaction.on_commit(callback)`.

**Node (Prisma / Drizzle / Knex)**
```ts
await prisma.$transaction([
  prisma.enrollment.createMany({ data: rows, skipDuplicates: true }),
  prisma.course.updateMany({ where: { id: { in: ids } }, data: { enrolled: { increment: 1 } } }),
]);
// Drizzle: await db.transaction(async tx => { await tx.insert(t).values(rows); ... })
// Knex:    await knex.batchInsert('t', rows, 1000)
```

**Raw SQL**
```sql
BEGIN;
INSERT INTO enrollment (user_id, course_id) VALUES (1,10),(1,11),(1,12) ON CONFLICT DO NOTHING;
UPDATE course SET enrolled = enrolled + 1 WHERE id IN (10,11,12);
COMMIT;
```

## 4. Level 2 - bulk operations

| Need | Do this | Not this |
| --- | --- | --- |
| insert many rows | `bulk_create(objs, batch_size=1000)` / `createMany` / multi-row `INSERT` / `COPY` for huge loads | `for obj: obj.save()` |
| update many rows, same value | `qs.update(field=value)` - one UPDATE | load, loop, `save()` |
| update many rows, different values | `bulk_update(objs, ["field"], batch_size=500)` or `UPDATE ... FROM (VALUES ...)` | `save()` per row |
| insert-or-update | `bulk_create(objs, update_conflicts=True, unique_fields=[...], update_fields=[...])` / `INSERT ... ON CONFLICT DO UPDATE` | `get_or_create` / `update_or_create` in a loop |
| counters | `F("n") + 1` (atomic in SQL) or one `UPDATE ... SET n = n + :delta` | read, add in Python, write |
| delete many | `qs.delete()` / `DELETE ... WHERE id IN (...)` in chunks | delete per row |

Notes:
- Bulk APIs usually **skip `save()` overrides and per-row signals**; move that logic into the bulk path or the service function.
- Whether `bulk_create` returns primary keys depends on the database backend; check your engine instead of assuming.
- SQLite limits the number of bound parameters per statement; let the ORM batch, or chunk to a few hundred rows per statement.
- Chunk big loads (500-5000 rows) and commit **per chunk** so a failure does not lose everything and locks stay short.
- `update_fields`/`only()` so each write sends only what changed.

## 5. Never refresh, never re-fetch

After a write you almost always already have the answer:

- Use the object/rows you just built; use `RETURNING` (Postgres/SQLite/MariaDB) or the ORM's returned values for generated columns.
- Do **not** call `refresh_from_db()` / re-`SELECT` "to be sure". If one field is database-computed, `RETURNING` just that field.
- Update the cache with the new value ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)) instead of invalidating and refetching when the new value is known.
- Within one request, load each thing **once** (request-scoped memo or dataloader-style batching) and pass it down.
- The frontend does the same: apply the mutation result to the client cache (`dataCacheManager.set` / `setQueryData`), invalidate only the affected namespace ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).

## 6. Level 3 & 4 - coalescing and write-behind

**Coalesce:** keep a map `key -> latest value` for the window and write once. Ten "progress = 12%, 13%, ... 21%" updates become one `UPDATE progress = 21`.

**Write-behind buffer (sketch)**
```python
# durable-ish: Redis hash + periodic flush job; many workers can add safely
def record_view(video_id):                      # called on every view - no DB touch
    redis.hincrby("buf:views", video_id, 1)

def flush_views():                              # run every N seconds or on a size trigger
    try:
        redis.rename("buf:views", "buf:views:flushing")   # atomic swap; new views keep landing in a fresh hash
    except redis.ResponseError:                            # no buffer yet (key missing)
        return
    pending = redis.hgetall("buf:views:flushing")
    with transaction.atomic():
        for vid, delta in pending.items():
            Video.objects.filter(pk=vid).update(views=F("views") + int(delta))
    redis.delete("buf:views:flushing")                     # only after the commit succeeded
```
(The sketch is pseudocode for the pattern: adapt the Redis client calls, and handle a leftover `buf:views:flushing` from a crashed flush by flushing it first.)
Rules: flush on **size** (e.g. 500 keys) **or time** (e.g. 5-30 s) **or shutdown**; make the flush idempotent or atomic-swap the buffer; cap buffer size; alert if flushes fail. A purely in-process buffer is acceptable only for data you can afford to lose.

## 7. Level 5 - client-side batching

- **Debounce autosave** (e.g. 500-1000 ms after the last keystroke) and save **once**.
- **Queue mutations** and send them together on an interval, on blur, on `visibilitychange`/`pagehide` (use `navigator.sendBeacon` for the final flush).
- Offer a **batch endpoint** (`POST /items/batch` with `{ create: [], update: [], delete: [] }`) that applies everything in one transaction and returns the results; one request, one commit.
- **Optimistic updates** make the UI instant; reconcile with the server response, roll back on failure.
- Send an **idempotency key** with each batch so a retry cannot double-apply ([`core-error-handling`](../core-error-handling/SKILL.md)).

## 8. Transaction hygiene (batching only works if transactions stay short)

- Do the slow things (HTTP calls, file I/O, rendering, sleeping) **outside** the transaction; prepare data first, open the transaction, write, commit.
- Lock rows in a consistent order to avoid deadlocks; use `select_for_update()` only when you truly need the lock.
- Retry on deadlock/serialization failures with backoff.
- Seed/import/migration scripts: one transaction per chunk, not per row.
- Make batch writes idempotent (`ON CONFLICT`, unique keys) so a retry is harmless.

## 9. Durability knobs (explicit trade-off - only for rebuildable data)

| Engine | Knob | Trade-off |
| --- | --- | --- |
| SQLite | `journal_mode=WAL` + `synchronous=NORMAL` | far fewer fsyncs; a power loss may lose the last transactions but does not corrupt the database |
| PostgreSQL | `SET LOCAL synchronous_commit = off` inside a transaction | commit returns before the WAL flush; a crash may lose the last fraction of a second of commits, no corruption; apply per-transaction to non-critical writes only |
| MySQL/InnoDB | `innodb_flush_log_at_trx_commit` = 2 | similar trade-off, server-wide |

Prefer fixing the number of commits first; use these only for data you can afford to lose.

## 10. Measure it

- Count queries and commits per request in tests (`assertNumQueries`, a commit counter, or the engine's stats: `pg_stat_database.xact_commit`, `pg_stat_statements`).
- Targets: a write endpoint = one transaction; an import of N rows = ceil(N / chunk) commits, never N.
- Compare before/after on the same dataset and record the numbers.

## 11. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| `save()`/`INSERT` in a loop | bulk operation in one transaction |
| `get_or_create` per item | one `SELECT ... IN`, then one `bulk_create(ignore_conflicts=True)` |
| write, then `refresh_from_db()`/re-`SELECT` | reuse the object, `RETURNING`, update the cache |
| autosave on every keystroke | debounce + batch |
| polling the API to see your own write | apply the mutation result locally |
| transaction around an API call | prepare outside, write inside |
| in-memory buffer on serverless for must-keep data | durable queue/Redis/outbox |
| batching money/stock changes | commit immediately with proper locking |

## 12. Checklist

- [ ] Each write path has a defined unit of work and commits once.
- [ ] No per-row save/insert/update/delete in loops; bulk or set-based SQL used.
- [ ] Counters use atomic SQL expressions or a flushed delta buffer.
- [ ] No refresh/re-fetch after writes; cache and client updated from the result.
- [ ] Non-critical high-frequency writes are coalesced or buffered with a flush trigger.
- [ ] Critical writes (money, stock, auth) are excluded from buffering.
- [ ] Side effects run in `on_commit`; transactions are short; batches are idempotent.
- [ ] Query and commit counts are asserted in tests.
