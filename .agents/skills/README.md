# Skills Library - general-purpose, project-agnostic

58 skills for building websites and web apps well: backend, database and cache optimization, frontend engineering, design (stores, restaurants, general sites, shapes, 3D, motion), and SEO. They replace the 13 project-specific `khawarizm-*` skills; project-specific facts now live in a **project profile** (see below).

## How to use

1. **Read [`core-project-profile`](core-project-profile/SKILL.md) first.** It tells the agent to load (or create) the repo's `PROJECT_PROFILE.md`: stack, commands, alias, tokens, brand, database limits, hosting. Skills stay generic; the profile carries the specifics.
2. Pick the skill(s) that match the task from the tables below. Most tasks use 3-5 (e.g. a store product page: `core-feature-delivery-protocol` + `design-ecommerce` + `fe-component-architecture` + `perf-frontend-web-vitals` + `seo-structured-data`).
3. Before finishing, run [`core-verification-and-quality-gates`](core-verification-and-quality-gates/SKILL.md).

## Start here

| Skill | Use it when |
| --- | --- |
| [`core-project-profile`](core-project-profile/SKILL.md) | At the start of every task: find/create the project's `PROJECT_PROFILE.md` so generic skills adapt to the project. |
| [`core-feature-delivery-protocol`](core-feature-delivery-protocol/SKILL.md) | Building any new page/feature end to end (12 steps). |
| [`core-code-style`](core-code-style/SKILL.md) | Writing/reviewing any code: comments, no clever code, data over branching, one source of truth. |
| [`core-project-structure-and-imports`](core-project-structure-and-imports/SKILL.md) | Deciding where a file lives and how to import it. |
| [`core-error-handling`](core-error-handling/SKILL.md) | Validation at edges, fail-loudly config, status codes, retries, error UX. |
| [`core-verification-and-quality-gates`](core-verification-and-quality-gates/SKILL.md) | Before saying done: gates, behavior parity, smoke tests, definition of done. |

## Database, caching & speed (weak-database focus)

| Skill | Use it when |
| --- | --- |
| [`db-weak-database-playbook`](db-weak-database-playbook/SKILL.md) | Entry point when the DB is weak/slow/small: cheapest-first ladder, per-request budgets, triage. |
| [`db-write-batching-and-transactions`](db-write-batching-and-transactions/SKILL.md) | Group commands, ONE commit, bulk ops, write coalescing/buffering, no refresh/re-fetch after writes. |
| [`db-indexing-and-query-optimization`](db-indexing-and-query-optimization/SKILL.md) | Indexes, EXPLAIN, N+1, projection, keyset pagination, safe index creation. |
| [`db-schema-design-and-migrations`](db-schema-design-and-migrations/SKILL.md) | Keys, constraints, types, denormalization, zero-downtime migrations, seeds. |
| [`cache-strategy-layers`](cache-strategy-layers/SKILL.md) | Every cache layer: client, HTTP/CDN, Redis, request memo; keys, TTL, invalidation, stampede. |
| [`perf-backend-speed`](perf-backend-speed/SKILL.md) | API latency budgets, payload shaping, async jobs, parallel I/O, connections, load tests. |
| [`perf-frontend-web-vitals`](perf-frontend-web-vitals/SKILL.md) | LCP/INP/CLS, bundle splitting, images/fonts, React render performance. |

## Backend

| Skill | Use it when |
| --- | --- |
| [`be-architecture`](be-architecture/SKILL.md) | One module per feature, thin handlers, serializer boundary, admin, 13-step scaffold. |
| [`be-api-design`](be-api-design/SKILL.md) | Resources, errors, pagination, filtering, batch endpoints, idempotency, versioning. |
| [`be-auth-and-security`](be-auth-and-security/SKILL.md) | Authn/authz, tokens, CSRF/CORS/XSS/SQLi/SSRF, rate limits, secrets, pre-launch checklist. |
| [`be-testing`](be-testing/SKILL.md) | What to test per feature, shared test kit, query-count guards, offline provider tests. |
| [`be-background-jobs-and-queues`](be-background-jobs-and-queues/SKILL.md) | Jobs, retries, dead letters, outbox, scheduling, write-behind flush jobs. |
| [`be-file-uploads-and-media-pipeline`](be-file-uploads-and-media-pipeline/SKILL.md) | Signed uploads, images, HLS video hosting, provider registry, token-gated playback. |
| [`be-observability-and-logging`](be-observability-and-logging/SKILL.md) | Structured logs, metrics, slow-query detection, health checks, alerts. |
| [`be-config-and-secrets`](be-config-and-secrets/SKILL.md) | Env profiles, single settings reader, fail-loudly gates, add-a-key checklist. |
| [`ops-deployment-and-ci`](ops-deployment-and-ci/SKILL.md) | CI stages, environments, migrations on deploy, serverless constraints, rollback. |

