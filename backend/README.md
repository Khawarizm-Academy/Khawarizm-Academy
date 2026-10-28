# Khawarizm Academy · Backend

A small **Django + Django REST Framework + SQLite** service that owns all the
data the frontend renders. It is organised as **one app per product feature**,
mirroring `frontend/src/features/`.

The API speaks the **exact camelCase shapes** the UI already expects
(`frontend/src/shared/types/entities.ts` and each feature's `types.ts`), so a
feature reads from the API without any shape-casting.

---

## Stack

| | |
| :--- | :--- |
| Framework | Django 6.1 |
| API layer | Django REST Framework 3.18 (function-based views) |
| CORS | `django-cors-headers` (frontend origin allow-list) |
| Database | SQLite locally · Postgres on Vercel when `DATABASE_URL` is set |
| Auth | Firebase ID-token verification + HS256 access tokens with rotating refresh sessions (`accounts.User`) |

---

## Layout

```text
backend/
├── config/                     project wiring
│   ├── settings.py             SQLite/Postgres, DRF, CORS, env-driven secrets
│   ├── urls.py                 mounts every feature's URLs under /api/
│   ├── middleware.py
│   └── asgi.py · wsgi.py
├── features/                   one app per feature (see features/README.md)
│   ├── common/                 shared models (UUID/TimeStamped), choice enums, seed_demo
│   ├── auth/                   learner identity + Firebase/refresh sessions (label: accounts)
│   ├── catalog/                browse union + taxonomy
│   ├── courses/                course entity + curriculum + problems
│   ├── scholarships/           scholarship entity + apply/save
│   ├── dashboard/              learner workspace projections
│   ├── home/                   curated landing rails
│   ├── events/                 events + workshops
│   ├── competitions/           competitions + challenges
│   ├── profile/                profile read/update
│   ├── adminconsole/           staff analytics + content editor (reads across features)
│   └── videohosting/           hosted lesson video: providers/, ingest, HLS control plane
├── requirements.txt
├── .env.development            dev profile (loaded by default)
├── .env.production             prod profile (loaded when DJANGO_ENV=production)
└── manage.py
```

**Convention.** One feature = one folder = one Django app. Inside a feature the
files mean the same thing everywhere:

| File | Holds |
| :--- | :--- |
| `models.py` | the feature's tables (skip when the feature owns no data) |
| `serializers.py` | ORM row → the exact camelCase JSON the frontend reads |
| `views.py` | thin function views: resolve → query → serialize |
| `urls.py` | the feature's routes |
| `admin.py` | admin registration so data is easy to inspect and edit |
| `migrations/` | schema history |
| `README.md` | what the feature does, routes, data, how it works |

Feature map and the full backend guideline: [`features/README.md`](features/README.md).

---

## Run it

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API is then at `http://127.0.0.1:8000/api/`.

### Run it in Docker (dev)

The container route gets FFmpeg in the box, so the packaging ladder works on
the dev host too. Code, `.env*` profile files, and `db.sqlite3` ride a bind
mount — edits never need a rebuild, and BuildKit cache mounts keep rebuilds
from re-downloading anything the host already has. **The full runbook and the
low-network modes live in [DOCKER.md](DOCKER.md)**; the one-time start:

```bash
docker context use default          # this CLI was set to desktop-linux
sudo systemctl enable --now docker  # the daemon, once
cd backend
docker compose up --build -d        # build once, then migrate + runserver
docker compose logs -f backend
```

Tear it down with `docker compose down`.

### Environment

Configuration is split into **profiles** selected by `DJANGO_ENV` (default
`development`). `config/settings.py` loads `.env.<DJANGO_ENV>` with
**python-dotenv**, so origins and secrets are edited in the file rather than
exported by hand:

| File | Loaded when | Use for |
| :--- | :--- | :--- |
| `.env.development` | `DJANGO_ENV` is unset or `development` | Local dev — committed |
| `.env.production` | `DJANGO_ENV=production` | Self-hosted production — **gitignored**, create it on the box |

> **On Vercel the profile files are skipped** (Vercel sets `VERCEL=1`).
> Configuration comes from the project's **Environment Variables**.
>
> `.env.production` is deliberately **not in git**: it holds real keys and the
> Django secret. Create it on the box that runs the API, using the variable names
> in the table below. On Vercel, set the same names as Project Environment
> Variables instead.

**Real environment variables always win over the file**:

| Variable | Purpose |
| :--- | :--- |
| `DJANGO_ENV` | Picks the profile (`development` \| `production`). Ignored on Vercel |
| `DJANGO_DEBUG` | `true` in dev, `false` on Vercel/self-hosted prod |
| `DJANGO_SECRET_KEY` | Django secret — required and must be real when `DEBUG=false` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames the API answers on |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins allowed to call the API |
| `DATABASE_URL` | Postgres connection string; falls back to SQLite when unset |
| `SQLITE_PATH` | Absolute path for the SQLite file (pin it to a mounted volume) |
| `FIREBASE_*` | The Firebase web config + Admin SDK credentials (see below) |
| `TELEGRAM_*` | Video hosting (features/videohosting): API id/hash, ingest bot, read-only stream bot, storage channel |
| `GOOGLE_DRIVE_*` | Alternative managed host: OAuth client id/secret/refresh token, service-account JSON, upload folder |
| `VIDEO_HOSTING_DEFAULT_PROVIDER` | Provider assets default to (`google_drive`) |
| `STREAM_TOKEN_TTL_HOURS` | Playback grant lifetime (default `6`) |
| `DJANGO_SSL_REDIRECT` | Force HTTPS redirects. Default: on whenever `DEBUG=false`, off in dev |
| `DJANGO_HSTS_SECONDS` | HSTS max-age. Default: `31536000` (1 year) when `DEBUG=false`, off in dev |
| `DJANGO_SESSION_COOKIE_SECURE` / `DJANGO_CSRF_COOKIE_SECURE` | `Secure` cookies. Default: on whenever `DEBUG=false` |
| `DJANGO_CONN_MAX_AGE` | Persistent DB connections (seconds). Default `60` self-hosted, `0` on Vercel |
| `REDIS_URL` | Switch the app cache to Redis (requires `pip install django-redis`); LocMem otherwise |

**Database per profile.** Development uses SQLite because `.env.development`
sets no `DATABASE_URL`. Production values are set in the **host environment** (or as Vercel Project
Environment Variables). The gitignored `.env.production` is only needed on a
self-hosted box — create it there from the commented placeholder names in
`.env.development` and the table above, then fill in real values.

`DATABASE_URL` wins wherever it is set, so the switch is simply whether that
key is present (development: absent → SQLite; production: present → Postgres).
Postgres URLs need `?sslmode=require` for managed hosts such as Aiven/Neon.

The secret check **fails loudly**: a non-debug run refuses to boot while
`DJANGO_SECRET_KEY` is still a placeholder.

### Firebase

Real sign-in needs one project, configured once, on the backend only — the SPA
fetches the web config from `GET /api/auth/config` at boot, so there is nothing
to paste into the frontend.

1. Firebase console → **Project settings → Your apps** → add a **Web** app.
2. Copy the three Auth values into `FIREBASE_*`. `.env.development` already
   carries the development project; for production create `.env.production` on
   the host (gitignored) or set the same variables in the host environment.
3. Enable the providers you want under **Authentication → Sign-in method**
   (Email/Password, Google, Facebook).
4. Add `localhost` and the deployed origin under **Authentication → Settings →
   Authorized domains**.
5. Set `FIREBASE_ALLOW_DEV_TOKENS=false` in production.

Only **Auth** is read. The web config the console prints also carries Storage,
Messaging, and Analytics keys (`storageBucket`, `messagingSenderId`, `appId`,
`measurementId`); this project ignores them, and `initializeApp()` does not need
them for Auth.

| Variable | Purpose |
| :--- | :--- |
| `FIREBASE_API_KEY` | Web config — public, ships in the browser bundle |
| `FIREBASE_AUTH_DOMAIN` | Web config — `<project>.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Web config **and the on/off switch**: set it and the API stops accepting `dev:` tokens |
| `FIREBASE_CREDENTIALS_PATH` / `FIREBASE_CREDENTIALS` | **Secret** service account (a path or the raw JSON) for privileged Admin SDK calls; never committed |
| `FIREBASE_ALLOW_DEV_TOKENS` | Accept `dev:<email>[:<role>]` tokens; defaults to `DEBUG` |
| `FIREBASE_CLOCK_SKEW_SECONDS` | Seconds of clock drift the token verifier tolerates (0–60, default 60) |

> A service account is **not** required to verify ID tokens — that needs only the
> project id and Google's public certs. It is only needed for privileged calls
> like revocation checks.
>
> The clock-skew allowance exists because ID tokens carry the issuer's timestamp:
> a machine whose clock lags rejects every sign-in with `Token used too early`.
> WSL drifts like this after a suspend. Sync the clock for a real fix — the
> setting is the safety margin, and the SDK caps it at 60 seconds.

> A **half-filled** config stops the boot: with `FIREBASE_PROJECT_ID` set but no
> `FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN`, `settings.py` raises
> `ImproperlyConfigured` rather than letting every sign-in fail in the browser.
>
> Verifying ID tokens only needs the project id, so `dev:<email>` works with no
> Firebase project at all — that is why the defaults ship empty.

### Commands

| Command | Description |
| :--- | :--- |
| `python manage.py migrate` | Create/update the SQLite schema |
| `python manage.py makemigrations` | Generate migrations after a model change |
| `python manage.py runserver` | Dev server |
| `python manage.py check` | Framework sanity check |
| `python manage.py test` | Run the backend test suite |
| `python manage.py seed_demo` | Idempotent seed: reference catalog data, a demo learner, the admin |
| `python manage.py ingest_video <file> --slug <slug>` | Package + host one video (needs FFmpeg; never on Vercel) |

### Verification (the gates)

The [CI workflow](../.github/workflows/backend.yml) (`.github/workflows/backend.yml`) runs these on every push/PR to
`main` and `Refactor/*`; branch protection on `main` requires them for a merge:

| Gate | Command |
| :--- | :--- |
| Lint + format | `ruff check .` · `ruff format --check .` (config in `pyproject.toml`) |
| Framework sanity | `python manage.py check` |
| Models ⇄ migrations agree | `python manage.py makemigrations --check --dry-run` |
| Schema applies | `python manage.py migrate` |
| Test suite | `python manage.py test` |
| Dependency audit | `pip-audit -r requirements.txt` |
| Secrets scan | gitleaks (whole git history) |
| Deploy-mode checks | `python manage.py check --deploy` (production env shape) |

Locally:

```bash
pip install -r requirements-dev.txt
pre-commit install                   # one time; hooks run on every commit
pre-commit run -a                    # or run all hooks over the tree now
```

Dev-only tools (ruff, pip-audit, pre-commit) live in `requirements-dev.txt`; `requirements.txt` stays runtime-only for
Vercel/Docker.

### Refactor parity

Behavior-visible refactors prove zero diff: with the dev server running and seed data in place,

```bash
backend/scripts/parity_capture.sh before   # snapshot every public GET with an allowed Origin
# ...make the change, restart the server...
backend/scripts/parity_capture.sh after
python backend/scripts/parity_diff.py /tmp/opencode/parity/before /tmp/opencode/parity/after
```

The diff normalizes regenerated-row volatile keys (`createdAt`, session ids, …); anything else must be exactly equal.

> The database starts with the seed: `python manage.py seed_demo` loads the
> reference catalog data and a demo learner/admin (idempotent — run it as often
> as you like). Data beyond the seed is added through the Django admin
> (`/admin/`) or the ORM; the admin registers every model with useful list
> columns, so it doubles as a data editor.

---

## Testing

Every feature ships a `tests.py`; the shared kit lives in
[`features/common/testing.py`](features/common/testing.py).

```bash
cd backend
source .venv/bin/activate
python manage.py test                    # every feature
python manage.py test features.courses   # one feature
```

`features/common/testing.py` provides:

| Helper | Provides |
| :--- | :--- |
| `ApiTestCase` | a `TestCase` whose client passes the API origin middleware |
| `api_client()` | a DRF client that always sends an allowed `Origin` |
| `FakeRequest()` | a request stand-in for testing pure helpers |
| `authenticate(client, user)` | signs a client in (session/`Bearer`) |
| `make_user()` · `make_admin()` | accounts with every required field filled |
| `make_course()` · `make_scholarship()` | content rows with every required field filled |

Tests run against an **in-memory SQLite** database, so they never touch
`db.sqlite3`. Because `config/middleware.py` rejects any `/api/` call without an
allowed `Origin`, the shared client sets one for every request.

---

## Deploy on Vercel

Vercel detects `manage.py` and runs the ASGI app named by `ASGI_APPLICATION`.
**No `uvicorn`/`gunicorn` and no rewrite is needed** — Vercel wraps the app as a
Function.

1. Create a Vercel project with **Root Directory = `backend`**.
2. Add a Postgres database (Vercel Postgres, Neon, Supabase…) and link it to the
   project; Vercel injects `DATABASE_URL` automatically.
3. Add these Environment Variables (Project → Settings → Environment
   Variables), then redeploy:

   | Variable | Value |
   | :--- | :--- |
   | `DJANGO_SECRET_KEY` | a long random string (required) |
   | `DATABASE_URL` | set by the database integration |

   Hosts and CORS need no manual value on Vercel: the app adds `.vercel.app` and
   the deployment host to `ALLOWED_HOSTS`, and allows `*.vercel.app` origins.

`vercel.json` runs `migrate` + `collectstatic` at **build time**, so the schema
exists before the first request.

> **SQLite on Vercel is read-only.** Without `DATABASE_URL` the build bundles
> `db.sqlite3`; at runtime the app copies it to `/tmp` so writes succeed instead
> of failing with *"attempt to write a readonly database"*. `/tmp` is
> per-instance and resets on cold starts, so accounts and edits are **not
> durable**. Add Postgres (`DATABASE_URL`) for a fully working backend.

---

## Deploy on a persistent disk (Railway / Render / Fly)

A file database is fine on any host that gives the app a real disk. Mount a
volume and point `SQLITE_PATH` at it — the same file survives restarts, so
sessions and every write are durable, with **no database server to run**.

1. Deploy the repo with **Root Directory = `backend`**. The included
   `Dockerfile` builds the API with gunicorn; on a non-Docker platform use
   `gunicorn config.wsgi:application` as the start command.
2. Add a **persistent volume** mounted at `/data` (Railway: *Volumes*; Render:
   *Disks*; Fly: `fly volumes create`).
3. Set the environment variables:

   | Variable | Value |
   | :--- | :--- |
   | `DJANGO_ENV` | `production` |
   | `DJANGO_SECRET_KEY` | a long random string (required) |
   | `DJANGO_ALLOWED_HOSTS` | your API hostname |
   | `DJANGO_CORS_ALLOWED_ORIGINS` | your frontend origin(s), comma-separated |
   | `SQLITE_PATH` | `/data/db.sqlite3` |
   | `FIREBASE_*` | the production Firebase config (see above) |

The container runs `migrate` on boot, creating the file on the volume the first
time. `DATABASE_URL` still wins if you later prefer Postgres; `SQLITE_PATH` is
ignored in that case.

---

## Endpoints

All paths are relative to `/api/`. Each row is owned by the feature folder in
the last column.

| Method | Path | Feature |
| :--- | :--- | :--- |
| `GET` | `/catalog` — paged, filterable list (`type`, `q`, `field`, `level`, `cost`, `country`, `status`, `sort`, `page`, `ids`) | catalog |
| `GET` | `/catalog/:slug` — one course or scholarship summary | catalog |
| `GET` | `/courses/:slug` — course detail (modules, lessons, live sessions, exam) | courses |
| `GET` | `/courses/:slug/problems`, `/problems` — practice set | courses |
| `GET` | `/courses/:slug/related` — related-course rail | courses |
| `POST` | `/courses/:slug/enroll` · `/favorite` · `/progress` — learner actions | courses |
| `GET` | `/courses/:slug/certificate` — certificate metadata | courses |
| `GET` | `/scholarships/:slug` — scholarship detail | scholarships |
| `POST` | `/scholarships/:slug/apply` · `/save` | scholarships |
| `GET` | `/dashboard` · `/enrolled` · `/saved` · `/competitions` · `/notifications` | dashboard |
| `POST` | `/dashboard/notifications/:id/read` | dashboard |
| `GET` | `/home` — featured courses/scholarships, competition, events, quick links | home |
| `GET` | `/events` — events & seminars | events |
| `GET` | `/competitions` — competitions & challenges | competitions |
| `GET` · `PATCH` | `/profile` — learner profile & preferences | profile |
| `GET` | `/auth/config` — the public Firebase web config for the browser | auth |
| `POST` | `/auth/firebase` — exchange a Firebase ID token for a session | auth |
| `POST` | `/auth/refresh` — rotate the refresh token, mint a new access token | auth |
| `GET` | `/auth/me` — current learner | auth |
| `POST` | `/auth/logout` · `GET` `/auth/sessions` · `POST` `/auth/sessions/:id/revoke` | auth |
| `GET` · `POST` · `PATCH` · `DELETE` | `/admin/*` — overview, accounts & roles, sessions & revokes, analytics, the content editor | adminconsole |
| `GET` | `/videos/providers` · `/videos/:slug` — hosting registry, readiness + ladder | videohosting |
| `POST` | `/videos/:slug/token` — mint a playback grant (auth) | videohosting |
| `GET` | `/stream/:token/*` — master/media playlists, AES key, 302 to the provider CDN | videohosting |

Errors use one structured shape (see `features/common/errors.py`) so the
frontend's data-section error state can render a message and a retry.

---

## Using it from the frontend

The frontend is fully API-driven (no mocks). It reads the API origin from its
own profile files (`frontend/.env.development` for `npm run dev`,
`frontend/.env.production` for `npm run build`):

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the backend first (`python manage.py runserver`), then `npm run dev`.

## Hardening

Abuse surfaces answer **429 with `Retry-After`** (`features/common/throttling.py` owns the rates):

| Scope | Covers | Rate (per source IP) |
| :--- | :--- | :--- |
| `auth_burst` | `POST /api/auth/firebase`, `POST /api/auth/refresh` | 10/min |
| `catalog` | `GET /api/catalog`, `/api/catalog/{slug}` | 120/min |
| `video_token` | `POST /api/videos/{slug}/token` (playback grants) | 60/min |
| `admin_burst` | every `/api/admin/*` console endpoint | 60/min |

On top of the request throttle, **login lockout**: 5 rejected sign-ins from one
email/IP within 15 minutes locks the login for the rest of the window — `429`
with `{"code": "login_locked"}` and `Retry-After` counting down to when the
newest rejection leaves the window. Waiting clears it; spamming does not
extend it.

Transport and browser headers: HTTPS redirect + HSTS (1 year, subdomains) +
`Secure` session/CSRF cookies whenever `DEBUG=false` (env-overridable, see the
table above); `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Content-Type-Options: nosniff`, and a `Permissions-Policy` on every
response (`config/middleware.py`). The Django admin additionally gets a
**report-only CSP** — the trial run before promoting it to a real one.

## Caching

Three layers, outermost first (`features/common/cache.py` +
`features/common/http_cache.py`):

- **App cache** — the public read payloads (`/api/catalog` list+detail+filters,
  `/api/home`, `/api/events`, `/api/competitions`) go through one `cached()`
  helper: keys `kh:<namespace>:v<version>:<digest>`, a ±10%-jittered 300 s TTL,
  and one `cache miss` JSON log line per miss (the hit-ratio signal). Warm
  requests run **zero DB queries**.
- **Invalidation** — any write to a watched model (courses, scholarships,
  events, competitions, home rails, catalog filters — the registry in
  `features/common/cache_invalidation.py`) bumps the family version inside
  `transaction.on_commit`, wherever the write comes from (admin console,
  `seed_demo`, commands). Old entries age out; nothing is scanned.
- **HTTP cache** — public GETs carry an ETag (a digest of the payload) +
  `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=600`
  (`/api/auth/config`: short + `must-revalidate`). A matching `If-None-Match`
  answers `304` with no body and no queries. Private routes
  (`/api/dashboard/*`, `/api/auth/me|sessions`, `/api/admin/*`,
  `/api/videos|stream/*`) get `Cache-Control: private, no-store`
  (`PrivateCacheMiddleware`) and are never app-cached.

Responses are gzipped (`GZipMiddleware`); `DJANGO_CONN_MAX_AGE` enables
persistent DB connections for self-hosted workers (default `60`, `0` on
Vercel). `REDIS_URL` moves the app cache to Redis for multi-instance deploys.

## Observability

Every request logs **one JSON line** to stdout: `ts`, `level`, `msg`, `logger`, `request_id`, `user_id`, `path`,
`status`, `duration_ms`, `db_ms`, `queries` (`config/logging.py`). The shapes:

- **Request id at the edge** (`config/middleware.py`): an inbound `X-Request-ID` (8–64 printable chars) is echoed on
  the response and pinned to every log line; otherwise a `uuid4` hex is minted.
- **Per-request metrics** (`RequestMetricsMiddleware`): one INFO line per request with query count and DB time —
  escalated to **WARNING** above the thresholds (`SLOW_DB_SECONDS = 0.3`, `MANY_QUERIES = 25`), the N+1 tripwire.
- Levels: DEBUG locally (`DJANGO_DEBUG=true`), INFO in production; the formatter whitelists fields, so no secrets or
  request bodies can leak into logs.
- Log lines carry `request_id`; grep the server log for a header value to trace one request end to end.

## Health checks

| Route | Meaning | Response |
| :--- | :--- | :--- |
| `GET /healthz` | Liveness — the process answers; touches nothing | `{"status": "ok"}` |
| `GET /readyz` | Readiness — the database answers `SELECT 1` | `{"status": "ok", "database": "up"}` or **503** `{"database": "down"}` |

Both are unauthenticated and exempt from the origin gate. The docker-compose healthcheck curls `/healthz`.

---

## Related

- Feature map & guideline: [`features/README.md`](features/README.md)
- Frontend entry point: [`../frontend/README.md`](../frontend/README.md)
- Contract & entity shapes: [`../docs/07-backend-contract.md`](../docs/07-backend-contract.md)
- Backend architecture guide: [`../docs/08-backend-architecture.md`](../docs/08-backend-architecture.md)
