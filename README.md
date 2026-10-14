# Khawarizm Academy · أكاديمية خوارزم

> An Arabic-first (RTL) learning platform that gives **courses** and **scholarships & international opportunities** equal weight, wrapped in a distinctive observatory-inspired design system.

---

## Overview

Khawarizm Academy is built on two educational pillars of equal importance:

1. **Courses (الدورات التدريبية)** — recorded video lessons → hands-on problem sets → weekly live review sessions → comprehensive exams, ending in a verified certificate.
2. **Scholarships & International Opportunities (المنح والفرص الدولية)** — a curated aggregation of externally funded academic opportunities. The academy does not grant them; it discovers, organizes, and tracks them to their deadlines.

Around those pillars the platform offers **events & seminars**, **competitions** (including programming challenges), and a personal learner workspace.

**Design identity:** *Observatory & Cyber-Intelligence* — a deep-navy space canvas (`#040F24`) with glowing brass astrolabes and a strict two-accent grammar: **cyan for courses**, **gold for scholarships**.

| | Courses pillar | Scholarships pillar |
| :--- | :--- | :--- |
| Accent | Cyber-cyan `#167BDB` → `#29A9FF` | Brass gold `#C88A32` → `#E5B65C` |
| Motif | Code brackets, technical tracks, skill checks | Degree sponsorships, coverage badges, deadline countdowns |

---

## Features

| Feature | What it does | Routes |
| :--- | :--- | :--- |
| **Home** | Landing page: hero smart-search, twin pillar rails, competition banner, events | `/` |
| **Catalog** | Unified, filterable, sortable, paginated explorer for both pillars | `/catalog?type=courses\|scholarships` |
| **Courses** | Landing, in-browser player (lessons, problems, live, exam), certificate | `/courses/:slug`, `/courses/:slug/learn`, `/courses/:slug/certificate` |
| **Scholarships** | Scholarship detail with application CTA | `/scholarships/:slug` |
| **Dashboard** | Learner workspace: enrolled, saved, competitions, certificates, notifications, profile | `/dashboard` |
| **Profile** | Editable account and preferences (rendered inside the dashboard) | `/profile` |
| **Auth** | Login & returning-user flow with social providers | `/login` |
| **Events** | Events & seminars (staged) | `/events` |
| **Competitions** | Competitions & challenges (staged) | `/competitions` |

Each feature owns a README inside its folder — see the [feature directory](docs/05-feature-directory.md).

---

## Tech stack

**Frontend** (`frontend/`)

