# Phase 3 — Hardening: Throttling & Security Headers (result)

Branch: `Server/Hardening` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/common/throttling.py` (new) | The abuse surface in one module: named rates (`AUTH_BURST_RATE="10/min"`, `CATALOG_RATE="120/min"`, `VIDEO_TOKEN_RATE="60/min"`, `ADMIN_BURST_RATE="60/min"`), the `SCOPED_RATES` dict, the `scoped_throttle(scope)` decorator (sits **below** `@api_view`, which copies `throttle_scope` onto the wrapping APIView — verified in `rest_framework/decorators.py`), and the lockout constants (`LOCKOUT_THRESHOLD=5`, `LOCKOUT_WINDOW_SECONDS=900`). |
| `backend/config/settings.py` | `REST_FRAMEWORK`: `DEFAULT_THROTTLE_CLASSES=[ScopedRateThrottle]` (scope-less views pass through untouched — zero behavior change for them) + `DEFAULT_THROTTLE_RATES=SCOPED_RATES`. New security block, gated on `not DEBUG`: `SECURE_SSL_REDIRECT` (`DJANGO_SSL_REDIRECT`), `SECURE_HSTS_SECONDS=31536000` + `SECURE_HSTS_INCLUDE_SUBDOMAINS` (`DJANGO_HSTS_SECONDS`), `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` (each env-overridable); plus the protocol-agnostic `SECURE_REFERRER_POLICY="strict-origin-when-cross-origin"` and `SECURE_CONTENT_TYPE_NOSNIFF=True`. |
| `backend/config/middleware.py` | `HardeningHeadersMiddleware` (last in the stack): `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` on every response; a **report-only CSP** on `/admin/` only (`default-src 'self'; …; frame-ancestors 'none'`) — the trial run before anyone promotes it to enforcing. Uses `setdefault`, so it never overwrites an explicit header. |
| `backend/features/auth/services.py` | `login_lockout_seconds(email, ip)`: counts `REJECTED` auth events matching the email **or** the source IP inside the window (either identifier alone locks; both empty → 0). Past the threshold the wait is the time until the **newest** reject leaves the window. |
| `backend/features/auth/views.py` | `firebase_login`: `@scoped_throttle("auth_burst")` + the lockout check **before** verification — `429 {"code": "login_locked", "detail": "…"}` + `Retry-After`. The blocked path records **nothing**, so a retry storm cannot extend its own lockout (waiting clears it). `refresh` also scoped `auth_burst`. |
| `backend/features/catalog/views.py` | `catalog_list` + `catalog_detail` → `@scoped_throttle("catalog")`. |
| `backend/features/videohosting/views.py` | `video_token_view` (playback grant minting) → `@scoped_throttle("video_token")`. |
| `backend/features/adminconsole/views.py` | All 12 console endpoints → `@scoped_throttle("admin_burst")`. |
| `backend/features/common/testing.py` | `api_client()` clears the cache — rate counters key on the shared test ident (`127.0.0.1`) in a process-local cache, and `api_client()` is the one funnel every `/api/`-hitting test uses (including the two `TransactionTestCase` classes that bypass `ApiTestCase.setUp`). |
| `backend/README.md` | "Hardening" section (scopes table, lockout story, header story) + the four new env rows. |
| Tests (+13 → **394**) | `features/auth/tests.py`: lockout 429 with `login_locked` + bounded `Retry-After`; retry storm does not extend the lockout; a different source IP is unaffected; below-threshold failures still allow a valid login; service guard for unidentified callers; refresh capped at 10/min with `Retry-After` and DRF's default `{"detail"}` envelope (the lockout is the 429 that carries `code`); a fresh client = a fresh minute. `config/tests.py`: Permissions-Policy everywhere, admin-only report-only CSP, existing headers never overwritten, dev profile never gates HTTP, nosniff/referrer always on. |

## The two 429s are distinguishable by design

- **DRF throttling** (scope): default envelope `{"detail": "تم حد الطلب…"}` + `Retry-After` — the transient "slow down" of `be-auth-and-security` §6.
- **Login lockout** (DB-counted): `{"code": "login_locked", "detail": "…"}` + `Retry-After` — the auth-failure backoff, recorded in `AuthEvent`, survives restarts, keyed on email-or-IP.

## `check --deploy` (production-shaped env)

The four accepted Phase-1 warnings are **fixed**: W004 (HSTS), W008 (SSL redirect), W012 (session cookie secure), W016 (CSRF cookie secure). One warning remains, accepted with a reason: **W021** (`SECURE_HSTS_PRELOAD` off) — the `preload` directive is a hard-to-reverse, domain-wide browser contract; the API host is not being submitted to the preload list, and `include_subdomains` cannot honestly hold for it. Revisit only if the owner decides to opt into preload.

## Live smoke (dev server)

- Headers on `GET /api/catalog`: `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Request-ID` all present; `/` carries Permissions-Policy without the admin CSP.
- Login spam from one IP: `401 ×5` → **`429` + `Retry-After: 900`** + `{"code": "login_locked", "detail": "محاولات دخول كثيرة — أعد المحاولة بعد 900 ثانية."}`. (Smoke's own rejects were then cleared from the dev DB so the parity login could run.)

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes.
- `test -v2 --parallel` → **394 tests OK**.
- gitleaks whole-history → no leaks; pre-commit hooks pass on the changed files.
- Parity: **23/23** GET snapshots identical after the middleware + throttling changes.

## Notes for later phases

- Throttle counters live in the default cache (LocMem). Phase 9 (jobs) or any multi-instance deploy should move cache to a shared store (Redis) or counters become per-instance — noted in the master plan's risks.
- The admin CSP is report-only on purpose; enforcing it (and cleaning the admin's inline scripts/styles) is a later, separate decision.
- `login_lockout_seconds(email, …)` accepts an email for future flows (e.g. password-reset lockouts); login itself keys on IP today because a rejected token has no verified email yet.
