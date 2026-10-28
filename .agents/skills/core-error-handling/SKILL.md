---
name: core-error-handling
description: Error handling and failure design for web apps and APIs - validate at boundaries, fail loudly on bad config, typed errors, correct HTTP status codes, user-facing versus developer-facing messages, retries with backoff and idempotency, UI error boundaries, and never swallowing exceptions. Use when writing handlers, fetchers, config loaders, forms, background jobs, or any code that can fail.
---

# Error Handling & Failure Design

A wrong config that renders is worse than one that crashes. Design failures on purpose.

## 1. Where to validate: the edges

Validate and narrow **once**, where data enters: HTTP bodies, query params, env vars, file uploads, third-party responses, `localStorage`, URL params. Inside, trust the types.

```ts
const raw = await res.json();
const item = parseItem(raw);          // throws a clear error on a bad shape
```

## 2. Fail loudly on bad configuration

- Missing required setting, unknown name, half-set credential pairs: **throw at boot/build** with a message naming the exact key to set.
- Never silently default a secret. Strings may default to empty; the consumer refuses empty at call time with a clear error.

```python
def credentials():
    missing = [k for k in REQUIRED if not getattr(settings, k)]
    if missing:
        raise ImproperlyConfigured(f"Provider is not configured - set {', '.join(missing)}")
```

## 3. Never swallow

- No empty `catch {}` / bare `except: pass`. Either handle it (retry, fallback, user message) or let it propagate.
- Catch the narrowest type you can name. Add context when rethrowing (`raise ... from err`, `new Error('...', { cause })`).
- Log once, at the boundary that handles it, not at every layer.

## 4. HTTP semantics (API)

| Situation | Status |
| --- | --- |
| Success with body / created / no content | 200 / 201 / 204 |
| Bad input, validation failure | 400 or 422 with field errors |
| Not signed in / token invalid | 401 |
| Signed in but not allowed | 403 |
| Resource missing | **404** (never an empty 200) |
| Conflict (duplicate, version) | 409 |
| Too many requests | 429 + `Retry-After` |
| Our bug / dependency down | 500 / 502 / 503 |

One error envelope everywhere, e.g. `{ "detail": "...", "code": "not_found", "fields": {...} }`. Define messages once as constants and reuse them. Never leak stack traces, SQL, or secrets to clients.

## 5. User-facing vs developer-facing

- Users get a short, actionable sentence in their language and a way forward (retry, go back, contact).
- Developers get structured logs with request id, user id (if any), route, and the original error ([`be-observability-and-logging`](../be-observability-and-logging/SKILL.md)).
- Never show a raw exception message to a user.

## 6. Retries, timeouts, idempotency

- Every outbound call has a **timeout**. No timeout means a hung request holds a worker forever.
- Retry only idempotent operations or ones protected by an **idempotency key**; use exponential backoff with jitter and a cap on attempts.
- Do not retry 4xx (except 408/429). Circuit-break a dependency that keeps failing instead of hammering it.
- Writes that may be repeated (payments, webhooks, job re-delivery) need an idempotency key or a natural unique constraint.

## 7. Frontend failure UX

- A route-level **error boundary** so a crash shows a themed error and keeps the shell alive.
- Data sections expose `isError` with a retry action; never an endless spinner.
- Forms show field-level errors next to the field plus a summary; keep what the user typed.
- Offline/slow network: keep cached data visible and mark it stale instead of blanking the screen ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md)).
- Unknown URL renders a real 404 page and returns a 404 status where the server controls it ([`seo-technical`](../seo-technical/SKILL.md)).

## 8. Background jobs

Jobs are retried by the platform, so make them idempotent, record failures on the row (`status=error`, `error_message`) so staff can see them, and send exhausted jobs to a dead-letter list ([`be-background-jobs-and-queues`](../be-background-jobs-and-queues/SKILL.md)).

## 9. Checklist

- [ ] Input validated at the edge; typed inside.
- [ ] Required config throws at boot with the key names.
- [ ] No swallowed exceptions; context added when rethrowing.
- [ ] Correct status codes; one error envelope; 404 not empty 200.
- [ ] Timeouts on every outbound call; retries only where safe.
- [ ] UI has error boundary, retry, and preserved user input.
