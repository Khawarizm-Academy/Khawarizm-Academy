---
name: cache-strategy-layers
description: Complete caching strategy for web apps - the layers (client memory/SWR, HTTP cache headers and ETag, CDN/edge, application cache such as Redis or in-process LRU, request memoization, database cache), what to cache and what not, key design, TTL with jitter, invalidation (TTL, write-through, write-invalidate, versioned keys, tags), stampede protection, negative caching, serverless caveats, and monitoring. Use whenever data is read more than it changes, pages are slow, the database is weak, or you add an endpoint.
---

# Cache Strategy - layers, keys, invalidation

The fastest query is the one you never run. Cache **at the outermost layer that is correct** for the data; each layer you pass costs more time and database load.

## 1. The layers (outermost first)

| # | Layer | Typical lifetime | Controlled by |
| --- | --- | --- | --- |
| 1 | **Client memory / SWR cache** | seconds to minutes | frontend data layer ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)) |
| 2 | **Browser HTTP cache** | per response | `Cache-Control`, `ETag`, `Last-Modified` |
| 3 | **CDN / edge cache** | per response, shared by all users | `s-maxage`, `Surrogate-Key`/tags, purge API |
| 4 | **Application cache** (Redis/Memcached/KV, or in-process LRU) | seconds to hours | your code |
| 5 | **Request-scoped memo** | one request | dict / dataloader |
| 6 | **Query/result cache, materialized view, summary table** | minutes to a day | scheduled refresh |
| 7 | **Database buffer cache** | automatic | engine memory |

Walk it top-down: can the browser skip the request? can the CDN answer? can Redis answer? only then query the database ([`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md)).

## 2. What to cache - and what not

| Cache | Do not cache (or key carefully) |
| --- | --- |
| catalogs, listings, categories, settings, filter options | per-user private data in a shared cache without the user in the key |
| detail pages that change rarely | anything with money/stock where a stale read causes harm |
| expensive aggregates and counts | responses that set cookies or depend on auth, in public caches |
| results of slow third-party calls | rapidly changing data with strict freshness needs |
| static assets (forever, hashed names) | error responses (except brief negative caching) |

## 3. HTTP caching (free speed, set it deliberately)

```http
# hashed static assets (app.3f9c1.js, images with content hash)
Cache-Control: public, max-age=31536000, immutable

# HTML documents: always revalidate (or very short CDN TTL with SWR)
Cache-Control: no-cache
# or: public, s-maxage=60, stale-while-revalidate=300

# public read API (catalog, detail)
Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=600
ETag: "v123-9ab"                      # client sends If-None-Match, server answers 304 with no body

# private / per-user
Cache-Control: private, no-store      # or private, max-age=0, must-revalidate for revalidation
```

- **ETag/304** saves bandwidth and serialization; compute the ETag from `updated_at`/a version, not by rendering first.
- `Vary` lists request headers that change the response (`Accept-Encoding`, `Accept-Language`, `Origin` when CORS echoes it). Do not `Vary: Cookie` on public pages.
- Never let a CDN cache a response that contains `Set-Cookie` or user-specific data.
- Give hashed assets a long immutable lifetime and **never** reuse a filename for changed content.

## 4. Key design

```
<app>:<namespace>:<version>:<entity>:<id-or-hash-of-params>
shop:catalog:v7:items:{type=courses,level=all,page=2,q=python}
```

- **Deterministic:** sort and normalize params so the same query always yields the same key.
- Include everything that changes the answer: locale, role/tenant, filters, page, sort.
- Keep a **namespace token** so you can invalidate a whole family (`catalog`).
- Keep keys short; hash long param blobs.

## 5. Invalidation (the hard part) - choose per data type

| Strategy | How | Use when |
| --- | --- | --- |
| **TTL only** | expire after N seconds | staleness is acceptable; simplest, try this first |
| **Write-invalidate** | delete/mark stale the keys the write affects | correctness matters; few key families |
| **Write-through** | write the new value into the cache with the DB write | the new value is known; avoids a refetch |
| **Versioned keys** | bump `catalog:version`; old keys age out | invalidating many keys at once without scanning |
| **Tags / surrogate keys** | tag responses (`product-42`) and purge by tag at the CDN | edge-cached pages that depend on several entities |

Rules: invalidate **after the commit** (`on_commit`), not before - otherwise a reader repopulates the cache with old data. Prefer namespace/version invalidation over `KEYS *` scans (use `SCAN` if you must iterate).

## 6. Stampede protection (many requests, one expired key)

- **Single-flight / lock:** the first miss recomputes; others wait or serve stale.
- **Stale-while-revalidate:** serve the expired value immediately while one request refreshes it in the background.
- **TTL jitter:** `ttl * random(0.9, 1.1)` so keys do not all expire together.
- **Early refresh:** refresh when the remaining TTL drops below a threshold.
- **Negative caching:** cache "not found"/empty for a short TTL (30-60 s) so repeated misses do not hammer the database.

## 7. Cache-aside pattern

```python
def get_catalog(params):
    key = f"shop:catalog:{version()}:{digest(params)}"
    hit = cache.get(key)
    if hit is not None:
        return hit
    value = build_catalog(params)                       # the expensive query, indexed and batched
    cache.set(key, value, timeout=jitter(300))          # TTL with jitter
    return value
```
```ts
// Node + Redis: same shape; wrap in a helper so every caller gets TTL, jitter, and single-flight for free
const value = await cached(`shop:catalog:${v}:${hash(params)}`, 300, () => buildCatalog(params));
```
Build one small helper (`cached(key, ttl, loader)`) and use it everywhere instead of hand-rolling get/set in each view.

## 8. Request-scoped memoization

Within a single request, fetch each entity once and pass it down (or use a dataloader that batches `id IN (...)`). This removes duplicate queries that no TTL cache can see.

## 9. Serverless and multi-instance caveats

- An **in-process** cache is per instance and dies on cold start; it is fine for tiny immutable lookups, wrong for shared state.
- Use a shared store (Redis/KV) or the CDN for anything that must be consistent across instances.
- Do not rely on local disk for cache on read-only/ephemeral filesystems.

## 10. Frontend side (summary)

Deterministic keys, `staleTime`/`cacheTime`, `keepPreviousData`, prefetch on hover, invalidate by namespace after mutations, update the cache with mutation results instead of refetching. Details: [`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md). Writes that feed caches: [`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md).

## 11. Monitor

Track hit ratio per namespace, evictions, memory, and p95 latency with and without the cache. A cache with a low hit ratio is cost without benefit; remove or re-key it.

## 12. Checklist

- [ ] The outermost correct layer is used (HTTP/CDN before app cache before DB).
- [ ] Static assets are immutable and hashed; HTML revalidates; private data is `no-store`/`private`.
- [ ] Keys are deterministic, namespaced, and include everything that varies the answer.
- [ ] Every cached value has a TTL (with jitter) and a defined invalidation path run after commit.
- [ ] Stampede protection exists for hot expensive keys; negative results are cached briefly.
- [ ] Nothing user-specific or money-critical sits in a shared cache without proper keying.
- [ ] Hit ratio is observable.
