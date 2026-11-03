# 00 · Overview

## What Khawarizm Academy is

Khawarizm Academy (أكاديمية خوارزم) is an Arabic-first (RTL) learning platform built on **two educational pillars of equal weight**:

1. **Courses (الدورات التدريبية)** — recorded video lessons → hands-on problem sets → weekly live review sessions → comprehensive exams, ending in a verified certificate.
2. **Scholarships & International Opportunities (المنح والفرص الدولية)** — a curated aggregation of externally funded academic opportunities. The academy does **not** grant these scholarships; it discovers, organizes, and tracks them to their deadlines.

Around those pillars the platform offers **events & seminars**, **competitions** (including programming challenges), and a personal learner workspace.

The visual identity is the **Observatory & Cyber-Intelligence** theme (المرصد الفلكي الذكي): a deep-navy space canvas with glowing brass astrolabes and a cyan/gold dual-accent grammar that maps directly onto the two pillars.

---

## The dual-pillar design grammar

The two pillars are never made to look interchangeable, yet they share one geometry:

| | Courses pillar | Scholarships pillar |
| :--- | :--- | :--- |
| Accent | Cyber-cyan (`#167BDB` → `#29A9FF`) | Brass gold (`#C88A32` → `#E5B65C`) |
| Motif | Code brackets, technical tracks, skill verification | Degree sponsorships, coverage badges, deadline countdowns |
| Card shell | `.card-interactive-blue` | `.card-interactive-gold` |
| CTA | Cyan gradient / `.btn-outline-blue` | `.btn-gold` |
| Domain pages | `/courses/*`, `/catalog?type=courses` | `/scholarships/*`, `/catalog?type=scholarships` |

The shared canvas, typography, elevation, and motion system are identical across both — only the accent and the iconography change.

---

## Feature map

| Feature | What it provides | Routes |
| :--- | :--- | :--- |
| **Home** | Landing page, hero search, twin pillar rails, competition banner, events | `/` |
| **Catalog** | Unified, filterable, sortable, paginated explorer for both pillars | `/catalog` (`?type=courses\|scholarships`) |
| **Courses** | Course landing, in-browser player, practice, live sessions, exam, certificate | `/courses/:slug`, `/courses/:slug/learn`, `/courses/:slug/certificate` |
| **Scholarships** | Scholarship detail view with application CTA | `/scholarships/:slug` |
| **Dashboard** | Personal learner workspace: enrolled courses, live sessions, saved items, competitions, certificates, notifications | `/dashboard` (`?view=`, `?state=`) |
| **Profile** | Editable account, learning preferences, reminders (rendered inside the dashboard) | `/profile` → `/dashboard?view=profile` |
| **Auth** | Login & returning-user flow with social providers, terms modal, toast | `/login` |
| **Events** | Events & seminars destination: featured keynote + upcoming grid | `/events` |
| **Competitions** | Competitions & challenges destination: banner + card grid | `/competitions` |
| **Admin** | Permission-gated console: accounts & roles, content editor, review queue, sessions, analytics, audit | `/admin` |
| **Studio** | Instructor workspace: course editor, curriculum builder, video library + uploader, quiz builder, live sessions, announcements, students, analytics | `/studio`, `/studio/courses*/`, `/studio/videos`, `/studio/quizzes*`, `/studio/live-sessions`, `/studio/announcements`, `/studio/students`, `/studio/analytics*`, `/studio/profile` |
| **Certificates** | Public serial verification with a printable card | `/verify/:serial` |
| **Discussions** | Lesson-scoped Q&A threads inside the player (sanitized Markdown, jump-to-timestamp) | mounted in `/courses/:slug/learn` |
| **Reviews** | Learner ratings, instructor replies, staff inbox (API-complete; UI mounts are an open item — see `docs/05`) | `/api/courses/:slug/reviews*` |

Full descriptions, file maps, and links to each feature README live in [05 · Feature Directory](05-feature-directory.md). The authoring surface is documented in [10 · Studio](10-studio.md), who may do what in [09 · Access Control](09-access-control.md), and lesson video in [11 · Video Platform](11-video-platform.md).

---

## Technology stack

| Concern | Choice |
| :--- | :--- |
| UI framework | **React 19** with the **React Compiler** enabled |
| Language | **TypeScript** (strict, `verbatimModuleSyntax`) |
| Build tool | **Vite** |
| Styling | **Tailwind CSS v4** (`@theme` tokens) + concept classes in plain CSS |
| Routing | A **custom, data-driven router** in `src/app/` (no router library) |
| Icons | **lucide-react** exclusively |
| Data layer | In-memory **SWR** cache (`useCachedData` + `dataCacheManager`) over API fetchers |
| Tests | **Vitest** + Testing Library; grep/i18n, bundle-budget and dependency-audit gates in `frontend/scripts/` |
| API | **Django 6.1 + DRF 3.18**, function-based views, one app per feature; Firebase ID token → HS256 access JWT; SQLite in development, Postgres via `DATABASE_URL` in production |
| Contract | **drf-spectacular** OpenAPI at `/api/schema` (168 paths / 210 operations), generated with zero warnings under `--fail-on-warn` |
| Localization | English internal keys + an Arabic dictionary in `shared/json/localization.json` |
| Branding | A single source logo + a `sharp` build script (`npm run brand:generate`) |

There is intentionally **no** Redux/Zustand/Query dependency: state is either URL-derived, page-scoped via context, or cached through the shared SWR layer.

---

## Repository layout

```text
Khawarizm-Academy/
├── frontend/                 React + TypeScript + Vite application
│   ├── src/
│   │   ├── app/              router, route table, layouts, app-level pages
│   │   ├── features/         one folder per product feature (+ its README)
│   │   ├── shared/           components, hooks, lib, json, types
│   │   ├── styles/           design tokens + global & shared concept classes
│   │   ├── assets/brand/     source + generated brand assets
│   │   └── scripts/          brand asset generation
│   ├── public/               static files served as-is (favicons, og-image)
│   └── README.md             frontend entry point
├── backend/                  Django + DRF API (SQLite in dev, Postgres in prod)
│   ├── config/               settings, URLs, middleware, WSGI/ASGI,
│   │                         route-permission manifest (`route_access.py`)
│   ├── features/             one app per product feature (+ its README) — 18 apps
│   ├── scripts/              route classifier, p95 latency harness, query pins
│   └── README.md             backend entry point
├── docs/                     this documentation set
├── plan/                     the build plan, per-phase results, budget reports
├── shared/                   files used by both sides (video URL vectors)
├── .agents/skills/           agent playbooks for working on the project
├── Designs/                  design references (mockups + design code)
├── PROJECT_PROFILE.md        project facts the skills read first
└── README.md                 project entry point
```

---

## Product principles

These principles are asserted throughout the codebase and the docs:

- **Arabic-first, RTL-native.** The document is `dir="rtl"`; layout uses logical CSS properties; Arabic labels are resolved at display time, never stored in state.
- **One source of truth.** A route, path, tab, label, or CSS class string exists once and is imported everywhere else.
- **Data over branches.** Configuration lives in JSON; components look it up instead of growing `if`/`switch` chains.
- **Only the data section updates.** The app shell and page chrome stay mounted while the dynamic section re-renders under the SWR cache.
- **Self-contained workspaces.** Dashboard actions resolve in-place in modal chambers instead of bouncing the learner to another page.
- **Zero-from-scratch pages.** Reuse the shared component catalog and the concept-class vocabulary before writing new markup.
- **Verify, don't assume.** `npm run build` and `npx eslint src` must be clean, and behavior is compared before/after a refactor.
