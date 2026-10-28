---
name: be-background-jobs-and-queues
description: Background jobs, queues, scheduled tasks, and the outbox pattern for web backends - what to move out of the request, idempotent job design, retries with backoff and dead-letter handling, status resources and 202 responses, scheduling, write-behind flush jobs, and serverless limits. Use for emails, media processing, imports/exports, webhooks, report generation, periodic cleanup, counter flushes, or anything slow or retryable.
---

# Background Jobs & Queues

If it is slow, retryable, or not needed for the response, it does not belong in the request.

## 1. What moves out of the request

Emails/SMS/push, image/video processing, PDF/report generation, CSV imports/exports, third-party sync, webhooks delivery, search indexing, cache warm-up, counter/analytics **flush** jobs ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md) §6), periodic cleanup (expired tokens, temp files).

## 2. Choose the mechanism

| Need | Options |
| --- | --- |
| Simple, low volume, small team | DB-backed queue/table + a worker/cron; framework task libs |
| Real queue, retries, scheduling | Celery/RQ/Dramatiq (Python), BullMQ (Node), Sidekiq (Ruby), cloud queues (SQS, Cloud Tasks) |
| Scheduled only | OS cron / platform cron (e.g. Vercel Cron, GitHub Actions schedule) calling an idempotent endpoint or command |
| Serverless host | no long-lived workers: use platform queues/cron or an external worker host ([`ops-deployment-and-ci`](../ops-deployment-and-ci/SKILL.md)) |

Heavy work (FFmpeg, big imports) runs on a **worker host with the needed binaries and time**, not on a request-bound or serverless runtime; fail loudly if started in the wrong place.

## 3. Design every job to be safe to run twice

Queues deliver **at least once**. So:
- **Idempotent**: re-running produces the same end state (upsert by natural key, `ON CONFLICT DO NOTHING`, a `done` marker, a unique constraint).
- Pass **ids, not objects**; reload fresh state inside the job.
- Small and chunked: process N rows per run and commit per chunk.
- Deterministic locking when two workers might touch the same row.

## 4. Retries, backoff, dead letters

- Retry transient failures with exponential backoff + jitter and a max attempt count.
- Do not retry permanent failures (bad input) - mark failed immediately.
- After the limit, move to a **dead-letter** list and alert; never loop forever.
- Record state on the row: `status` (`queued|running|done|error`), `attempts`, `error_message`, `started_at`, `finished_at` so staff can see and re-run from the admin.

## 5. Request/response pattern

```
POST /reports            -> 202 Accepted { "id": "r1", "status": "queued", "statusUrl": "/reports/r1" }
GET  /reports/r1         -> { "status": "running", "progress": 40 }  ... later { "status": "done", "downloadUrl": "..." }
```
The client polls with backoff (or uses SSE/WebSocket) and stops on a terminal status.

## 6. Outbox pattern (do not lose events)

When a DB change must trigger a message/email/webhook, write the **event row in the same transaction** as the change; a worker reads the outbox and delivers, marking sent. This avoids "committed but never sent" and "sent but rolled back". For simple cases use `on_commit` to enqueue, accepting a small loss window.

## 7. Scheduling

- Cron-style jobs are idempotent and guarded against overlap (lock or "last run" row).
- Stagger heavy jobs; avoid all firing on the minute.
- Keep schedules in code/config under version control.

## 8. Observability

Metrics: queue depth, job latency, failure rate, retry count, oldest job age. Log job id and correlation id ([`be-observability-and-logging`](../be-observability-and-logging/SKILL.md)). Alert on growing depth and dead letters.

## 9. Checklist

- [ ] Slow/retryable work is out of the request; response is 202 + status resource.
- [ ] Jobs idempotent, id-based, chunked, with bounded retries and a dead-letter path.
- [ ] State visible on the row and in the admin; re-runnable.
- [ ] Events that must not be lost use an outbox or `on_commit` + reconciliation.
- [ ] Heavy work runs on a suitable worker host, not serverless request runtime.
- [ ] Queue depth and failures are monitored.
