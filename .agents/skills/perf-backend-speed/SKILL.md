---
name: perf-backend-speed
description: Backend and API speed playbook - set latency budgets, find the bottleneck, remove N+1 and chatty calls, shape and paginate payloads, compress, move slow work to background jobs, reuse connections, add timeouts, parallelize independent I/O, and load-test. Use when an endpoint is slow, before launch, when reviewing an API, or when choosing between caching, batching, and async work.
---

# Backend Speed

Speed is a budget, not a vibe. Measure, find the biggest cost, remove it, measure again.

## 1. Budgets

| Metric | Reasonable target for a typical JSON API |
| --- | --- |
| p50 / p95 server time, cached read | tens of ms / under ~100-200 ms |
| p95 uncached read | under ~300-500 ms |
| write endpoint | under ~500 ms, one transaction |
| payload size (list) | tens of KB gzip/brotli, not MB |
| queries per request | constant, small (see [`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md)) |

These are starting points; set your own in the profile and enforce with tests/monitoring.

## 2. Find the bottleneck first

- Per-request breakdown: DB time, external-call time, serialization time, CPU. Tools: Django Debug Toolbar / silk, APM, `pg_stat_statements`, `py-spy`/`cProfile`, Node `--prof`/clinic, flame graphs.
- Load test realistic mixes: k6, locust, autocannon, wrk. Test with production-sized data.
- Look at p95/p99, not only the average.

## 3. Highest-return fixes (in order)

1. **Kill N+1 and chatty queries** - join/prefetch, batch with `IN`, memoize per request ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md) §6).
2. **Cache** repeated reads at the right layer ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)).
3. **Batch writes**, one commit ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)).
4. **Shrink the payload:** return only fields the client uses; no nested blobs on list endpoints; drop null/empty keys; paginate (cursor for big lists); cap page size.
5. **Compress:** gzip or brotli at the proxy/CDN or middleware for JSON/HTML/text.
6. **Move slow work out of the request:** emails, image/video processing, report generation, webhooks, third-party calls that need not block -> background jobs ([`be-background-jobs-and-queues`](../be-background-jobs-and-queues/SKILL.md)). Return `202 Accepted` + a status resource.
7. **Parallelize independent I/O** (`asyncio.gather`, `Promise.all`) - never call independent services one after another.
8. **Reuse connections:** HTTP keep-alive/HTTP/2, a shared HTTP client, a DB pool/pooler; avoid opening a connection per request.
9. **Precompute:** summary tables, materialized views, search documents, denormalized counters kept correct atomically.
10. **Serve static and media from a CDN**, not the app server.

## 4. Serialization is real cost

- Serializing thousands of ORM objects can dominate. Use `values()`/lightweight dict builders for hot list endpoints; keep one serializer per shape ([`be-architecture`](../be-architecture/SKILL.md)).
- Serializers must not query. Prefetch before serializing.
- Avoid deep recursion and per-field method calls that hit the DB.

## 5. Timeouts, limits, and protection

- Every outbound call has a timeout and a bounded retry ([`core-error-handling`](../core-error-handling/SKILL.md)).
- Server: request timeout, max body size, worker count matched to CPU and DB connection limits.
- Rate-limit expensive or abusive routes ([`be-auth-and-security`](../be-auth-and-security/SKILL.md)).
- Use `statement_timeout` as a safety net so one bad query cannot pin the database.

## 6. Concurrency and workers

- Match worker/thread counts to CPU cores and to the DB connection budget (`workers * threads * connections per worker` must not exceed the database limit - pool or reduce).
- Async frameworks help I/O-bound waits, not CPU-bound work; offload CPU work to workers.
- On serverless, pay attention to cold starts: keep imports light, reuse clients across invocations, use a pooler.

## 7. Verify

- Re-run the same load test; compare p50/p95 and queries per request.
- Add a regression guard: query-count assertion, payload-size check, or a performance budget in CI.

## 8. Checklist

- [ ] Budgets set; bottleneck measured, not guessed.
- [ ] No N+1; constant queries per request; one commit per write.
- [ ] Payloads trimmed, paginated, compressed.
- [ ] Slow work moved to jobs; independent I/O parallelized.
- [ ] Connections reused; every outbound call has a timeout.
- [ ] Static/media on a CDN; caching layers set.
- [ ] Before/after numbers recorded; a regression guard exists.
