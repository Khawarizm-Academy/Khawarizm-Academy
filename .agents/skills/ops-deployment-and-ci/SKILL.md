---
name: ops-deployment-and-ci
description: Deployment and CI/CD for web apps - CI pipeline stages (install, lint, typecheck, test, build, migration check, audit), preview deployments, environment profiles, database migrations on deploy, serverless constraints (body limits, runtime limits, read-only filesystem, cold starts), static hosting plus API split, CDN and caching headers, rollback, and release checklists. Use when setting up or changing hosting, pipelines, Docker, or release steps.
---

# Deployment & CI

Ship small, ship often, make rollback boring. Take host and commands from the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)).

## 1. CI pipeline (every push / PR)

```
install (cached) -> lint -> typecheck -> unit/integration tests -> build -> migration check -> dependency audit -> (preview deploy)
```
- Cache dependencies; run independent stages in parallel.
- Migration check: `makemigrations --check` (Django) or the ORM equivalent fails the build if models and migrations disagree.
- Fail on lint/type errors; treat new warnings as errors where practical.
- Secrets scan and dependency audit in CI ([`be-auth-and-security`](../be-auth-and-security/SKILL.md) §9).
- Required status checks protect the main branch; squash or rebase merges keep history readable.

## 2. Environments

| Env | Purpose | Data |
| --- | --- | --- |
| local | development | seed/demo data |
| preview | per-PR deployments for review | seed/demo, isolated DB |
| staging | production-like rehearsal | anonymized copy or seed |
| production | users | real, backed up |

Same code, different configuration ([`be-config-and-secrets`](../be-config-and-secrets/SKILL.md)).

## 3. Migrations on deploy

- Run migrations as a deploy step **before** the new code serves traffic, and keep them backward compatible so old and new code both work during rollout (expand/contract, [`db-schema-design-and-migrations`](../db-schema-design-and-migrations/SKILL.md) §7).
- Take a backup/snapshot before risky migrations; test restore periodically.
- Never run a long blocking migration against a weak production database without a plan (batched backfills, concurrent indexes).

## 4. Serverless / PaaS constraints (check before designing)

| Constraint | Consequence |
| --- | --- |
| request body size limit (often a few MB) | direct-to-storage uploads |
| max execution time | heavy work goes to workers/queues |
| read-only or ephemeral filesystem | no SQLite file DB, no local cache/uploads |
| cold starts | light imports, reuse clients, pooled DB connections |
| no long-lived workers/threads | platform cron/queues or an external worker host |
| instance-local memory | shared state in Redis/KV/CDN, not module globals |

Static frontend + separate API is a common split: static assets on a CDN with immutable caching ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)), the API on a runtime that matches its needs. For an SPA, configure the host to serve `index.html` for unknown paths **but** return real 404s for missing assets and, where possible, real 404 pages for unknown routes ([`seo-spa-rendering`](../seo-spa-rendering/SKILL.md)).

## 5. Containers (when used)

Small multi-stage images, non-root user, pinned base versions, health checks, no secrets baked into the image, `.dockerignore`, one process per container, graceful shutdown (flush write-behind buffers and finish in-flight requests on `SIGTERM`).

## 6. Release and rollback

- Version/tag every release; deploy the same artifact through staging to production.
- Feature flags for risky changes; roll out gradually when the platform allows.
- **Rollback plan** before deploy: previous artifact + backward-compatible migrations means rollback is "redeploy previous".
- Post-deploy smoke test: health endpoint, a key read, a key write, and the error-tracking dashboard ([`be-observability-and-logging`](../be-observability-and-logging/SKILL.md)).

## 7. Release checklist

- [ ] CI green; migrations backward compatible and applied in order.
- [ ] Env vars present in the target environment; app boots (`check` passes).
- [ ] Caching headers and CDN rules verified; sitemap/robots correct for production ([`seo-technical`](../seo-technical/SKILL.md)).
- [ ] Backups verified; rollback path known.
- [ ] Smoke test passed; monitoring watched for the first minutes.