- **[React 19](https://react.dev/)** with the **React Compiler** enabled
- **[TypeScript](https://www.typescriptlang.org/)** — strict, with `verbatimModuleSyntax`
- **[Vite](https://vitejs.dev/)** — fast dev server and production build
- **[Tailwind CSS v4](https://tailwindcss.com/)** — `@theme` design tokens + plain-CSS concept classes, with full RTL and logical-property support
- **A custom, data-driven router** in `src/app/` — no router library
- **[lucide-react](https://lucide.dev/)** — the only icon source
- **In-memory SWR caching** (`useCachedData` + `dataCacheManager`) over API fetchers
- **English domain keys + an Arabic dictionary** for localization

There is intentionally no global state library: state is URL-derived, page-scoped via context, or cached through the shared SWR layer.

**Backend** (`backend/`)

- **[Django 6](https://www.djangoproject.com/)** + **[Django REST Framework](https://www.django-rest-framework.org/)** — one feature app per product feature
- **SQLite** via the Django ORM — the schema ships empty, with no seed data
- **django-cors-headers** — an origin allow-list for the SPA
- Returns the camelCase JSON shapes the frontend types declare, so the app consumes the API directly
- **One folder per feature** under `backend/features/` — models, serializers, views, routes and a README live together

---

## Repository layout

```text
Khawarizm-Academy/
├── frontend/                 React + TypeScript + Vite application
│   ├── src/
│   │   ├── app/              router, route table, layouts, app-level pages
│   │   ├── features/         one folder per feature (+ its README)
│   │   ├── shared/           components, hooks, lib, json, types
│   │   ├── styles/           design tokens + shared concept classes
│   │   ├── assets/brand/     source + generated brand assets
│   │   └── scripts/          brand asset generation
│   ├── public/               static files (favicons, og-image)
│   └── README.md             frontend entry point
├── backend/                  Django + DRF + SQLite API
│   ├── config/               settings, URLs, WSGI/ASGI
│   ├── features/             one app per feature, mirroring the frontend
│   │   ├── common/           shared choices + serializers (no models)
│   │   ├── auth/             learners + login stubs (app label accounts)
│   │   ├── catalog/          browse union + taxonomy
│   │   ├── courses/          course entity + curriculum
│   │   ├── scholarships/     scholarship entity + apply/save
│   │   ├── dashboard/        learner workspace projections
│   │   ├── home/             curated landing rails
│   │   ├── events/           events + workshops
│   │   ├── competitions/     competitions + challenges
│   │   └── profile/          profile read/update
│   └── README.md             backend entry point
├── docs/                     design system, architecture, and guides
├── .agents/skills/           agent playbooks for working on the project
├── Designs/                  design references (mockups + design code)
└── README.md                 this file
```

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm, pnpm, or yarn
- [Python](https://www.python.org/) 3.11+ — required for the backend (the frontend is fully API-driven)

### Run it

The frontend is **fully API-driven**, so start the backend first:

```bash
git clone https://github.com/AhmedAl-Bahrawy/Khawarizm-Academy.git
cd Khawarizm-Academy/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Then, in a second terminal, start the frontend:

```bash
cd Khawarizm-Academy/frontend
npm install
npm run dev        # opens http://localhost:5173
```

Configuration uses **dev + production profiles**: `frontend/.env.development` /
`frontend/.env.production` for the API origin (Vite picks by mode) and
`backend/.env.development` / `backend/.env.production` for origins and secrets
(selected by `DJANGO_ENV`). `VITE_API_BASE_URL` is required — the app has no
fallback. Real environment variables override the files in deployment; on Vercel
the files are skipped and variables are set in the project dashboard. See
[`backend/README.md`](backend/README.md).

### Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build (`tsc -b` + `vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint with ESLint |
| `npm run brand:generate` | Regenerate brand icons, favicons, and the OG image from the source logo |

---

## Architecture at a glance

```
app/       wiring      router, route table, layouts, app-level pages
features/  product     one self-contained folder per feature
shared/    building    components, hooks, lib, json, types
```

- **One-way dependencies:** `app → features → shared`. Features never import from each other.
- **One source of truth:** routes, tabs, paths, labels, and class strings are declared once and imported everywhere.
- **Data over branches:** configuration lives in JSON; components look it up instead of growing `if`/`switch` chains.
- **Only the data section updates:** the shell and page chrome stay mounted while dynamic sections re-render under the SWR cache.
- **Self-contained workspaces:** dashboard actions resolve in-place in modal chambers.

Read the full architecture in [`docs/02-architecture.md`](docs/02-architecture.md).

### Routing in one line

> The JSON says what a path **is**, the TSX says what **renders** it, the router says how it **changes**, the layout says what **wraps** it.

Routes live in `frontend/src/shared/json/routes.json`; lazy chunks in `frontend/src/app/pageLoads.ts`; the path→component map in `frontend/src/app/routes.tsx`. See [`docs/03-routing-and-navigation.md`](docs/03-routing-and-navigation.md).

### Design system in one line

> Tokens in `src/styles/tokens.css`, shared concept classes and keyframes in `src/styles/globals.css`, feature classes in `frontend/src/features/<feature>/<feature>.css`.

See [`docs/01-design-system.md`](docs/01-design-system.md).

---

## Documentation

| Document | Contents |
| :--- | :--- |
| [`docs/00-overview.md`](docs/00-overview.md) | Product, pillars, feature map, tech stack, repo layout |
| [`docs/01-design-system.md`](docs/01-design-system.md) | Palette, typography, elevation, tokens, concept classes, RTL |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Layers, folder taxonomy, imports, state & data flow |
| [`docs/03-routing-and-navigation.md`](docs/03-routing-and-navigation.md) | URL pipeline, route table, tabs, query params |
| [`docs/04-loading-caching-and-motion.md`](docs/04-loading-caching-and-motion.md) | Dual-tier skeletons, SWR cache, transitions, motion |
| [`docs/05-feature-directory.md`](docs/05-feature-directory.md) | Every feature + its own README |
| [`docs/06-development-guide.md`](docs/06-development-guide.md) | Setup, code style, page-creation workflow, verification |
| [`docs/07-backend-contract.md`](docs/07-backend-contract.md) | Entities, endpoints, API environment |
| [`docs/08-backend-architecture.md`](docs/08-backend-architecture.md) | Feature-app layout, models, serializers, views, admin |

Start with [`docs/README.md`](docs/README.md).

---

## Agent skills

Specialized playbooks live in [`/.agents/skills/`](.agents/skills/README.md) and are loaded while working on the project:

- **khawarizm-frontend** — the master design, engineering, and architecture playbook
- **khawarizm-code-style** — comments, data over branches, JSON placement, no duplication (frontend and backend)
- **khawarizm-organization-and-imports** — component folder taxonomy and `@/` import rules
- **khawarizm-desktop-mobile-views** — the Desktop/Mobile view split
- **khawarizm-routing** — routes, redirects, tabs, query params
- **khawarizm-navigation-cache** — skeletons, SWR caching, page transitions
- **khawarizm-motion** — the Celestial Motion System
- **khawarizm-layout-edit** — alignment, grids, sticky offsets, CTA hierarchy
- **khawarizm-page-builder** — the end-to-end page-creation protocol
- **khawarizm-backend** — the Django + DRF backend playbook (one app per feature, camelCase contract)
- **khawarizm-backend-feature** — the end-to-end backend feature-creation protocol

---

## Verification

Before submitting a change:

```bash
cd frontend
npm run build      # tsc -b + vite build — must be clean
npx eslint src     # must be clean
```

Then confirm behavior, not just types: cold loads skeleton once, cached returns are instant, filter changes never flash the skeleton, and back/forward restores scroll.

---

## Contributing

Contributions must preserve the **Arabic-first identity**, the **design-system consistency**, and the **code cleanliness** described in the docs and the skills. Prefer reusing the shared component catalog and the concept-class vocabulary over writing new markup, and follow the page-creation workflow in [`docs/06-development-guide.md`](docs/06-development-guide.md).

---

## License

This project is proprietary to Khawarizm Academy. All rights reserved.
