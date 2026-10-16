# Auth — المصادقة والحساب

Learner identity and the login surface. Real Firebase-JWT authentication: a
Firebase ID token is exchanged for this API's own access/refresh session.

## At a glance

| | |
| :--- | :--- |
| **App label** | `accounts` (folder `features/auth`) |
| **Routes** | `GET /api/auth/config`, `POST /api/auth/firebase`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/sessions`, `POST /api/auth/sessions/<uuid>/revoke` |
| **Owns** | `User`, `StudentProfile`, `InstructorProfile`, `UserSession`, `AuthEvent` — the account every other feature reads |
| **Frontend twin** | `frontend/src/features/auth/` + `frontend/src/features/profile/` |

## Purpose

Answers "who is the current user?" for the whole API.
`AccessTokenAuthentication` resolves `Authorization: Bearer <access>` to a live
`UserSession` and its `User`, so every learner-scoped read (dashboard, profile,
admin console) resolves through this feature.

## Structure

```text
auth/
├── apps.py            AppConfig (label "accounts")
├── models.py          User, StudentProfile, InstructorProfile, UserSession, AuthEvent
├── firebase.py        verify_id_token() — Firebase Admin SDK (or dev tokens)
├── tokens.py          HS256 access token (60 min) + opaque refresh (30 days)
├── authentication.py  AccessTokenAuthentication + SessionAuthError codes
├── device.py          user-agent/IP parsing for the session footprint
├── permissions.py     IsAdminRole
├── serializers.py     user_profile / session_payload / session_with_user / auth_config
├── services.py        open_session, rotate_session, upsert_firebase_user, record_event, ensure_profile
├── views.py           config / firebase / refresh / me / logout / sessions / revoke
├── urls.py           /api/auth/*
├── admin.py          User, profile, session, event admin
├── tests.py
├── migrations/
└── README.md
```

## How it works

- `firebase.verify_id_token()` verifies a real ID token with the Firebase Admin
  SDK (project id from settings). In development, when `FIREBASE_ALLOW_DEV_TOKENS`
  is on and no `FIREBASE_PROJECT_ID` is set, the synthetic `dev:<email>`
  (optionally `dev:<email>:<role>`) token is accepted instead.
- `POST /api/auth/firebase` upserts the user and opens a session; the refresh
  token is stored **hashed** on the session. `POST /api/auth/refresh` is
  single-use — it rotates both tokens, so a replayed refresh token gets 401.
- `AccessTokenAuthentication` maps failures to `SessionAuthError(code)`,
  rendered as `{"code": ..., "detail": ...}` — `token_expired`, `token_invalid`,
  `signed_in_elsewhere`, `logout`, `expired`, `revoked_by_admin`,
  `session_missing`. `authenticate_header()` returns `"Bearer"` so DRF keeps 401
  rather than 403.
- `user_profile()` is the **single owner** of the user JSON shape; the profile
  feature imports it rather than re-declaring the keys.

## Data

| Source | Provides |
| :--- | :--- |
| `models.User` | email (the `USERNAME_FIELD`, no username), display fields, role (`student` / `instructor` / `admin`); `is_staff` mirrors the admin role |
| `models.UserSession` | device footprint (os, browser, device type/label, IP), hashed refresh token, expiry, revoke reason |
| `models.AuthEvent` | audit trail of logins, refreshes, revocations |
| `serializers.user_profile` | the camelCase `UserProfileData` payload |

## Notes

- **Single device:** `services.open_session` revokes every other active session
  for that user with reason `signed_in_elsewhere` before opening the new one.
- Every model here uses a UUID primary key (`features/common/models.py`).
- `serializers.py` is imported by `features/adminconsole` (user/session lists).

## Related

- Profile (edits this user): [`../profile/README.md`](../profile/README.md)
- Dashboard (reads it): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
