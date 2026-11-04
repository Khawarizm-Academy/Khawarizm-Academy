# Release checklist — Access & Studio v1 (P14.5)

> Operational runbook for bringing `Feature/AccessStudio` (via `Chore/Release`) up as a
> real product. Verified against the code on this branch. The E2E smoke
> (`frontend/e2e/smoke.mjs`) and every §0.4 gate are green; see
> [`phase-14-result.md`](./phase-14-result.md) for the evidence trail.
>
> **Note (this run):** per the agreed plan the `Chore/Release` branch is kept **open** —
> the merge to `main` and the `access-studio-v1` tag (P14.6) are deferred until after the
> Final Frontend phase (Phase 15). Everything below still applies to a production boot.

## 1. Environment variables

Only `backend/config/settings.py` reads the environment. Placeholders live in
`backend/.env.development` (committed); real values go in `.env.local` (git-ignored) or the
host / Vercel Project Environment Variables. `backend/.env.production` stays out of git.

Required for any real deployment:

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | dev placeholder | **Must** be changed; a non-DEBUG run refuses to boot on the placeholder. |
| `DJANGO_DEBUG` | `true` (dev) | `false` in production. |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Add the real host(s). |
| `DATABASE_URL` | unset → SQLite | **Required on Vercel for any write** (roles, uploads, enrollments). SQLite does not persist across serverless invocations. |
| `FIREBASE_PROJECT_ID` (+ `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`) | unset | Unset ⇒ `dev:<email>` tokens are accepted (local only). Set it to switch dev tokens **off**. |

Product / provider keys (all optional, feature-gated):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `FIREBASE_ALLOW_DEV_TOKENS` | `= DEBUG` | Keep `false` in production. |
| `FIREBASE_CREDENTIALS_PATH` / `FIREBASE_CREDENTIALS` | unset | Only needed for privileged Admin SDK calls (revocation). |
| `TELEGRAM_API_ID`/`_API_HASH`/`_BOT_TOKEN`/`_STREAM_TOKEN`/`_CHANNEL_ID` | unset | Empty ⇒ Telegram provider is unavailable (rejected with a reason, never left staged). |
| `GOOGLE_DRIVE_CLIENT_ID`/`_SECRET`/`_ROOT_FOLDER_ID`/`_OAUTH_REDIRECT_URI` | unset | Drive OAuth; the refresh token lives only in `DriveGrant`, never in an API payload. |
| `VIDEO_SPOOL_DIR` | `""` | Persistent spool for Telegram packaging; empty disables Telegram HLS. Needs an FFmpeg-capable persistent host. |
| `VIDEO_UPLOAD_MAX_BYTES` | `2147483648` | |
| `VIDEO_UPLOAD_CHUNK_BYTES` | `4194304` | Must be a multiple of 262144 and **< 4.5 MB on Vercel**. |
| `VIDEO_USER_QUOTA_BYTES` | `21474836480` | Per-instructor quota. |
| `VIDEO_RAW_RANGE_CAP_BYTES` / `VIDEO_RAW_MAX_CONCURRENT` | `8388608` / `4` | Drive raw-proxy window and concurrency cap. |
| `VIDEO_GRANT_TTL_PREVIEW_MINUTES` / `VIDEO_RAW_GRANT_TTL_MINUTES` | `30` / `120` | Raw grants ride the URL → shorter than HLS. |
| `VIDEO_MAX_OPEN_UPLOADS` | `3` | Open upload sessions per user. |
| `VIDEO_EMBED_ALLOWED_HOSTS` | `youtube-nocookie.com,vimeo.com` | Embed allow-list. |
| `LIVE_ALLOWED_HOSTS` | `meet.google.com,zoom.us,teams.microsoft.com,teams.live.com,whereby.com` | Live-session link allow-list. |
| `REVIEW_MIN_PROGRESS` | `20` | % required before a learner may review. |
| `AUDIT_RETENTION_DAYS` | `365` | Audit-log retention. |
| `REDIS_URL` | unset | Optional shared cache/throttle backend; LocMem is the default. |
| `DJANGO_DEMO_ACCOUNT_PASSWORD` / `DJANGO_DEMO_ADMIN_PASSWORD` | `demo12345` / `admin12345` | Only used by `seed_demo --demo` under DEBUG; never set on a real box. |

## 2. Migration order & idempotency

All schema migrations are **additive and backward-compatible** (no destructive migration;
PLAN §0.5 A3 / CONVENTIONS rule 9). Two intentional idempotent `RunPython` seed/backfill
steps are authorised:

1. `access` system-role seed — creates the role catalog rows; reversible as a no-op, safe
   to run twice.
