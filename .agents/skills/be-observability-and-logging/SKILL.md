---
name: be-observability-and-logging
description: Observability for web backends and frontends - structured logs with request/correlation ids, log levels, what never to log, metrics (latency, errors, saturation, queue depth, cache hit ratio, DB time), tracing, health checks, error tracking, alerting, and slow-query/slow-endpoint detection. Use when adding logging, debugging production, setting up monitoring, or investigating performance.
---

# Observability & Logging

You cannot fix what you cannot see. Log structured events, measure the four golden signals, and make slow things visible.

## 1. Structured logs

- One JSON object per line: `ts`, `level`, `msg`, `request_id`, `user_id` (if any), `route`, `status`, `duration_ms`, plus event fields.
- Generate or accept a **request/correlation id** at the edge, put it in every log line and the response header, and pass it to jobs and downstream calls.
- Levels: `DEBUG` (dev), `INFO` (normal events), `WARNING` (recoverable oddities), `ERROR` (failed operation), `CRITICAL` (service at risk). Log an error **once** at the handling boundary.
- Production default `INFO`; never `DEBUG` with sensitive data.

## 2. What never goes into logs

Passwords, tokens, API keys, full card numbers, session ids, ID-document data, full request bodies of auth routes, personal data beyond need. Mask or hash identifiers where debugging requires correlation.

## 3. Metrics (golden signals)

| Signal | Examples |
| --- | --- |
| Latency | p50/p95/p99 per route; DB time per request; external-call time |
| Traffic | requests per second per route; cache hit ratio |
| Errors | 5xx rate, 4xx spikes, job failure rate |
| Saturation | CPU, memory, DB connections in use, queue depth/age, disk |

Add **per-request DB metrics**: queries count, commits, total DB ms. They expose N+1 and per-row commits immediately ([`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md)).

## 4. Slow-thing detection

- Slow query log / `pg_stat_statements` (top by total time, by mean time, by calls).
- Log requests over a threshold with their query counts.
- Dashboards for p95 by route and top queries; review weekly.

## 5. Health and readiness

- `/healthz` (process alive) and `/readyz` (DB/cache reachable) for the platform; no auth, no secrets, cheap.
- Distinguish liveness from readiness so a slow dependency does not trigger restart loops.

## 6. Error tracking and tracing

- Capture unhandled exceptions with release version, request id, user id, and breadcrumbs (Sentry-style tools or self-hosted equivalents). Group by fingerprint; alert on **new** and **regressed** errors.
- Distributed tracing (OpenTelemetry) for multi-service flows; at minimum, propagate the correlation id.
- Frontend: report JS errors, failed network requests, and Web Vitals (LCP/INP/CLS) from real users ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 7. Alerting

Alert on **symptoms users feel** (error rate, latency, failed jobs, queue age, certificate/domain expiry, disk full), not every cause. Each alert has an owner and a runbook link. Delete noisy alerts.

## 8. Audit trail

Security-relevant events (login, failure, role change, token refresh/revoke, admin edits, data export) go to an append-only audit log with actor, target, and time ([`be-auth-and-security`](../be-auth-and-security/SKILL.md) §10).

## 9. Checklist

- [ ] JSON logs with request id propagated to jobs and responses.
- [ ] No secrets/PII in logs; levels used consistently.
- [ ] Latency/error/saturation metrics and per-request DB counters exist.
- [ ] Slow queries and slow endpoints are visible and reviewed.
- [ ] Health and readiness endpoints; error tracking with release tags.
- [ ] Alerts are symptom-based with owners and runbooks.
