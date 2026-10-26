---
name: khawarizm-env-config
description: Environment variables, secrets, and Django settings access for Khawarizm Academy. Use whenever adding or changing an env var, API key, provider credential, or any settings.py value; wiring a new provider's keys; fixing a "not configured" boot error; or setting deployment keys (Vercel / host environment). Covers the three .env profile files, the settings.py read patterns, the fail-loudly validation gates, the key inventory, and the never-commit rule.
---

# Khawarizm Academy — Env & Config Skill

The authoritative workflow for **any configuration or secret**: where it lives,
how Django reads it, and how it fails loudly when half-configured.

> Human-facing twins: [`docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
> (§ Environment) and [`backend/README.md`](../../../backend/README.md).
> Master rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md). Provider
> wiring end to end: [`khawarizm-videohosting`](../khawarizm-videohosting/SKILL.md).

---

## 1. The three profile files — what goes where

| File | Git? | Loaded when | Holds |
| :--- | :--- | :--- | :--- |
| `.env.development` | ✅ committed | `DJANGO_ENV=development` (the default) | Non-secret dev values + **commented placeholders** for every secret |
| `.env` | ❌ ignored | the active profile | A developer's **real local values** — copy the placeholders, fill them here |
| `.env.production` | ❌ ignored | `DJANGO_ENV=production` | Real production values on one box; in the cloud leave it unset and use the **host environment** |

```python
# config/settings.py — profile selection
DJANGO_ENV = os.environ.get("DJANGO_ENV", "development")
IS_VERCEL = bool(os.environ.get("VERCEL"))
if not IS_VERCEL:
    load_dotenv(BASE_DIR / f".env.{DJANGO_ENV}")
```

**Vercel skips dotenv files entirely** (`vercel.json` runs `migrate` + `collectstatic`
at build time from the host env). Never rely on a `.env*` file being present —
the host environment is the only production source of truth.

## 2. The read rules — settings.py is the only reader

1. **`config/settings.py` is the single place `os.environ` is read.** No view,
   model, or provider module may call `os.environ` — they read
   `settings.<NAME>` instead. The env value has exactly one access point.
2. **One namespaced block per subsystem,** each headed by a short comment
   saying what the keys are and why they are secrets (see the Firebase,
   Telegram, and Google Drive blocks for the house style).
3. **Typed helpers beat casting call-sites:** `env_bool("DJANGO_DEBUG", True)`,
   `env_int("STREAM_TOKEN_TTL_HOURS", 6)`, `env_list("DJANGO_ALLOWED_HOSTS", [...])`
   live at the top of settings.py — a new numeric/list/bool key must use them.
4. **Strings default to `""`, ints/bools/lists default locally.** A missing
   string key must not crash import — feature code decides what empty means
   (the provider's `credentials()` refuses it at call time).

## 3. Adding a new key — the 4-step checklist

```text
1. config/settings.py          — namespaced block + comment:
                                  MY_PROVIDER_API_KEY = os.environ.get("MY_PROVIDER_API_KEY", "")
2. .env.development            — commented placeholder in the subsystem block
                                  (values, even blank-looking ones, never committed)
3. The consumer module         — one accessor that reads settings and fails loudly
                                  naming any missing key (see §5)
4. README + env tables         — backend/README.md env table + the feature README row
```

## 4. Fail loudly at import — the validation gates

Boot-time guards live in settings.py, where the message can say exactly what to
paste. Copy a gate when its failure mode repeats:

```python
# Half a config is worse than none — raise BEFORE the API accepts traffic.
if FIREBASE_PROJECT_ID and not (FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN):
    raise ImproperlyConfigured("FIREBASE_PROJECT_ID is set but FIREBASE_API_KEY / …")
```

- Missing `DJANGO_SECRET_KEY` in production boots against a placeholder that
  then **refuses to serve** — never soft-dodge a missing secret.
- Half-set compound credentials get the same gate (never let one subsystem
  boot 80% configured).

## 5. The consumer access point — `credentials()` per provider

Provider code never imports `os`; it reads `settings` through one function in
its feature (see `features/videohosting/providers/google_drive.py`):

```python
def credentials() -> dict[str, str]:
    """The configured credentials, failing loudly and naming each missing key."""
    values = {key: getattr(settings, key) or "" for key in REQUIRED_SETTINGS}
    missing = [key for key, value in values.items() if not value]
    if missing:
        raise ValueError(f"<Provider> is not configured — set {', '.join(missing)} in the environment")
    return values
```

This means: a half-configured env raises **in the provider's own helper** with
the exact keys to set, instead of failing later inside a random HTTP call.
Tests mock `settings.<KEY>` to cover both the missing-keys and the missing-auth
paths — see `GoogleDriveCredentialsTests`.

## 6. The key inventory

| Block | Keys | Access via |
| :--- | :--- | :--- |
| **Core** | `DJANGO_ENV`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS` | settings attributes / env helpers |
| **Database** | `DATABASE_URL` (Postgres), `SQLITE_PATH` (local SQLite) | settings |
| **Firebase Auth** | `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS`, `FIREBASE_CREDENTIALS_PATH`, `FIREBASE_ALLOW_DEV_TOKENS`, `FIREBASE_CLOCK_SKEW_SECONDS` | settings (superuser calls) |
| **Telegram video hosting** | `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_STREAM_TOKEN`, `TELEGRAM_CHANNEL_ID` | `providers/telegram.py` |
| **Google Drive hosting** | `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `VIDEO_HOSTING_DEFAULT_PROVIDER` | `providers/google_drive.py` |
| **Playback** | `STREAM_TOKEN_TTL_HOURS` | `features/videohosting/tokens.py` |
| **Frontend** | `VITE_API_BASE_URL` (required in `frontend/.env*`) | `src/shared/api/apiClient.ts` |

## 7. The never-commit rule + its one exception shape

- **Real secret values live in host env, git-ignored files, or Vercel env vars —
  never in git.** The committed `.env.development` stores only commented
  placeholders (`# TELEGRAM_BOT_TOKEN=`), so the file is safe by construction.
- Comments above each placeholder must say **what breaks without it** and which
  auth mode applies (e.g. Drive: refresh token **or** service account, one of
  the two is enough).

## 8. Verification gate

```bash
cd backend && source .venv/bin/activate
python manage.py check   # import gates run here — a bad config dies before serving
```

- [ ] New key has a settings.py block, a committed placeholder, a `credentials()`-style
      access point, and rows in both env tables (backend README + feature README).
- [ ] No `os.environ` outside `config/settings.py`.
- [ ] `manage.py check` still boots with every new key unset (empty string default).
