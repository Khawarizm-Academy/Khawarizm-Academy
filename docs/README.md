# Documentation — Khawarizm Academy

Engineering and design documentation for the Khawarizm Academy platform. Everything here describes **the product as it is built today** — the observatory design system, the frontend architecture, the routing contract, and the feature map.

> Agent-facing playbooks live separately in [`/.agents/skills/`](../.agents/skills/README.md). This folder is the human-readable entry point; the skills are the operational rules an agent loads while working. When the two disagree, the code wins and both should be corrected.

---

## Reading order

| # | Document | Read it when you want to… |
| :--- | :--- | :--- |
| — | [**00 · Overview**](00-overview.md) | Understand the product, its two pillars, and the repo layout. |
| — | [**01 · Design System**](01-design-system.md) | Use the Observatory theme — colors, type, elevation, tokens, and concept classes. |
| — | [**02 · Architecture**](02-architecture.md) | Know where every file belongs and how data flows through the app. |
| — | [**03 · Routing & Navigation**](03-routing-and-navigation.md) | Add a route, a tab, a redirect, or a query param. |
| — | [**04 · Loading, Caching & Motion**](04-loading-caching-and-motion.md) | Build skeletons, caching, page transitions, and animation. |
| — | [**05 · Feature Directory**](05-feature-directory.md) | Jump to a feature and its own README. |
| — | [**06 · Development Guide**](06-development-guide.md) | Set up the project and follow the page-creation workflow. |
| — | [**07 · Backend Contract**](07-backend-contract.md) | See the entities, endpoints, and API environment. |
| — | [**08 · Backend Architecture**](08-backend-architecture.md) | Understand the one-app-per-feature layout, models, serializers, and views. |
| — | [**09 · Access Control**](09-access-control.md) | Add or audit a permission, a role, or a route's gate. |
| — | [**10 · Studio**](10-studio.md) | Work on the authoring surface: design language, motion, editor, autosave. |
| — | [**11 · Video Platform**](11-video-platform.md) | Understand providers, the plan resolver, entitlement, uploads, and player engines. |
| — | [**13 · Operations Runbook**](13-operations-runbook.md) | Fix a production complaint: a video that won't play, a stuck upload, a user who lost access. |

---

## Document map

```
docs/
├── README.md                        ← you are here (index & conventions)
├── 00-overview.md                   product, pillars, tech stack, repo layout
├── 01-design-system.md              palette, typography, elevation, tokens, concept classes, RTL
├── 02-architecture.md               three layers, folder taxonomy, import rules, state & data flow
├── 03-routing-and-navigation.md     URL pipeline, routes.json, shell flags, tabs, dashboard views
├── 04-loading-caching-and-motion.md dual-tier skeletons, SWR cache, view transitions, motion system
├── 05-feature-directory.md          every feature + link to its feature README
├── 06-development-guide.md          setup, scripts, code style, page blueprint, verification
├── 07-backend-contract.md           domain entities, REST endpoints, environment
├── 08-backend-architecture.md       feature-app layout, models, serializers, views, admin
├── 09-access-control.md             permission catalog, role hierarchy, route manifest, UI consumption
├── 10-studio.md                     design language, motion spec, editor architecture, autosave model
├── 11-video-platform.md             provider × FFmpeg matrix, plan resolver, entitlement, uploads, engines
└── 13-operations-runbook.md         triage trees: playback, uploads, access, jobs, health
```

(The runbook moved from `09` to `13` when Phase 14 added access-control, Studio
and video-platform documents at the numbers `plan/PLAN.md` assigns them; `12` is
simply unused so far.)

Every feature also owns a README. The frontend features live under
`frontend/src/features/` (15):

```
frontend/src/features/
├── admin/README.md
├── auth/README.md
├── catalog/README.md
├── certificates/README.md
├── competitions/README.md
├── courses/README.md
├── dashboard/README.md
├── discussions/README.md
├── events/README.md
├── home/README.md
├── profile/README.md
├── reviews/README.md
├── scholarships/README.md
├── studio/README.md
└── videohosting/README.md
```

The backend mirrors them one-for-one under `backend/features/` (18 Django apps —
`accounts` is the label of the `auth` app, and `access` + `common` are
backend-only policy and foundation modules):

```
backend/features/
├── access/README.md          permission catalog, roles, hierarchy (no URLs)
├── accounts/ → auth/README.md
├── adminconsole/README.md
├── announcements/README.md
├── catalog/README.md
├── common/README.md          shared helpers, maintenance, observability
├── competitions/README.md
├── courses/README.md
├── dashboard/README.md
├── discussions/README.md
├── events/README.md
├── home/README.md
├── profile/README.md
├── quizzes/README.md
├── reviews/README.md
├── scholarships/README.md
├── studio/README.md          model-less authoring + review-queue APIs
└── videohosting/README.md
```

---

## Conventions used in these documents

- **English domain keys, Arabic at display time.** Internal identifiers (`courses`, `scholarships`, `saved`) are English; Arabic labels come from the localization dictionary.
- **Paths are relative to the repository root** unless stated otherwise. Frontend paths use the `@/` alias where it is shorter (`@/features/catalog/…`).
- **"Concept class"** means a short semantic CSS class (`.btn-gold`, `.card-interactive-blue`, `.dash-row`) defined once in a stylesheet — never a repeated utility run in JSX.
- **Tier 1 / Tier 2** refer to the two skeleton tiers: full-page and data-section. See [04](04-loading-caching-and-motion.md).
- **The code is the source of truth.** If a document describes something the code no longer does, fix the document in the same pull request that changes the code.
