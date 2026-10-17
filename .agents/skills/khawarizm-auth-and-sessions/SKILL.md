---
name: khawarizm-auth-and-sessions
description: The full-stack identity and access playbook for Khawarizm Academy — Firebase sign-in (Email, Google, Facebook), the custom email-first User with student/instructor/admin roles, HS256 access tokens plus rotating refresh tokens, the UserSession table with per-device footprint, single-device enforcement, the admin console analytics contract, and the frontend AuthProvider/apiClient refresh flow. Use whenever adding or changing authentication, sign-in/out, roles, permissions, sessions, devices, the /api/auth or /api/admin endpoints, or any protected page or route.
---

# Khawarizm Academy — Auth, Sessions & Access Skill

Identity is the one domain that touches **every** layer: a Firebase project, a
Django user model, two token types, a session table, a permissions check, an
admin console, and a React context with an interceptor. This skill is the single
source for all of it.

> Backend rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md).
> Config & secrets: [`khawarizm-environment-and-deploy`](../khawarizm-environment-and-deploy/SKILL.md).
> Routes & guards: [`khawarizm-routing`](../khawarizm-routing/SKILL.md).
> Human docs: [`docs/08-backend-architecture.md`](../../../docs/08-backend-architecture.md),
> [`docs/07-backend-contract.md`](../../../docs/07-backend-contract.md).

---

## 1. Mental model — three layers, two directions

```
Firebase (identity provider)          Django (our authority)             React (the SPA)
──────────────────────────           ──────────────────────            ─────────────────
Email / Google / Facebook   ──ID──▶  Admin SDK verifies the token  ──▶  POST /api/auth/firebase
  mints an ID token (JWT)            upserts User + opens UserSession     stores access+refresh
                                     mints access (HS256) + refresh       Authorization: Bearer …
```

- **Firebase is the identity provider, not the authority.** It only proves *who*
  the person is. Every *permission* decision (role, active session, admin) is
  ours, in Django.
- **The web config flows one way.** The SPA holds **no** Firebase keys; at boot
  it fetches them from `GET /api/auth/config`. The backend env is the single
  place to change the Firebase project — no frontend rebuild.
- **Two token types, two jobs.** A short-lived **access** token proves the
  request; a long-lived **refresh** token mints new access tokens. Refresh is
  opaque, single-use, and stored hashed.

---

## 2. Roles & the user model

`features/auth` (app label **`accounts`** — Django reserves `auth`) owns the user.

```python
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None                                  # email-first: no username
    email = models.EmailField(unique=True)
    role = models.CharField(choices=Role.choices, default=Role.STUDENT)
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    # display: full_name, phone, membership_status, avatar_initials, avatar_url,
    #          language, timezone, last_seen_at
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    @property
    def is_admin(self) -> bool:
        """The admin role or Django staff — both reach the console."""
        return self.role == Role.ADMIN or self.is_staff
```

| Role (`features.common.choices.Role`) | Profile table | Reaches the admin console? |
| :--- | :--- | :--- |
| `student` | `StudentProfile` (learning_level, interests, notifications) | no |
| `instructor` | `InstructorProfile` (headline, bio, credential, expertise) | no |
| `admin` | *(none)* | **yes** |

Rules:
- **Admin is two switches that agree.** `is_admin` is true for `role == "admin"`
  **or** `is_staff`. Promoting via the console sets `role="admin"` and
  `is_staff=True` together (`adminconsole.set_role`); Django superusers created
  with `createsuperuser` are staff but may keep any role.
- **The profile is created lazily** by `services.ensure_profile(user)`: instructor
  → `InstructorProfile`, student → `StudentProfile`, admin → nothing.
- **A new sign-in creates a student.** First Firebase login with an unknown email
  mints a `User(role=STUDENT)` and its profile.
- **Everyone FKs `settings.AUTH_USER_MODEL`** (string `"accounts.User"`), never
  `from features.auth.models import User` in another app's model.

---

## 3. The Firebase flow

