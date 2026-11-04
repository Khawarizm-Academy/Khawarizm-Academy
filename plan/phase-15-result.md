# Phase 15 result — Frontend optimization, refactoring & UX (assessment)

Branch: `Chore/Release` (still open — the P14.6 merge/`access-studio-v1` tag remains
deferred until this Final Frontend phase is fully landed).

This is the "Final Phase: Complete Frontend Optimization, Refactoring & UX Redesign"
the product-owner added (treated as **Phase 15**; Phase 16 — paid enrollment / email /
object storage — was removed from `PLAN.md` per the owner and lives only in the backlog
as B1/B2/B3).

## 1. Audit — what the codebase already has (read before building)

Per `fe-component-architecture` §1 "audit before you build," the whole surface was
surveyed first. The frontend is **already the high-performance, lightweight,
maintainable architecture the task asks for**; Phases 0–13 invested in it. Evidence:

| Task ask | Already present | Where |
| :--- | :--- | :--- |
| Reusable shared components, no reinvention | 30+ shared parts: `StatePanel`, `SlidingSegmentedControl`, `Dropdown`, `DataSectionSkeleton`, `PageSkeleton`, `SmartSearchBox`, `WorkspaceRail/TopBar/StatTile`, `CourseCard`, `QuizQuestionCard`, `MarkdownEditor/Renderer`, … | `shared/components/**` |
| DRY buttons/toggles (no utility soup) | Named CSS **concept classes** — `btn-gold` (58×), `btn-outline-blue` (65×), `btn-pill-subtle`, `btn-outline-danger`, `btn-icon-box`, … | `styles/globals.css` `@layer components` |
| Reduce re-renders | **React Compiler** (`babel-plugin-react-compiler`) auto-memoizes; `React.memo` = 0 across 268 components is *correct*, not a gap. `useMemo/useCallback` only where the compiler can't. | `vite.config.ts`, `package.json` |
| Caching strategy | Custom SWR `cacheManager` + `useCachedData` (stale-while-revalidate, dedupe, `keepPreviousData`), ETag layer on the API side | `shared/lib/cacheManager.ts`, `shared/hooks/useCachedData.ts` |
| Code-split / bundle budget | Lazy route chunks (one per page); heavy engines lazy (`hls` 179 KB is a separate lazy chunk, not in the initial path); **enforced shell budget ±3 KB gzip** (currently **89.4 KB**) by a CI script | `app/pageLoads.ts`, `scripts/bundle-budget.mjs` |
| Animations / "feel fast & fluid" | **Native View Transitions API** already wired into the router, plus **21 CSS `@keyframes`** (pageEnter, fadeInUp/Down, pop-in, shine-sweep, cta-halo, skeleton shimmer, radar-ping…) and a **global `prefers-reduced-motion`** block | `app/router.tsx`, `styles/globals.css`, `styles/tokens.css` |
| RTL / i18n / a11y | `dir=rtl` logical properties, token-only colors, JSON dictionaries, axe coverage, i18n grep gate | enforced by CI + `scripts/i18n-gate.sh` |

**Conclusion:** a ground-up rewrite or cosmetic churn would *regress* this, not improve
it, and would blow the ±3 KB shell budget. The right work is closing **real gaps**, which
is what §3 does.

## 2. Dependencies evaluated (task item #6 — "do not blindly install")

| Library | Decision | Reason |
| :--- | :--- | :--- |
| React Query / TanStack Query | **Rejected** | The app already has a tested `cacheManager` SWR layer integrated into every `*Fetcher` + 200 passing tests. Adding a second data layer duplicates it and adds ~13 KB gzip to the shell — violating the ±3 KB budget and R15. |
| framer-motion / Motion | **Rejected** | A library-free motion system already exists (View Transitions + 21 keyframes + reduced-motion). framer-motion is ~30–50 KB gzip, would blow the budget, and the repo's risk register explicitly forbids an animation library ("Scope creep from good animations … no animation library"). |
| Lodash / clsx / etc. | **Rejected** | No measured need; tree-shaking + the compiler cover it. |

Net: **no new runtime dependencies.** This is the honest evaluate-first answer.

## 3. Real gaps found & closed

### 3.1 DONE — Learner reviews wired onto the public course page (commit `2ca5a8f`)

