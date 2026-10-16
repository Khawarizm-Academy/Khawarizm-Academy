# Auth — المصادقة والحساب

Learner identity and the login surface. While real authentication is stubbed,
the API always acts as one demo learner, created on first request.

## At a glance

| | |
| :--- | :--- |
| **App label** | `accounts` (folder `features/auth`) |
| **Routes** | `/api/auth/me`, `/api/auth/login`, `/api/auth/oauth/:provider`, `/api/auth/logout` |
| **Owns** | `Learner` — the account every other feature reads |
| **Frontend twin** | `frontend/src/features/auth/` + `frontend/src/features/profile/` |

## Purpose

Answers "who is the current user?" for the whole API. Every learner-scoped read
(dashboard, profile) resolves through `get_demo_learner()` here, so swapping the
stub for real sessions later only touches this feature.

## Structure

```text
auth/
├── apps.py          AppConfig (label "accounts")
├── models.py        Learner
├── serializers.py   user_profile() — the UserProfileData shape
├── services.py      get_demo_learner() — resolve/create the demo account
├── views.py         me / login / oauth / logout stubs
├── urls.py          /api/auth/*
├── admin.py         Learner admin
├── migrations/
└── README.md
```

## How it works

- `get_demo_learner()` looks up `ahmad.q@example.com`; on first request it
  creates the row, and on a read-only database it returns an unsaved in-memory
  learner so reads still succeed.
- `auth_me` returns `user_profile(learner)`; `auth_login` and `auth_oauth`
  return `{ token, user }`; `auth_logout` returns `{ loggedOut: true }`.
- `user_profile()` is the **single owner** of the learner JSON shape; the
  profile feature imports it rather than re-declaring the keys.

## Data

| Source | Provides |
| :--- | :--- |
| `models.Learner` | email, name, phone, avatar, level, interests, notification prefs, language, timezone |
| `serializers.user_profile` | the camelCase `UserProfileData` payload |

## Related

- Profile (edits this learner): [`../profile/README.md`](../profile/README.md)
- Dashboard (reads it): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
