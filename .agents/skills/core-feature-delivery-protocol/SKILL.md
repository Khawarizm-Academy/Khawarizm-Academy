---
name: core-feature-delivery-protocol
description: End-to-end protocol for building any new page, screen, or feature (frontend, backend, or both) in any project. Use when starting a new feature, porting a design to code, adding an endpoint plus its UI, or when asked to "build X". Gives the 12-step flow - understand, contract first, reuse audit, data model, backend, UI structure, states, wiring, polish, performance and SEO pass, tests, verification.
---

# Feature Delivery Protocol (12 steps)

Follow it every time you create or extend a feature. It is stack-neutral; commands and paths come from the project profile ([`core-project-profile`](../core-project-profile/SKILL.md)).

```
 1 Understand      what, for whom, success criteria, constraints
 2 Contract first  types / API shapes / copy keys before code
 3 Reuse audit     what already exists (components, classes, endpoints, helpers)
 4 Data model      tables, indexes, cache keys, write path
 5 Backend         model -> serializer -> handler -> route -> admin -> tests
 6 UI structure    folders, page, data boundary, surfaces
 7 States          loading, empty, error, partial, offline
 8 Wire            routes, nav, config, lazy chunks
 9 Polish          layout, a11y, motion, RTL, responsive
10 Perf + SEO      budgets, metadata, structured data
11 Tests           unit + integration + a visual/behavior check
12 Verify + doc    gates pass, README/profile updated
```

## 1. Understand
- Write the goal in one sentence and the **done criteria** as a checklist (behavior, not files).
- Identify the user surfaces (desktop, mobile, admin), the roles, and the data volume you must survive.
- List constraints: DB limits, hosting limits, browser support, languages/RTL, deadlines.
- Ask at most one blocking question; otherwise state assumptions and proceed.

## 2. Contract first
The contract is the spec: request/response shapes, entity types, event names, and every user-facing string key. Write or update it **before** implementation so both sides build against the same thing. Never invent a field the other side does not know about.

## 3. Reuse audit
Search the codebase for an existing component, class, endpoint, hook, or helper before writing one. Typical reuse is 80%+ of a screen. New code is the remainder. See [`fe-component-architecture`](../fe-component-architecture/SKILL.md).

## 4. Data model
Decide before coding: tables and relations, the **indexes** the queries will need ([`db-indexing-and-query-optimization`](../db-indexing-and-query-optimization/SKILL.md)), what is cached and how it is invalidated ([`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)), and how writes are grouped ([`db-write-batching-and-transactions`](../db-write-batching-and-transactions/SKILL.md)).

## 5. Backend (when needed)
Follow [`be-architecture`](../be-architecture/SKILL.md): one module per feature, thin handlers, one serializer per shape, admin/data tooling, tests. Register the module and mount its routes.

## 6. UI structure
Folder per feature, purpose-based component folders, a thin page that composes sections, and an isolated **data boundary** component so only the dynamic part re-renders. See [`core-project-structure-and-imports`](../core-project-structure-and-imports/SKILL.md).

## 7. States (never skip)
Every data-driven view has: loading (skeleton, not spinner), empty (with next action), error (with retry), and the success state. See [`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md).

## 8. Wire
Register the route, nav entry, lazy chunk, and any config. Routes are data where the project supports it ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)).

## 9. Polish
Alignment and centering, responsive behavior, keyboard and screen-reader support, RTL, motion with reduced-motion fallback. See [`design-review-and-polish-checklist`](../design-review-and-polish-checklist/SKILL.md) and [`fe-accessibility`](../fe-accessibility/SKILL.md).

## 10. Performance + SEO pass
Check the budget ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md), [`perf-backend-speed`](../perf-backend-speed/SKILL.md)), set per-page metadata and structured data for public pages ([`seo-on-page-content`](../seo-on-page-content/SKILL.md), [`seo-structured-data`](../seo-structured-data/SKILL.md)).

## 11. Tests
Models/serializers/routes on the backend, logic and states on the frontend, one end-to-end happy path for the feature. See [`be-testing`](../be-testing/SKILL.md) and [`fe-testing-and-visual-qa`](../fe-testing-and-visual-qa/SKILL.md).

## 12. Verify and document
Run the gates in [`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md). Update the feature README and, for durable facts, the project profile.

## Decision matrix - what kind of page?

| Kind | Shell | Container | Skeleton | Notes |
| --- | --- | --- | --- | --- |
| Standard hub/page | full shell | centered content wrapper | default/home | most pages |
| Data-rich explorer (filters, grid) | full shell | centered | grid | URL-driven state, SWR cache |
| Detail / landing | full shell | centered | detail | prefetch on hover, SEO critical |
| Immersive (dashboard, player, auth) | reduced or none | custom full-height | default | owns its own navigation |

## Pitfalls

| Pitfall | Prevention |
| --- | --- |
| Starting with markup, discovering the data shape later | contract first |
| Rebuilding something that exists | reuse audit |
| Only the happy path exists | states step is mandatory |
| Feature works with 10 rows, dies with 10,000 | data-model step with indexes and pagination |
| "Done" without running anything | step 12 |
