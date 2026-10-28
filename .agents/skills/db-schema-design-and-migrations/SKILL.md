---
name: db-schema-design-and-migrations
description: Relational schema design and safe migrations for web apps - primary key choices (UUID vs bigint vs slug as business key), constraints, timestamps in UTC, money, enums, JSON columns, soft delete, denormalized counters, and zero-downtime migrations (expand/contract, batched backfills, concurrent indexes). Use when creating or changing models/tables, planning a migration, seeding data, or reviewing a schema.
---

# Schema Design & Migrations

Design the tables around how the data is **queried and written**, put integrity in the database, and change it in small reversible steps.

## 1. Primary keys

| Choice | Good for | Watch out |
| --- | --- | --- |
| `bigint` identity | smallest, fastest joins and indexes | guessable in URLs; merging databases needs care |
| UUID | non-guessable, generate client-side, easy to merge | random UUIDv4 inserts scatter across the B-tree; prefer time-ordered UUIDv7 where available; bigger indexes |
| `slug` (string) as **business key**, not PK | readable URLs that match the route param | keep a separate surrogate PK; enforce `UNIQUE`; never reuse a slug |

Pick one PK convention for the whole project and record it in the profile ([`core-project-profile`](../core-project-profile/SKILL.md)). A common solid pattern: surrogate PK + unique `slug`/public id for URLs.

## 2. Put integrity in the database

- `NOT NULL` by default; null only when "unknown" is a real state.
- `UNIQUE` for natural keys (`UNIQUE(user_id, course_id)` makes duplicates impossible and makes upserts safe).
- `FOREIGN KEY` with a deliberate `ON DELETE` (`CASCADE`, `SET NULL`, `RESTRICT`).
- `CHECK` for ranges and enums (`CHECK (rating BETWEEN 0 AND 5)`).
- App-level validation is for UX; the database constraint is for truth.

## 3. Types that avoid regret

- **Money:** integer minor units (`price_cents`) or `NUMERIC(p, s)`; never float.
- **Time:** store UTC in timezone-aware columns; convert at the edge. `created_at` and `updated_at` on every mutable table.
- **Enums/choices:** a small lookup table, a `CHECK`, or a DB enum - and the **same list imported everywhere** (one source of truth), not literals scattered through code.
- **Text:** bounded lengths where there is a real bound; `TEXT` otherwise.
- **JSON columns:** for genuinely schemaless or display-only payloads (settings, small lists). Anything you filter, sort, join, or constrain on becomes a real column or a child table. Index JSONB with GIN only when you query inside it.
- **Booleans:** real booleans, not `'Y'/'N'` strings.

## 4. Normalization and deliberate denormalization

- Start normalized (each fact stored once).
- Denormalize **on evidence**: counters (`lessons_count`, `reviews_count`, `rating_avg`), precomputed list-view fields, search documents. Keep them correct with atomic SQL updates (`n = n + 1`) or a periodic recompute, and say in a comment which source is the truth.
- Read-heavy aggregates: materialized view or summary table refreshed on a schedule beats recomputing per request.
- Keep list rows narrow: split rarely used big columns (long text, blobs) into a side table so list scans stay cheap.

## 5. Deletion and history

- **Soft delete** (`deleted_at`) adds a filter to every query and breaks unique constraints; use partial unique indexes (`WHERE deleted_at IS NULL`) and a default manager that hides deleted rows - or use hard delete plus an audit table.
- Audit/history tables for anything legally or operationally sensitive; append-only.

## 6. Naming

`snake_case` tables and columns, singular or plural **consistently**, FK columns `<entity>_id`, index names `idx_<table>_<cols>`, constraint names explicit. The API may use another casing (e.g. camelCase), but the conversion happens in exactly one place ([`be-architecture`](../be-architecture/SKILL.md)).

## 7. Migrations: small, reversible, backward compatible

1. **One concern per migration.** Schema changes and data backfills are separate migrations.
2. **Never edit a migration that has been applied elsewhere**; add a new one.
3. **Expand -> migrate -> contract** for zero downtime:
   - *Expand:* add the new column/table (nullable or with a safe default), deploy code that writes both.
   - *Migrate:* backfill in **batches** (a few thousand rows per transaction), not one giant `UPDATE`.
   - *Contract:* switch reads to the new shape, deploy, then drop the old column in a later release.
4. **Avoid long locks:** adding a column with a volatile default or a `NOT NULL` without a default can rewrite/lock a big table. Add nullable -> backfill -> add the constraint (Postgres: `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT`).
5. **Indexes concurrently** in production ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §9).
6. **Renames are two-step** (add + copy + switch + drop); a plain rename breaks the running old code.
7. Every migration is **reversible** or explicitly marked irreversible with a reason.
8. CI check that models and migrations agree (`makemigrations --check`).

```python
# batched backfill (Django): short transactions, resumable
def backfill(apps, schema_editor):
    Item = apps.get_model("shop", "Item")
    while True:
        batch = list(Item.objects.filter(slug__isnull=True)[:2000])
        if not batch:
            break
        for item in batch:
            item.slug = slugify(item.title)           # unique-slug handling omitted for brevity
        Item.objects.bulk_update(batch, ["slug"], batch_size=500)
```

## 8. Seed and fixture data

- Seeds are **idempotent** (running twice changes nothing): upsert by natural key.
- Reference data (categories, filter options) lives in a seed or fixture; demo data is clearly separate from production data.
- Content beyond the seed is managed through the admin/back-office ([`be-architecture`](../be-architecture/SKILL.md)), not by editing the seed.
- Wrap big seeds in transactions per chunk ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)).

## 9. Checklist

- [ ] One PK convention; public id/slug unique and stable.
- [ ] NOT NULL, UNIQUE, FK, CHECK constraints express the real rules.
- [ ] UTC timestamps; money not float; enums defined once.
- [ ] Indexes declared with the model, chosen from queries.
- [ ] Migrations are small, reversible, and backward compatible; backfills are batched.
- [ ] Seed is idempotent; production data never depends on demo data.
