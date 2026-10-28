---
name: be-config-and-secrets
description: Environment variables, secrets, and settings access for any backend or frontend - env profile files (development committed with placeholders, local real values ignored, production from the host), the rule that only the settings module reads the environment, typed env helpers, fail-loudly validation gates, per-provider credentials() accessors, the add-a-key checklist, frontend public-variable rules, and deployment keys. Use when adding or changing an env var, API key, provider credential, or any settings value, or when fixing a "not configured" boot error.
---

# Config & Secrets

Configuration has **one entry point**, secrets stay out of git and out of the client bundle, and a half-configured system fails at boot with the exact key to fix.

## 1. Profile files

| File | In git? | Purpose |
| --- | --- | --- |
| `.env.development` (or `.env.example`) | yes | non-secret defaults + **commented placeholders for every secret** |
| `.env` / `.env.local` | **no** | a developer's real local values |
| `.env.production` | **no** | real production values on a single box; on cloud hosts leave unset and use the **host's environment** |

Serverless/PaaS hosts (Vercel, Netlify, Render, Fly, Railway) inject env vars themselves; never rely on a dotenv file being present there. The host environment is the production source of truth.

## 2. Read rules

1. **One module reads the environment** (`settings.py`, `config.ts`). No view, model, or provider calls `os.environ`/`process.env`; they read the settings object.
2. One **namespaced block per subsystem** with a short comment saying what the keys are and why they are secret.
3. **Typed helpers** at the top of the settings module (`env_bool`, `env_int`, `env_list`); call sites never cast strings.
4. Strings default to `""` (do not crash on import); ints/bools/lists have safe local defaults. The **consumer** decides what empty means and refuses at call time.

## 3. Adding a key: 4 steps

```
1. settings module   namespaced block + comment:  MY_PROVIDER_API_KEY = env("MY_PROVIDER_API_KEY", "")
2. .env.development  commented placeholder in the subsystem block (what breaks without it)
3. consumer module   one accessor that reads settings and fails loudly (see §5)
4. docs              the env table in the backend README + the feature README row
```

## 4. Fail loudly at boot

```python
# half a config is worse than none: raise before serving traffic
if FIREBASE_PROJECT_ID and not (FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN):
    raise ImproperlyConfigured("FIREBASE_PROJECT_ID is set but FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN are missing")
```
- A missing production secret key must **refuse to serve**, never silently use a placeholder.
- Compound credentials (id + secret + token) are validated together.
- The configuration check command (`manage.py check`, a `validateEnv()` at startup) runs in CI and on deploy.

## 5. Consumer accessor

```python
def credentials() -> dict[str, str]:
    """The configured credentials, failing loudly and naming each missing key."""
    values = {k: getattr(settings, k) or "" for k in REQUIRED_SETTINGS}
    missing = [k for k, v in values.items() if not v]
    if missing:
        raise ValueError(f"<Provider> is not configured - set {', '.join(missing)} in the environment")
    return values
```
Tests mock the settings to cover the missing-keys and the alternate-auth paths ([`be-testing`](../be-testing/SKILL.md)).

## 6. Frontend env

- Variables exposed to the browser (`VITE_*`, `NEXT_PUBLIC_*`, `PUBLIC_*`) are **public**. Never put a secret there.
- Read them in one module (`apiClient`) and fail loudly when a required one (like the API base URL) is missing at build time.
- Per-environment values are set in the host's build settings, not committed.

## 7. Never-commit rule

Real secrets live in the host environment, a secret manager, or git-ignored files. Add a secrets scan (pre-commit/CI). If a secret leaks: **rotate it first**, then clean history. Comments next to placeholders state what breaks without the key and which auth modes are alternatives (e.g. "refresh token **or** service account - one is enough").

## 8. Inventory table (keep it in the README)

| Block | Keys | Read via |
| --- | --- | --- |
| Core | env name, secret key, debug, allowed hosts, CORS origins | settings attributes |
| Database | connection URL / path | settings |
| Auth provider | api key, domain, project id, credentials | settings |
| Storage/video/email/payments | one block per provider | provider `credentials()` |
| Frontend | public API base URL | single client module |

## 9. Checklist

- [ ] Only the settings module reads the environment.
- [ ] New key has a settings block, a committed placeholder, an accessor that fails loudly, and a docs row.
- [ ] App boots with every new key unset (empty default) and refuses only where the key is required.
- [ ] No secret in git or in the client bundle; secrets scan in CI.
- [ ] Production reads the host environment, not a dotfile.
