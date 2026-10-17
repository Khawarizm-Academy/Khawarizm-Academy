# Profile — الملف الشخصي

The signed-in account and preferences surface. Identity lives on
`accounts.User` (the `auth` feature); learning preferences live on
`accounts.StudentProfile`. This model-less feature exposes the read/update
endpoint that edits both.

## At a glance

| | |
| :--- | :--- |
| **App label** | `profile` |
| **Routes** | `GET/PATCH /api/profile` |
| **Owns** | nothing (no models; reads/writes `accounts.User` + `accounts.StudentProfile`) |
| **Imports** | `user_profile` from `auth`; the acting user is `request.user` |
| **Frontend twin** | `frontend/src/features/profile/` |

## Purpose

Provides `GET /api/profile` and `PATCH /api/profile` for editing identity and
preferences: full name, phone, learning level, interests, notification
preferences, language, and timezone. Every request is `IsAuthenticated`; the
returned shape is exactly `UserProfileData`.

## Structure

```text
profile/
├── apps.py           AppConfig (label "profile")
├── views.py          profile_view (GET + PATCH), acts on request.user
├── urls.py           /api/profile
├── admin.py          empty (no models)
├── tests.py          model-less route behavior
├── migrations/       (empty; no models)
└── README.md
```

## How it works

- Both methods act on `request.user` (`IsAuthenticated`). On PATCH it maps the
  identity fields (`fullName`, `phone`, `language`, `timezone`) to the `User`
  row, then maps the preference fields (`learningLevel`, `interests`,
  `notifications`) to a `StudentProfile` created on demand — so the account row
  stays lean. Finally it returns `user_profile(user)`.
- The `user_profile()` serializer lives in `features.auth.serializers` (owner of
  the account shape); both `auth` and `profile` reuse it.

## Data

| Source | Provides |
| :--- | :--- |
| `accounts.User` | identity: full name, phone, language, timezone |
| `accounts.StudentProfile` | preferences: learning level, interests, notifications |
| `auth.serializers.user_profile` | camelCase projection |

## Related

- Auth (identity + sessions): [`../auth/README.md`](../auth/README.md)
- Dashboard (embeds profile view): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