2. Phase-4 video backfill — legacy HLS assets → `hls/encrypted`, Drive sources →
   `raw/gated`, unambiguous `<course>--<lesson>` links re-pointed onto the lesson.

Run `python manage.py migrate` **once**, before any write. Verify with
`python manage.py makemigrations --check --dry-run` (must report no pending changes).

## 3. Vercel / serverless notes

- `backend/vercel.json` runs `migrate` + `collectstatic` at build; its cron hits
  `/api/admin/maintenance/cleanup` **once/day** on Hobby (`0 3 * * *`). The 6-hourly reminder
  cadence is self-hosted cron only — the SPA shows a client-side "starting soon" banner as
  the fallback.
- **`DATABASE_URL` (Postgres) is mandatory on Vercel** — without it roles, uploads and every
  write fail to persist. `VIDEO_SPOOL_DIR` + FFmpeg are unavailable on serverless, so
  Telegram packaging needs the persistent self-hosted Docker option (`backend/docker-compose.yml`).
- Body size: keep `VIDEO_UPLOAD_CHUNK_BYTES` under Vercel's 4 MiB request cap.
- The control plane is read-only except `/tmp`; package/ingest threads that need a spool must
  run on the persistent host.

## 4. First-boot steps (production)

1. `python manage.py migrate`
2. `python manage.py createsuperuser` → the **first administrator**
   (`createsuperuser` yields an administrator assignment via the access bridge).
3. Bootstrap roles: system roles are seeded by the migration; confirm with
   `python manage.py shell -c "from features.access.models import AccessRole; print(AccessRole.objects.count())"`.
4. `python manage.py seed_demo` **(without `--demo`)** to install reference tables only
   (categories, filter groups) — `--demo` is DEBUG-only and must never run on production.
5. Connect providers: authorize the Drive account, set `TELEGRAM_*` (or leave unset to keep
   Telegram disabled), set `VIDEO_SPOOL_DIR` on the FFmpeg host.
6. `python manage.py check --deploy` (one accepted warning: `security.W018`/`W021` per
   `REPORT.md`) and `python -m scripts.gen_route_access` if any route was added.
7. Create the first instructor role from a template in the admin console → **الأدوار**.

## 5. Rollback plan

Every phase is additive, so rollback is redeploy-previous-tag; the roles/studio tables simply
stay unused. Per-phase order (newest first):

| Rollback to | Reverts | Safe because |
| :--- | :--- | :--- |
| `v0.2.0` | Phases 10–14 (studio tools, learning loop, admin upgrades, hardening, release) | Schema additive; no destructive migration; roles bridge retained. |
| `v0.1.1` | Phase 9 | |
| `v0.1.0` | Phases 0–6 baseline integrate | |

Do **not** drop tables; the legacy `User.role` / `is_staff` compatibility fields are kept
synchronized, so an older release still boots against the newer schema.

## 6. Human-only actions (agent must hand these over — PLAN Appendix D)

1. Add the `frontend.yml` check to **branch protection** for `main`.
2. Create/rotate the **Google OAuth client**, publish the consent screen "In production",
   authorize the Drive account.
3. Create the **Telegram** bot/channel, provide `TELEGRAM_*`, provision a persistent
   **FFmpeg + `VIDEO_SPOOL_DIR`** host if Telegram HLS is wanted.
4. Provide a **Postgres `DATABASE_URL`** for Vercel.
5. Decide the Appendix E defaults (they are already coded so nothing blocks).
6. Confirm the licence/URL of any demo video, and approve moving CSP from report-only to
   enforced (Phase 13 shipped it report-only).
7. Run the real Google/Telegram **spikes** (S-1…S-3) that need live accounts.

## 7. Release checklist (tick before tagging)

- [ ] Fresh clone → `PROJECT_PROFILE.md` + `docs/11-video-platform.md` boot a working stack.
- [ ] `migrate` + `seed_demo` (reference only) + `check --deploy` clean on production settings.
- [ ] §0.4 gates green on a **fresh clone** (backend + frontend) — see phase-14-result.md.
- [ ] `python manage.py test --parallel` green (732 tests; 1 skip without `select_for_update`).
- [ ] `npm run lint` · `npx tsc -b` · `npm test` · `npm run build` green; grep/i18n/bundle/audit gates green.
- [ ] E2E smoke green: `cd backend && … runserver &` → `cd frontend && npm run dev &` → `npm run e2e:smoke` (15/15).
- [ ] Phase-0 parity snapshots diffed: additive-only.
- [ ] All `plan/phase-*-result.md` present (0–14).
- [ ] `docs/` updated (00/03/05/07/08 + new 09/10/11); `REPORT.md` "Part 0 — Access & Studio" written.
- [ ] Merge `Chore/Release` → `main`, tag `access-studio-v1` (**deferred this run** — held for after Phase 15).