## Frontend engineering

| Skill | Use it when |
| --- | --- |
| [`fe-routing-and-url-state`](fe-routing-and-url-state/SKILL.md) | Routes as data, redirects, shell flags, query params as state, 404s, debugging URLs. |
| [`fe-data-fetching-and-client-cache`](fe-data-fetching-and-client-cache/SKILL.md) | SWR, deterministic keys, prefetch, optimistic updates, mutation batching. |
| [`fe-loading-states-and-skeletons`](fe-loading-states-and-skeletons/SKILL.md) | Two-tier skeletons, empty/error states, zero layout shift. |
| [`fe-component-architecture`](fe-component-architecture/SKILL.md) | Reuse before build, state placement, data boundaries, Desktop/Mobile split. |
| [`fe-css-architecture`](fe-css-architecture/SKILL.md) | Tokens, concept classes, `@layer`, `@apply` rules, no repeated class strings. |
| [`fe-responsive-layout-and-fixes`](fe-responsive-layout-and-fixes/SKILL.md) | Responsive foundations and root-cause fixes for layout bugs, sticky rules. |
| [`fe-forms-and-validation`](fe-forms-and-validation/SKILL.md) | Accessible forms, schema validation, submit states, mobile keyboards. |
| [`fe-accessibility`](fe-accessibility/SKILL.md) | WCAG 2.2 AA: semantics, keyboard, focus, contrast, reduced motion, testing. |
| [`fe-rtl-and-i18n`](fe-rtl-and-i18n/SKILL.md) | RTL/Arabic layout, logical properties, bidi text, dictionaries, Intl formatting. |
| [`fe-testing-and-visual-qa`](fe-testing-and-visual-qa/SKILL.md) | Unit/component/E2E/visual testing, screenshots at 3 widths, flaky-test rules. |

## Design

| Skill | Use it when |
| --- | --- |
| [`design-frontend-execution-playbook`](design-frontend-execution-playbook/SKILL.md) | How to get the best frontend result: frame, references, tokens, structure, states, polish. |
| [`design-fundamentals`](design-fundamentals/SKILL.md) | Hierarchy, spacing scale, grid, alignment, surfaces, consistency. |
| [`design-system-and-tokens`](design-system-and-tokens/SKILL.md) | Token layers, themes/dark mode, component states, brand asset pipeline. |
| [`design-typography`](design-typography/SKILL.md) | Pairing, scales, readability, Arabic type, font loading. |
| [`design-color-and-contrast`](design-color-and-contrast/SKILL.md) | Palettes, roles, WCAG contrast, color-blind safety, dark mode, gradients. |
| [`design-ui-components`](design-ui-components/SKILL.md) | Rules for buttons, inputs, cards, nav, modals, tables, toasts, carousels. |
| [`design-ux-patterns-and-microcopy`](design-ux-patterns-and-microcopy/SKILL.md) | IA, flows, feedback, destructive actions, microcopy (incl. Arabic voice). |
| [`design-mobile-first-and-touch`](design-mobile-first-and-touch/SKILL.md) | Thumb zones, 44px targets, sticky bars, mobile forms, PWA basics. |
| [`design-landing-pages-and-conversion`](design-landing-pages-and-conversion/SKILL.md) | Landing page anatomy, CTAs, proof, objections, measurement. |
| [`design-ecommerce`](design-ecommerce/SKILL.md) | Store IA, PLP/PDP, cart, checkout, payments, trust, performance, schema. |
| [`design-restaurants-and-food`](design-restaurants-and-food/SKILL.md) | Restaurant/cafe sites: menu as HTML, ordering, reservations, local SEO, photography. |
| [`design-dashboards-and-data-viz`](design-dashboards-and-data-viz/SKILL.md) | Dashboards, KPI cards, chart choice, filters, states, chart accessibility. |
| [`design-website-types-playbook`](design-website-types-playbook/SKILL.md) | Corporate, portfolio, blog, SaaS, education, nonprofit, real estate, clinic, events, directory. |
| [`design-shapes-svg-and-iconography`](design-shapes-svg-and-iconography/SKILL.md) | Shape language, SVG, clip-path, dividers, patterns, icons, favicons. |
| [`design-3d-web`](design-3d-web/SKILL.md) | CSS 3D, model-viewer, Three.js/R3F, glTF budgets, fallbacks, accessibility. |
| [`design-motion-principles`](design-motion-principles/SKILL.md) | When and why to animate: purposes, timing, easing, choreography, restraint. |
| [`design-motion-implementation`](design-motion-implementation/SKILL.md) | CSS/WAAPI/View Transitions/scroll-driven, fill-mode pitfalls, reduced motion, profiling. |
| [`design-imagery-and-media`](design-imagery-and-media/SKILL.md) | Responsive images, formats, LCP priority, placeholders, video rules, alt text. |
| [`design-review-and-polish-checklist`](design-review-and-polish-checklist/SKILL.md) | Structured critique and final polish pass with severity triage. |

