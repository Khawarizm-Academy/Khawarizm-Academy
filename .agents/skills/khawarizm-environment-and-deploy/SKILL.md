---
name: khawarizm-environment-and-deploy
description: How configuration, secrets, and deployment work in Khawarizm Academy — the backend env profiles selected by DJANGO_ENV, the committed vs gitignored .env files, the Firebase web-config/service-account split where the SPA reads its config from the backend, DATABASE_URL/SQLite-vs-Postgres, the Vercel setup for both apps, and the troubleshooting table for the failures that actually bite (401 on login, Application Default Credentials, clock skew, origin 403, dev tokens switched off). Use whenever adding an environment variable, wiring a secret, setting up Firebase, deploying, or debugging "it works locally but not in the browser/host".
---

# Khawarizm Academy — Environment, Secrets & Deployment Skill

Everything a feature needs to be configured and shipped. One rule drives the
whole thing: **the backend environment is the single source of truth**, and the
frontend holds only the public API URL.

> Auth mechanics: [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md).
> Backend rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md).
> Human docs: [`docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md),
> [`backend/README.md`](../../../backend/README.md).

---

## 1. Mental model — who holds what

```
backend/.env.<profile>            (server truth: DB, secrets, Firebase config)
        │
        ├─ GET /api/auth/config ─▶  frontend (Firebase WEB config only, public)
        │
frontend/.env.<profile>           (only VITE_API_BASE_URL — nothing secret)
```

| Layer | Where config lives | Secret? |
| :--- | :--- | :--- |
| Backend, dev | `backend/.env.development` — **committed** | no (dev keys) |
| Backend, prod | host env vars, or `backend/.env.production` on the box — **gitignored** | yes |
| Frontend, dev/prod | `frontend/.env.development` / `.env.production` — **committed** | no (public URL) |
| Frontend, test | `frontend/.env.test` — **committed** | no |
| Firebase **web** config | served to the SPA by `/api/auth/config` | no — ships in the bundle |
| Firebase **service account** | host env only (`FIREBASE_CREDENTIALS*`) | **yes** |

---

## 2. Backend env profiles

`config/settings.py` reads `DJANGO_ENV` (default `development`) and loads
`BASE_DIR/.env.<DJANGO_ENV>` with `python-dotenv` — **except on Vercel**, where
`VERCEL=1` is set and configuration comes from Project Environment Variables.

| File | Loaded when | In git? |
| :--- | :--- | :--- |
| `backend/.env.development` | `DJANGO_ENV` unset or `development` | ✅ committed (dev Firebase project) |
| `backend/.env.production` | `DJANGO_ENV=production` (self-hosted) | ❌ gitignored — create it on the box |

```bash
# Local
cp backend/.env.development backend/.env.local   # then DJANGO_ENV=local  (optional)
DJANGO_ENV=production python manage.py check     # exercise the prod profile locally
```

### The backend variables

| Name | Purpose | Default |
| :--- | :--- | :--- |
| `DJANGO_ENV` | Picks the profile (`development` \| `production`); ignored on Vercel | `development` |
| `DJANGO_DEBUG` | Debug mode | `true` in dev, `false` elsewhere |
| `DJANGO_SECRET_KEY` | Signing key (also signs our HS256 access tokens) | dev placeholder; **prod must set a real one** |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames | localhost set; `.vercel.app` added on Vercel |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Frontend origins allowed to call the API | `http://localhost:5173`, `…:5175` |
| `DATABASE_URL` | Postgres DSN; omitted → SQLite | — |
| `FIREBASE_*` | See §3 | — |

Helpers when you add a var: `env_bool`, `env_list`, `env_int` (typed, safe
fallbacks). **Boot guards fail loudly:** a placeholder `DJANGO_SECRET_KEY` in a
non-debug run, or a `FIREBASE_PROJECT_ID` without apiKey/authDomain, raises
`ImproperlyConfigured`.

---

## 3. The Firebase pairing

Two halves that must agree, and they live in **different places**:

| Half | Consumer | Where it is set |
| :--- | :--- | :--- |
| **Web config** (`apiKey`, `authDomain`, `projectId`) | the SPA | backend env → served by `GET /api/auth/config` |
| **Admin SDK** (service account) | the API, to verify ID tokens | backend env only, **never** in git |

```python
FIREBASE_API_KEY      = os.environ.get("FIREBASE_API_KEY", "")
FIREBASE_AUTH_DOMAIN  = os.environ.get("FIREBASE_AUTH_DOMAIN", "")
FIREBASE_PROJECT_ID   = os.environ.get("FIREBASE_PROJECT_ID", "")   # on/off switch
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")
FIREBASE_CREDENTIALS      = os.environ.get("FIREBASE_CREDENTIALS", "")
FIREBASE_ALLOW_DEV_TOKENS = env_bool("FIREBASE_ALLOW_DEV_TOKENS", DEBUG)
FIREBASE_CLOCK_SKEW_SECONDS = max(0, min(60, env_int("FIREBASE_CLOCK_SKEW_SECONDS", 60)))
```

- **Only Auth is used.** Copy the three Auth values; ignore storageBucket,
  messagingSenderId, appId, measurementId — they are deliberately not read.
- **`FIREBASE_PROJECT_ID` is the switch.** Set → real verification, `dev:` tokens
  off. Empty → `dev:<email>[:<role>]` works (when `FIREBASE_ALLOW_DEV_TOKENS`).
- **No service account is required to verify tokens.** Verification only needs
  the project id and Google's public certs. Add a service account only for
  privileged Admin-SDK calls. When it is absent the code uses a secret-free
  credential — do **not** let the SDK fall back to Application Default
  Credentials (see §6).
- **Changing the Firebase project is a backend env edit, not a frontend rebuild.**

Setup steps (Firebase console):
1. Project settings → **Your apps** → Web app → copy `apiKey`, `authDomain`, `projectId`.
2. Authentication → Sign-in method → enable **Email/Password**, **Google**, **Facebook**.
3. Authentication → Settings → **Authorized domains** → add `localhost` (and the host domain).
4. Put the three values in `backend/.env.development` (or the host env for prod).
5. `FIREBASE_ALLOW_DEV_TOKENS=false` in production.

---

## 4. Secrets & git hygiene

`.gitignore` (root) ignores `.env` / `.env.*` **except** the safe ones:

```
.env.*
!.env.development        # committed (dev project)
!.env.test               # committed (test API URL)
!.env.*.example          # committed templates
!frontend/.env.production   # committed: only the public API URL (not a secret)
```

- The `frontend/` anchor is deliberate — a bare `!.env.production` would
  un-ignore the backend's too.
- `backend/vercel.json` / `frontend/vercel.json` are committed; `*.sqlite3` is
  ignored everywhere.
- **Never commit a real `DJANGO_SECRET_KEY` or service-account JSON.** A secret
  removed from the tree is still in git history — **rotate it** if it was ever
  committed.

---

## 5. Running locally

```bash
# Backend (port 8000)
cd backend && source .venv/bin/activate
python manage.py migrate
python manage.py seed_demo          # optional: reference data + demo accounts
python manage.py runserver 127.0.0.1:8000 --noreload

# Frontend (port 5173) — reads VITE_API_BASE_URL from .env.development
cd frontend && npm install && npm run dev
```

- The API's origin middleware **403s origin-less `/api/` calls** — curl with
  `-H "Origin: http://localhost:5173"`, or the browser (which sends it).
- With `FIREBASE_PROJECT_ID` set, the seeded `dev:` logins return 401; clear the
  project id (or promote a user) to use them.

---

## 6. Troubleshooting — the failures that actually bite

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `POST /api/auth/firebase` → **401**, and `AuthEvent.detail` says *"Your default credentials were not found"* | SDK reached for Application Default Credentials | Use a secret-free credential when no service account is configured (already handled) |
| 401 with *"Token used too early"* | Machine clock behind Google's; verifier skew default 0 | `FIREBASE_CLOCK_SKEW_SECONDS` (≤60) for margin; **sync the clock** (`sudo timedatectl set-ntp true`) |
| Every `/api/` call → **403** | Missing `Origin` header (curl) or origin not in the CORS list | Send an allowed `Origin`; add the origin to `DJANGO_CORS_ALLOWED_ORIGINS` |
| Login works in the console but browser sign-in fails | Provider not enabled, or `localhost` not an authorized domain | Enable the provider + add the domain (§3) |
| Seeded `dev:` login now 401s | `FIREBASE_PROJECT_ID` is set | Clear it, or sign in for real and promote the user |
| Boot error mentioning `FIREBASE_PROJECT_ID` | Half-filled web config | Fill apiKey + authDomain, or clear the project id |
| `ImproperlyConfigured` about the secret key | Placeholder key in a non-debug run | Set a real `DJANGO_SECRET_KEY` |
| `VITE_API_BASE_URL is not set` at import | Frontend env profile missing | Add it to `frontend/.env.<profile>` |

The **`AuthEvent` table is the audit trail** — a rejected login stores the exact
reason in `detail`. Read it before guessing.

---

## 7. Deploy

### Backend → Vercel
- Root Directory = **`backend`**. Vercel detects Django via `manage.py` and the
  ASGI app from `ASGI_APPLICATION`; no uvicorn/gunicorn, no rewrite.
- `backend/vercel.json`: `buildCommand` = `python manage.py migrate --noinput && python manage.py collectstatic --noinput`.
- Add a Postgres database (Vercel Postgres / Neon / …) and link it — Vercel
  injects `DATABASE_URL`; otherwise SQLite is bundled **read-only**.
- `ALLOWED_HOSTS` picks up `.vercel.app` and `VERCEL_URL` automatically; CORS
  allows `https://*.vercel.app` via a regex. Set `DJANGO_CORS_ALLOWED_ORIGINS`
  to the frontend origin, plus `FIREBASE_*` and a real `DJANGO_SECRET_KEY`.
- Push to `main` → the Pull Request preview deploys against the same vars.

### Frontend → Vercel
- Root Directory = **`frontend`**. `frontend/vercel.json` rewrites all paths to
  `/index.html` (the hand-rolled router needs SPA fallback).
- `.env.production` holds the stable backend URL (not a per-deployment URL).
  Firebase keys are **not** here — the SPA fetches them at boot.

### Self-hosted
- Create `backend/.env.production` on the box (`DJANGO_ENV=production`) or export
  the same names; set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`,
  `DJANGO_CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, and the `FIREBASE_*` block.

---

## 8. Adding an environment variable (checklist)

1. Read it once in `config/settings.py` with the right helper (`env_bool` /
   `env_list` / `env_int` / `os.environ.get`), with a safe default.
2. Add a boot guard (`ImproperlyConfigured`) if a bad value must stop the app.
3. Document it in `backend/README.md`'s variable table **and** the Firebase/env
   block comments in `.env.development`.
4. Add it to the host (Vercel Project Environment Variables) for production.
5. If the SPA needs it and it is **public**, serve it from an API endpoint — do
   not add it to the frontend env.

---

## 9. Do / Don't

| Do | Don't |
| :--- | :--- |
| Keep the backend env the single source of truth | Duplicate Firebase config in the frontend env |
| Commit dev/test profiles; host-supply production | Commit `.env.production` or any secret |
| Use `env_bool`/`env_list`/`env_int` with defaults | Read `os.environ["X"]` and crash on a missing var |
| Fail loudly at boot on a bad secret/half config | Start with a placeholder secret in prod |
| Send an `Origin` when curling the API | Blame the view for a middleware 403 |
| Read `AuthEvent.detail` on a rejected login | Guess at a 401 |
| Rotate any secret that touched git history | Assume deletion removes history |

---

## Related

- Auth mechanics & the `/api/auth` `/api/admin` contracts: [`khawarizm-auth-and-sessions`](../khawarizm-auth-and-sessions/SKILL.md)
- Backend feature rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md)
- Starting a similar app from scratch: [`khawarizm-app-blueprint`](../khawarizm-app-blueprint/SKILL.md)
