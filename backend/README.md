# Khawarizm Academy · Backend

A small **Django + Django REST Framework + SQLite** service that replaces the
frontend's in-repo mocks. It owns the data; the frontend keeps the presentation
config (routes, nav, localization, filter options).

The API speaks the **exact camelCase shapes** the UI already expects
(`frontend/src/shared/types/entities.ts` and each feature's `types.ts`), so
switching a feature from mock to live changes a fetcher — never a component.

---

## Stack

| | |
| :--- | :--- |
| Framework | Django 6.1 |
| API layer | Django REST Framework 3.18 (function-based views) |
| CORS | `django-cors-headers` (frontend origin allow-list) |
| Database | SQLite (`db.sqlite3`) |
| Auth | none yet — a single seeded demo learner is the current user |

---

## Layout

```text
backend/
├── config/                     project wiring
│   ├── settings.py             SQLite, DRF, CORS, env-driven secrets
│   ├── urls.py                 mounts the API under /api/
│   ├── asgi.py · wsgi.py
├── academy/                    the domain app: models + seed data
│   ├── models.py               catalog, courses, problems, scholarships (+ star-imports)
│   ├── models_dashboard.py     learner, enrollments, favourites, notifications, chambers
│   ├── models_content.py       home, events, competitions, dashboard content blocks
│   ├── models_events_competitions.py
│   ├── choices.py              enum-style choices (single source of truth)
│   ├── admin.py                Django admin registration
│   ├── seed_data.py            demo data as Python literals (no JSON anywhere)
│   └── management/commands/seed_data.py   idempotent loader
├── api/                        the HTTP layer, one module per feature
│   ├── urls.py                 route table (grouped by feature)
│   ├── learners.py             resolves the demo learner
│   ├── pagination.py · errors.py
│   ├── serializers/            JSON shaping (camelCase, compact)
│   └── views/                  catalog, courses, scholarships, dashboard,
│                               home, events, competitions, profile, auth
├── requirements.txt
├── .env.example
└── manage.py
```

**Convention.** One feature = one view module + one serializer module. Views stay
thin (resolve learner → query → serialize); serializers own the camelCase mapping
and use `api/serializers/common.py::compact` to drop empty/`None` fields, matching
the mocks.

---

## Run it

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_data         # writes academy/seed_data.py into SQLite
python manage.py runserver 127.0.0.1:8000
```

The API is then at `http://127.0.0.1:8000/api/`.

Environment variables (all optional in dev — see `.env.example`):
`DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`,
`DJANGO_CORS_ALLOWED_ORIGINS`.

### Commands

| Command | Description |
| :--- | :--- |
| `python manage.py migrate` | Create/update the SQLite schema |
| `python manage.py seed_data` | Idempotent: clears academy tables and reloads the demo data |
| `python manage.py runserver` | Dev server |
| `python manage.py check` | Framework sanity check |

---

## Endpoints

All paths are relative to `/api/`.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/catalog` | Paged, filterable list (`type`, `q`, `field`, `level`, `language`, `cost`, `country`, `status`, `sort`, `page`, `ids`). |
| `GET` | `/catalog/:slug` | One course or scholarship summary. |
| `GET` | `/courses/:slug` | Course detail (modules, lessons, live sessions, exam, progress). |
| `GET` | `/courses/:slug/problems` | The course's practice problems. |
| `GET` | `/problems` | The shared practice set. |
| `GET` | `/courses/:slug/related` | Related-course rail. |
| `POST` | `/courses/:slug/enroll` | Enroll the demo learner. |
| `POST` | `/courses/:slug/progress` | Sync completed lessons / progress. |
| `GET` | `/courses/:slug/certificate` | Certificate metadata. |
| `GET` | `/scholarships/:slug` | Scholarship detail. |
| `POST` | `/scholarships/:slug/apply` | Submit an application. |
| `POST` | `/scholarships/:slug/save` | Save / unsave. |
| `GET` | `/dashboard` | Summary (stats, priority continue, imminent live, upcoming events). |
| `GET` | `/dashboard/enrolled` | Enrolled courses. |
| `GET` | `/dashboard/saved` | Saved scholarships + favourite courses. |
| `GET` | `/dashboard/competitions` | Competitions + certificates. |
| `GET` | `/dashboard/notifications` | Notification items + drawer list. |
| `POST` | `/dashboard/notifications/:id/read` | Mark one read. |
| `GET` | `/dashboard/chambers` | Action-chamber copy/counters. |
| `GET` | `/dashboard/content` | Dashboard view content blocks. |
| `GET` | `/home` | Featured courses, scholarships, competition, events, quick links. |
| `GET` | `/events` | Events & seminars. |
| `GET` | `/competitions` | Competitions & challenges. |
| `GET` | `/profile` · `PATCH` | Learner profile & preferences. |
| `GET` | `/auth/me` | Current learner (demo). |
| `POST` | `/auth/login` · `/auth/oauth/:provider` · `/auth/logout` | Stubs for the future auth flow. |

Errors use one structured shape (see `api/errors.py`) so the frontend's
data-section error state can render a message and a retry.

---

## Using it from the frontend

The frontend is fully API-driven (no mocks). Point it at this server with
`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the backend first (`python manage.py runserver`), then `npm run dev`.

---

## Related

- Frontend entry point: [`../frontend/README.md`](../frontend/README.md)
- Contract & entity shapes: [`../docs/07-backend-contract.md`](../docs/07-backend-contract.md)