## SEO

| Skill | Use it when |
| --- | --- |
| [`seo-technical`](seo-technical/SKILL.md) | Crawl/index control, sitemaps, canonicals, redirects, soft 404s, facets, staging safety. |
| [`seo-on-page-content`](seo-on-page-content/SKILL.md) | Intent, titles, descriptions, headings, internal links, E-E-A-T, OG tags, per-route metadata. |
| [`seo-structured-data`](seo-structured-data/SKILL.md) | JSON-LD for Organization, Breadcrumb, Product, Course, Restaurant, Article, Event. |
| [`seo-spa-rendering`](seo-spa-rendering/SKILL.md) | SPA/JS SEO: SSR vs SSG vs prerender, real 404s, crawlable links, OG in initial HTML. |
| [`seo-vertical-playbooks`](seo-vertical-playbooks/SKILL.md) | E-commerce, local/restaurant, blog, SaaS, education SEO playbooks. |
| [`seo-international-arabic-rtl`](seo-international-arabic-rtl/SKILL.md) | hreflang, URL structure, Arabic keyword research, slugs, language switcher. |
| [`seo-audit-and-monitoring`](seo-audit-and-monitoring/SKILL.md) | Audit checklist, Search Console workflow, CI SEO guards, diagnosing drops. |

## Rules that prevent most rework

1. **Ask the database for less.** Cache first, then fewer queries, then **one commit per unit of work** (bulk operations, no per-row saves, no refresh/re-fetch after writes), then indexes. -> [`db-weak-database-playbook`](db-weak-database-playbook/SKILL.md)
2. **Static data lives in data files**, not inline in components or handlers.
3. **No growing `if/else` chains.** Put each variant in a record or a list of rows.
4. **One value, written once** (paths, labels, enums, tokens, class strings).
5. **Tokens before markup**, real content before polish, all states before "done".
6. **Routes and URL state are data**; query params are the source of truth for view state.
7. **Camel/snake casing is converted in exactly one place** (the serializer).
8. **Secrets only in the host environment**; only the settings module reads env.
9. **Public pages need real HTML, real status codes, and unique metadata** (SEO).
10. **Verify behavior, not just types**, and say what you did not verify.

## Project profiles

`_project-profiles/` holds ready-made profiles. [`khawarizm-academy`](_project-profiles/khawarizm-academy/PROJECT_PROFILE.md) contains everything that used to be hard-coded in the original skills (observatory design tokens, component and class names, folder map, backend conventions, env keys, video hosting layout, known pitfalls). Copy it to the repo root as `PROJECT_PROFILE.md`.

## Where the old skills went

See [`MIGRATION.md`](MIGRATION.md).
