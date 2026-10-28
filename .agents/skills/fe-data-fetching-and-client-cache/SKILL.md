---
name: fe-data-fetching-and-client-cache
description: Frontend data fetching with a client cache - stale-while-revalidate (React Query/TanStack Query, SWR, or a custom cache hook), deterministic cache keys, staleTime/cacheTime, keepPreviousData, request deduplication, prefetch on hover, optimistic updates, mutation batching and debouncing, invalidation by namespace, error and retry states, and avoiding refetch loops. Use when a component loads data, when filters/pagination change, or when the UI talks to the API.
---

# Data Fetching & Client Cache

The network is the slowest dependency you have. **Render from cache instantly, revalidate quietly, send fewer and smaller requests.**

## 1. Mental model: stale-while-revalidate (SWR)

1. Look up the key in the client cache synchronously.
2. **Fresh** (younger than `staleTime`): render now, no request.
3. **Stale but cached:** render cached data now, refetch in the background (`isFetching`, subtle shimmer line).
4. **Miss:** if `keepPreviousData`, keep showing the last data while the new key loads; otherwise `isLoading` and show the data-section skeleton.
5. **Error:** `isError` with a themed retry block - never an endless spinner.

Use a proven library (TanStack Query, SWR, RTK Query, Apollo) when the project allows. If a custom hook is the project's standard, it must keep these semantics (`useSyncExternalStore`, store-notification callbacks for previous-data memory, not `setState` during render).

## 2. Keys: deterministic and complete

```ts
['catalog-items', { type, level, page, q }]      // list: every filter that changes the answer
['catalog-detail', slug]                         // detail: the id
['dashboard', 'stats']                           // namespaced: invalidate every ['dashboard', ...]
```
- Same inputs -> same key (stable object key order or a serializer).
- Namespace first (feature), then specifics, so one `invalidate(['dashboard'])` marks the whole family stale.
- Keys mirror the server cache keys where possible ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md) §4).

## 3. Canonical data-section pattern

```tsx
const { data, isLoading, isFetching, isError, error, refetch } = useCachedData(
  ['feature-items', filters],
  () => fetchItems(filters),
  { staleTime: 5 * 60_000, cacheTime: 30 * 60_000, keepPreviousData: true },
);
if (isLoading) return <GridSkeleton count={6} />;
if (isError)   return <StatePanel tone="danger" title="Could not load" onRetry={refetch} />;
if (!data.length) return <EmptyState onResetFilters={reset} />;
return <Grid items={data} />;
```
Render order: loading -> error -> empty -> content. Only the **data section** re-renders on a filter change; controls, header, and sidebar stay mounted.

## 3.1 Choosing staleTime

| Data | staleTime |
| --- | --- |
| reference data (categories, filters) | long (minutes-hours) |
| catalog lists/details | minutes |
| user-specific dashboard | tens of seconds to a few minutes |
| live-ish (notifications, prices) | seconds, or push (SSE/WebSocket), not tight polling |

## 4. Fewer requests

- **Deduplicate:** concurrent calls with the same key share one request.
- **Do not poll tightly.** Prefer a long `staleTime`, refetch on window focus/reconnect, ETag/304 revalidation, or server push. If you must poll, back off and stop when the tab is hidden.
- **Prefetch:** on link/card hover or focus, `prefetch(['catalog-detail', id], fetcher)`; the detail page reads the same key and renders instantly. Prefetch the route chunk too.
- **Batch reads:** ask for many ids in one call (`?ids=`) instead of a request per item; use batch endpoints ([`be-api-design`](../be-api-design/SKILL.md) §6).
- **Select only needed fields** (`?fields=`), and request small list payloads.
- **Cancel** stale in-flight requests (`AbortController`) when the key changes.

## 5. Mutations: fewer, smarter

- **Apply the response to the cache** (`cache.set(key, result)`) instead of invalidating and refetching when the server returned the new value ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md) §5).
- **Optimistic update:** update the cache first, send the request, roll back on error, reconcile with the response.
- **Debounce** high-frequency writes (autosave 500-1000 ms), **queue and batch** them, flush on blur/`pagehide` with `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- Send an **idempotency key** for retryable POSTs.
- After a mutation, invalidate **only the affected namespace**, never `clear()`.
- Logout/hard reset: `clear()` the cache so the next user never sees old data.

## 6. Cache API (the contract a custom cache should offer)

| Call | Purpose |
| --- | --- |
| `get/set(key, data)` | read / write (optimistic update, mutation result) |
| `invalidate(prefix)` | mark every key under a namespace stale |
| `prefetch(key, fetcher)` | warm the cache |
| `clear()` | logout / hard reset |
| `subscribe(key, fn)` | notify hooks (feeds `useSyncExternalStore`) |

## 7. Error, offline, and race handling

- Retry with backoff (2-3 attempts) for network errors only; not for 4xx.
- Keep showing cached data when offline/erroring and mark it stale; let the user retry.
- Ignore out-of-order responses (key-scoped state or abort).
- Show a quiet "updating" indicator (`isFetching`) rather than a blocking spinner.

## 8. Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| `useEffect(() => fetch(...))` in every component | one cached hook |
| fetching in a parent and prop-drilling five levels | fetch where data is used; the cache dedupes |
| skeleton on every filter change | `keepPreviousData`; skeleton only on a cold miss |
| refetch after every mutation | write the response into the cache |
| polling every 2 seconds | long staleTime, focus refetch, ETag, or push |
| new object as a key each render | memoize/serialize the key |
| mirroring URL state into `useState` | derive from the URL ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)) |

## 9. Checklist

- [ ] Every fetch goes through the cached hook with a deterministic, namespaced key.
- [ ] staleTime/cacheTime chosen per data type; keepPreviousData on filtered lists.
- [ ] Loading, error (retry), and empty states exist ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)).
- [ ] Hover prefetch for detail routes; no tight polling; requests deduped and cancellable.
- [ ] Mutations update the cache from the response, batch/debounce, and invalidate narrowly.