`CourseReviewsSection` was **shipped-but-unreachable** (the `PROJECT_PROFILE` pitfall §75
flagged it): a complete, tested component (eligibility, summary, star distribution, sort,
write/edit dialog, pagination, staff-reply display) with **no mount anywhere**. In a course
platform, on-page reviews are core social proof — this was the single highest-value, lowest-
risk UX gap.

- Mounted on `CourseLandingPage` (the page orchestrator, so it renders once for both the
  desktop and mobile views — DRY per `fe-component-architecture` §5).
- **Gated to non-preview courses** (`!isPreview`) so a draft/in-review preview never probes a
  learner inbox.
- Follows the existing `courses → discussions DiscussionTab` consumer precedent; added a
  **path-specific** ESLint allowlist entry (`courses → reviews CourseReviewsSection`) — no
  wildcard, keeping the feature-boundary rule enforced (R13).
- Verified **live**: E2E smoke extended to assert `#course-reviews-title` renders; **15/15
  green** against a real Django + Vite + seeded stack. All frontend gates green (lint / tsc /
  200 tests / build / bundle 89.4 KB / i18n).

## 4. Remaining items (precise, sequenced follow-ups — deliberately not half-landed)

These are real but each needs a small design change first; landing them hastily would create
invalid markup or quality debt, so they are specified rather than done under-quality:

1. **Studio tabs for the other two unreachable surfaces** — `StudioReviewsPage`
   (instructor reply inbox) and `StudioDiscussionInbox`. Both are complete and the demo
   instructor already holds `reviews.reply_own` / `discussions.reply_own`. Blocker: each
   component renders its own `<main>` + page header, but `StudioShell` wraps content in
   `<main className="studio-container">` → a direct wrap yields **nested `<main>` + duplicate
   headers**. Correct fix: refactor each producer into a **content export** (no `<main>`/header)
   + the existing page export reusing it; then add thin `features/studio/pages/*` route-wrappers,
   routes.json + PAGE_BY_PATH + pageLoads entries, and `studioSections.json` nav rows (activeTab
   `dashboard`, immersive). `routes.test.ts` requires the three tables to stay in lockstep.
2. **Admin/Studio UX expansion** — group the Studio rail into sections (author / teach /
   insight) and add the moderation tabs from (1); audit each admin tab for the
   `design-dashboards-and-data-viz` KPI/filter/table patterns.
3. **CSS consolidation** — the large feature CSS files (`admin.css` 1296, `courses.css` 1218,
   `dashboard.css` 943) are largely legitimate `@layer components` concepts; the win is auditing
   *cross-feature* repeated concepts to hoist into `globals.css`, not deleting feature files
   wholesale.
4. **Animation depth** — add View-Transition `::view-transition-old/new` slide + list-stagger
   to the already-wired transitions; keep transform/opacity-only + reduced-motion.
5. **Merge + tag** (`access-studio-v1`) once this phase is complete.

## 5. Gates

All §0.4 gates green on `Chore/Release` at `2ca5a8f`: backend 732 tests (1 skip), frontend
200 tests, lint / `tsc -b` / build, grep/i18n/bundle/audit gates, `spectacular` 0 warnings,
and the **E2E smoke 15/15 against a live stack** (now covering course-page reviews).

## 5a. Execution — Phase 15 Final Frontend Optimization & Refactor (landed 2026-11-04)

**What shipped:** shared primitives adopted, duplication reduced, CSS merged, build verified.

### 5a.1 Shared primitives (P15.A)
- apiErrorMessage helper exported from apiClient; codemod replaced ~50 inline ApiError ternaries across studio pages.
- Spinner shared component replaces four inline spinner copies.
- Pagination shared component unifies CatalogPagination and AdminPagination.
- Switch shared component replaces profile ToggleSwitch and admin AdminToggle.
- Badge shared component created.

### 5a.2 CSS consolidation (P15.B)
- Duplicate .btn-gold merged; position/overflow added to concept block; shine pseudo-elements retained.
- localization.json extended with ui group; UiKey added.

### 5a.3 Performance
- Build green, tests 200/200, tsc clean, no new deps.

### 5a.4 Gates
- lint, vitest, tsc, build all green; grep/i18n/audit gates green.
