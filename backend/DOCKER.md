# Docker dev backend — the low-wifi guide

The dev backend runs in a container while the frontend stays native (Vite on
the host). One image holds Django **plus the ingest toolchain** — FFmpeg and
the compiler bits for TgCrypto — so the packaging ladder and the admin upload
flow work on this machine without installing anything on the host.

| File | Role |
| :--- | :--- |
| `Dockerfile` | The image: `python:3.14-slim` + ffmpeg, gcc, python3-dev, curl |
| `docker-compose.yml` | One `backend` service: bind mount, port 8000, healthcheck |
| `.dockerignore` | The image ships **only** `requirements.txt` — code and secrets never enter a layer |

## The one rule that saves your internet

**Code and data never rebuild anything.** The whole `backend/` directory is
bind-mounted to `/app`, so every edit, every `.env*` change, and the SQLite
database are shared live with the container:

- editing Python code → `runserver` reloads it instantly, zero rebuild
- editing `.env.development` → restart is enough (`docker compose restart backend`)
- database changes → nothing to do, the db file rides the mount
- **the only edit that triggers a rebuild is `requirements.txt`**

That means your day-to-day workflow is *Mode 1* — no build, no network.

## The three modes

### Mode 1 — daily drive (no rebuild, no network)

```bash
cd backend
docker compose up -d          # reuse yesterday's image as-is
docker compose logs -f backend
```

Then work exactly as before: edit code, curl `http://127.0.0.1:8000/api/`,
refresh the admin. Tests run inside the container **fully offline** (in-memory
SQLite):

```bash
docker compose exec backend python manage.py test
```

Run the ingest against a real file *inside* the box (FFmpeg is already there —
no host dependency):

```bash
docker compose exec backend python manage.py ingest_video ./lesson-01.mp4 --slug course-1--lesson-1
```

### Mode 2 — `requirements.txt` changed (cache-only network)

```bash
docker compose build && docker compose up -d
```

Two BuildKit **cache mounts** make this nearly free:

| Cache mount | Stores | Result on rebuild |
| :--- | :--- | :--- |
| `/root/.cache/pip` | every downloaded wheel + sdist | unchanged pins install **from the cache, offline**; only brand-new pins touch PyPI |
| `/var/cache/apt/archives` | every Deja-vu `.deb` | apt re-fetches only metadata, never a package it already holds |

Unchanged Docker layers also short-circuit: if only the code changed, the
`apt` and `pip` layers of yesterday's build are reused untouched — the build
steps never even run.

### Mode 3 — full refresh (rare, explicit, the only full download)

```bash
docker compose build --no-cache && docker compose up -d
```

`--no-cache` rebuilds every layer from scratch. Keep this for a base-image
security refresh or after wiping caches; it is the **only** mode that spends
real bandwidth on unchanged packages.

## First-time setup (once)

```bash
docker context use default          # this CLI was pinned to desktop-linux
sudo systemctl enable --now docker  # the daemon, once
cd backend
docker compose up --build -d        # Mode 2 build, then migrate + runserver
```

The API is the same `http://127.0.0.1:8000/api/`; the frontend Vite server
needs no changes.

## What invalidates what

| You changed | Docker does |
| :--- | :--- |
| any `.py` / `.env*` / `db.sqlite3` | nothing (bind mount, live) |
| `Dockerfile` itself | from that line down — pip wheels come from the cache |
| `requirements.txt` | the pip layer only — wheels come from the cache |
| base image version | everything below `FROM` — packages come from the caches |

## Housekeeping

- Stop for the day: `docker compose down` (keeps the image + caches).
- After `requirements.txt` churn the pip cache grows; reclaim only when disk
  actually hurts: `docker builder prune` (drops **all** cached wheels — the
  next Mode 2 build re-downloads them).
- The container is disposable on purpose: destructive commands (`down -v`,
  `--no-cache`, pruning) lose build caches, never your code, db, or `.env` —
  those live on the host side of the mount.