### 3.1 The three values (Auth only)
Only `apiKey`, `authDomain`, `projectId` are read. Storage, Messaging, and
Analytics keys are deliberately ignored.

```python
FIREBASE_API_KEY      = os.environ.get("FIREBASE_API_KEY", "")
FIREBASE_AUTH_DOMAIN  = os.environ.get("FIREBASE_AUTH_DOMAIN", "")
FIREBASE_PROJECT_ID   = os.environ.get("FIREBASE_PROJECT_ID", "")   # the on/off switch
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")  # service account (optional)
FIREBASE_CREDENTIALS      = os.environ.get("FIREBASE_CREDENTIALS", "")       # inline JSON (optional)
FIREBASE_ALLOW_DEV_TOKENS = env_bool("FIREBASE_ALLOW_DEV_TOKENS", DEBUG)
FIREBASE_CLOCK_SKEW_SECONDS = max(0, min(60, env_int("FIREBASE_CLOCK_SKEW_SECONDS", 60)))
```

- **`FIREBASE_PROJECT_ID` is the switch.** Set → real Admin-SDK verification.
  Empty → the `dev:` fallback is available.
- **A half-filled config fails loudly at boot:** project id without
  apiKey/authDomain raises `ImproperlyConfigured`.
- **`check_revoked=False`** — verification needs **no service account** (it only
  fetches Google's public certs). Pass a secret-free `AnonymousCredentials()`
  when no service account is set, so the SDK never reaches for
  Application Default Credentials (which most dev boxes lack, and whose probe
  makes every login slow then 401).
- **Clock skew is real.** ID tokens carry the issuer's timestamp; with zero skew
  a lagging machine rejects every sign-in with `Token used too early`.
  `FIREBASE_CLOCK_SKEW_SECONDS` (clamped to the SDK's `0..60`) is the margin —
  sync the clock for the real fix.

### 3.2 Verification (`features/auth/firebase.py`)
```python
def verify_id_token(id_token: str) -> dict:
    if settings.FIREBASE_PROJECT_ID:                       # real project → Admin SDK
        return _verify_with_firebase(id_token)
    if settings.FIREBASE_ALLOW_DEV_TOKENS and id_token.startswith("dev:"):
        return _verify_dev(id_token)                       # dev:<email>[:<role>]
    raise FirebaseError("Firebase is not configured on this server.")
```
It returns a normalised identity dict: `{uid, email, name, picture, provider}`,
where `provider` maps `firebase.sign_in_provider` via `_PROVIDER_MAP`
(`password`→`PASSWORD`, `google.com`→`GOOGLE`, `facebook.com`→`FACEBOOK`).

- **Dev tokens** (`dev:<email>` or `dev:<email>:<role>`) exist only while
  `FIREBASE_PROJECT_ID` is empty **and** `FIREBASE_ALLOW_DEV_TOKENS` is true.
  Setting a project id disables them — the seeded demo logins then 401, and local
  admin access needs a manual promote (`is_staff=True, is_superuser=True`).

---

## 4. Tokens & the session lifecycle (`features/auth/tokens.py`)

| Token | Shape | Lifetime | Storage |
| :--- | :--- | :--- | :--- |
| **Access** | HS256 JWT over `SECRET_KEY`: `{sub, sid, role, typ:"access", jti, iat, exp}` | `ACCESS_TOKEN_MINUTES = 60` | client `localStorage` |
| **Refresh** | opaque `secrets.token_urlsafe(48)` | `REFRESH_TOKEN_DAYS = 30` | client `localStorage`; **sha-256 hash** in `UserSession.refresh_token_hash` |

Helpers: `make_access_token(user, session)`, `decode_access_token(token)`,
`make_refresh_token() -> (raw, hash)`, `hash_refresh_token(raw)`,
`refresh_expiry()`.

**The one-session rule.** `services.open_session` mints the pair, then calls
`revoke_other_sessions(user, keep=new)` — every other active session is marked
`is_active=False, revoked_reason=SIGNED_IN_ELSEWHERE`, with a `REVOKED` event
noted `"ended N other session(s) on this login"`. Refresh is **single-use**:
`rotate_session` issues a new refresh and hash, so replaying an old refresh
token fails.

`UserSession` fields that matter: `refresh_token_hash`, `access_jti`, the device
footprint (§5), `is_active`, `revoked_reason`, `created_at`, `last_seen_at`,
`expires_at`. Methods: `revoke(reason)`, `touch()` (a cheap `update` of
`last_seen_at`).

`AuthEvent` is the append-only audit log: `kind` (`login|logout|refresh|revoked|rejected`),
`provider`, `email`, `session`, `user`, the device footprint, `ip_address`,
`detail` (up to 240 chars), `created_at`. The rejected reason for a failed
sign-in is written here — always look here first when a login 401s.

---

## 5. Device footprint & single-device enforcement

`features/auth/device.py` parses the `User-Agent` into a **footprint** so a user
can spot a stranger in their device list:

| Field | Source |
| :--- | :--- |
| `os` | `_OS` table — Windows 10/11, Windows, iOS, iPadOS, macOS, Android, ChromeOS, Linux |
| `browser` | `_BROWSERS` table — Edge, Opera, Chrome, Firefox, Safari |
| `device_type` | `DeviceType` — `desktop`, `mobile`, `tablet`, `unknown` |
| `device_label` | `f"{browser} على {os}"` |
| `ip_address` | `client_ip(request)` — first `X-Forwarded-For`, else `REMOTE_ADDR` |

- **Parsing is data (tables), never an `if` ladder.** Add a UA signature by
  adding a row to `_OS` / `_BROWSERS`.
- **Enforcement is one line:** a new sign-in revokes the user's other active
  sessions. There is no "keep N devices" mode — the product is single-device by
  policy. The revoked client learns why from the 401 body's `code`.

---

## 6. The `/api/auth/*` contract

All JSON, camelCase, mounted under `/api/` by `features/auth/urls.py`.

| Method | Path | Permissions | Request → Response |
| :--- | :--- | :--- | :--- |
| GET | `/auth/config` | AllowAny | → `{firebase: {apiKey, authDomain, projectId}, providers: ["password","google","facebook"], devAuth: bool}`. `compact` drops blank keys, so `firebase` may be `{}`. |
| POST | `/auth/firebase` | AllowAny | `{idToken}` → `{accessToken, refreshToken, user, session}`. Bad token → 401 `{"detail": "تعذر التحقق من الهوية."}` (+ a `REJECTED` event). |
| POST | `/auth/refresh` | AllowAny | `{refreshToken}` → `{accessToken, refreshToken, user}`. Dead token → 401 `{"code":"session_invalid"}`. |
| GET | `/auth/me` | IsAuthenticated | → `user_profile`. |
| POST | `/auth/logout` | IsAuthenticated | revokes the current session (reason `logout`) → `{loggedOut: true}`. |
| GET | `/auth/sessions` | IsAuthenticated | → `{sessions: [session_payload, …]}` (latest 50). |
| POST | `/auth/sessions/<uuid>/revoke` | IsAuthenticated | → the revoked `session_payload`. 404 `{"detail":"الجلسة غير موجودة."}`. |

**Two payload shapes** (`features/auth/serializers.py`), reused everywhere:

```python
# user_profile — the account the SPA renders
{id, email, fullName, phone, role, isAdmin, membershipStatus, avatarInitials,
 avatarUrl, language, timezone, learningLevel, interests, notifications,
 headline, credential, createdAt, lastSeenAt}

# session_payload — one device row
{id, os, browser, deviceType, deviceLabel, ipAddress, isActive, isCurrent,
 revokedReason, createdAt, lastSeenAt}
```
`isCurrent` is true when the row is the caller's own session. `session_with_user`
= `session_payload` + `user: {id, email, fullName, role}` (admin tables only).

**401 bodies always carry a `code`.** `AccessTokenAuthentication` raises
`SessionAuthError(code)` → `{"code", "detail"}` where code is one of
`token_expired`, `token_invalid`, `session_missing`, `signed_in_elsewhere`,
`logout`, `expired`, `revoked_by_admin`. `authenticate_header` returns
`"Bearer"` so DRF keeps **401** (not 403) for a missing token.

**`request.user` is the `User`; `request.auth` is the `UserSession`.** Under
`AccessTokenAuthentication` (the global default), `request.auth` is the live
session object — `.revoke(reason)` on it is how logout works.

---

## 7. The `/api/admin/*` contract

`features/adminconsole` owns **no tables** — it reads across every feature. Every
endpoint is `@permission_classes([IsAuthenticated, IsAdminRole])`, where
`IsAdminRole` allows `user.role == "admin"` **or** `user.is_staff`. Non-staff get
**403**. A bad numeric query param is a clean **400** (`InvalidParameter`), never
a 500.

| Method | Path | Query | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/admin/overview` | — | counters: users (total/students/instructors/admins/newLast7Days), sessions (active/total), activity (loginsLast24h/7d, rejectedLast7d, revocationsLast7d) |
| GET | `/admin/users` | `q`, `role`, `page` | `{total, page, pageSize:20, results:[user_row]}` |
| GET | `/admin/users/<uuid>` | — | `{profile, sessions, events}` — events **without** `email` |
| POST | `/admin/users/<uuid>/role` | body `{role}` | the updated `user_profile`. Self-change → 400 |
| GET | `/admin/sessions` | `q`, `active` (`true`/`false`), `page` | `{total, page, pageSize:20, results:[session_with_user]}` |
| POST | `/admin/sessions/<uuid>/revoke` | — | the revoked `session_with_user` (reason `revoked_by_admin`) |
| GET | `/admin/analytics/logins` | `days` (1–90, default 14) | `{days, points:[{date, count}]}` |
| GET | `/admin/analytics/devices` | — | `{os, browser, deviceType}` — each `[{key, count}]` |
| GET | `/admin/events` | `kind` | `{results:[…]}` latest 100 — **includes** `email` |

- **Write private data once.** The per-user `events` omit `email` (the row is
  already scoped to one user); the global `/admin/events` carries it.
- **`_int_param(request, name, default, low)`** floors an int param and raises
  `InvalidParameter` on junk; `days` is capped at 90.
- **Role changes are guarded:** you cannot change your own role, and an unknown
  role is a 400.

---

## 8. Frontend — the SPA side

### 8.1 Boot (`features/auth/context/AuthProvider.tsx`)
`<AuthProvider>` wraps `<RootLayout>` in `App.tsx`. One effect:
1. registers `setAuthLostHandler(code => …)` (maps the 401 `code` to an Arabic message);
2. `GET /auth/config` → `config` (Firebase web config + `devAuth`);
3. if a stored access token exists → `GET /auth/me` → `user`;
4. sets `isReady`.

It exposes `{user, config, isReady, isSubmitting, notice, signIn, signOut, setNotice}`
via `useAuth()` (`context/authContext.ts`). **No `refresh` method** — refresh is
the interceptor's job. `signIn(provider, credentials?)` uses the `dev:` token when
`config.devAuth && provider === 'password'`, else lazily loads the Firebase SDK
(`data/firebaseClient.ts` does the dynamic `import('firebase/app')` /
`import('firebase/auth')` — the SDK never loads until a real sign-in).

### 8.2 Token storage & refresh (`shared/lib/`)
- `authStorage.ts` — `getAccessToken` / `getRefreshToken` / `setTokens` /
  `clearTokens` over `localStorage` keys `khawarizm.accessToken` /
  `khawarizm.refreshToken`.
- `apiClient.ts` — reads `import.meta.env.VITE_API_BASE_URL` (**throws at import
  if unset**), attaches `Authorization: Bearer <access>`, and on **401** (except
  the auth-free paths `/auth/config`, `/auth/firebase`, `/auth/refresh`) does a
  **single-flight** `POST /auth/refresh`, replays the request once, and on failure
  calls `clearTokens()` + the auth-lost handler.

### 8.3 Guards & the login page
- `RouteGuard` reads `meta.requiresAuth` / `meta.requiresAdmin` from `routes.json`:
  boots a skeleton until `isReady`, sends guests to `/login?next=<encoded>`, and
  sends signed-in non-admins away from `/admin`.
- `LoginPage` (`hideShell: true`) is a thin orchestrator:
  `LoginPageProvider` → `.auth-shell` → `DesktopLoginView` + `MobileLoginView` +
  `AuthTermsModal` (`AuthToast` mounts once in `RootLayout`). `LoginCard` owns the
  form and toggles `screen` between `'sign-in'` and `'register'` via `useLoginPage()`.

---

## 9. Adding to the auth stack

**A protected endpoint:** decorate with
`@permission_classes([IsAuthenticated])` (or add `IsAdminRole` for staff). Read
the caller as `request.user`; read the session as `request.auth`. Never accept a
`user_id` from the body when `request.user` is the answer.

**A protected page:** add `"requiresAuth": true` (or `"requiresAdmin": true`) to
its `routes.json` entry and let `RouteGuard` handle the redirect — never branch on
`user` inside the page for access control.

**A new role-gated route group:** reuse `IsAdminRole`; do not re-roll a
permission class. A `role` check that also needs staff must use `user.is_admin`.

**A new provider:** add the enum to `AuthProvider`, a `_PROVIDER_MAP` row, a
`provider` in `/auth/config`'s `providers`, and a branch in `firebaseClient.ts`'s
social provider record — nothing else changes.

---

## 10. Testing

Backend: `features/auth/tests.py` + `features/adminconsole/tests.py`, on the
shared kit. `testing.authenticate(client, user)` opens a **real** session and sets
the Bearer token, so protected routes test as a real client.

```python
class AdminEndpointTests(ApiTestCase):
    def test_a_student_cannot_list_users(self):
        authenticate(self.client, make_user(role=Role.STUDENT))
        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    def test_staff_reaches_the_console(self):
        authenticate(self.client, make_user(role=Role.ADMIN))
        self.assertEqual(self.client.get("/api/admin/users").status_code, 200)
```

Pin the Firebase profile per class when exercising the dev fallback (so a real
project in `.env` cannot leak in):
```python
@override_settings(FIREBASE_PROJECT_ID="", FIREBASE_ALLOW_DEV_TOKENS=True)
class DevTokenTests(ApiTestCase): …
```
Frontend: `features/auth/__tests__/AuthProvider.test.tsx` and
`shared/lib/__tests__/apiClient.test.ts` (refresh-and-replay, auth-lost). Mock the
global `fetch`; re-set implementations in each `beforeEach` (`restoreMocks` is on).

---

## 11. Do / Don't

| Do | Don't |
| :--- | :--- |
| `settings.AUTH_USER_MODEL` / `"accounts.User"` for FKs | `from features.auth.models import User` cross-app |
| Let the SPA fetch Firebase config from `/auth/config` | Put Firebase keys in the frontend env |
| `AnonymousCredentials()` when no service account is set | Let the SDK fall back to Application Default Credentials |
| Store the refresh token **hashed** | Store or return the raw refresh token from the server |
| Revoke other sessions on sign-in (`signed_in_elsewhere`) | Allow many concurrent devices |
| 401 bodies with a `code` | A bare 401 the client cannot act on |
| `request.user` for identity, `request.auth` for the session | Trust a `user_id` from the request body |
| `IsAdminRole` / `user.is_admin` | `if user.role == "admin"` scattered around |
| Read `AuthEvent.detail` when a login fails | Guess at a silent 401 |

---

## Related

- Config, secrets, troubleshooting (ADC, clock skew): [`khawarizm-environment-and-deploy`](../khawarizm-environment-and-deploy/SKILL.md)
- Route flags & guards: [`khawarizm-routing`](../khawarizm-routing/SKILL.md)
- Backend rules: [`khawarizm-backend`](../khawarizm-backend/SKILL.md)
- Adding a backend feature: [`khawarizm-backend-feature`](../khawarizm-backend-feature/SKILL.md)
