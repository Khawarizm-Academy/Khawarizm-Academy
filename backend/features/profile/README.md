# Profile — الملف الشخصي

The learner profile and preferences surface. The actual account identity lives
in `accounts.Learner` (the `auth` feature); this feature exposes the read/update
endpoint that edits that row.

## At a glance

| | |
| :--- | :--- |
| **App label** | `profile` |
| **Routes** | `GET/PATCH /api/profile` |
| **Owns** | nothing (no models; reads/writes `accounts.Learner`) |
| **Imports** | `get_demo_learner`, `user_profile` from `auth` |
| **Frontend twin** | `frontend/src/features/profile/` |

## Purpose

Provides `GET /api/profile` and `PATCH /api/profile` for editing identity and
preferences: full name, phone, learning level, interests, notification
preferences, language, and timezone. The returned shape is exactly
`UserProfileData`.

## Structure

```text
profile/
├── apps.py           AppConfig (label "profile")
├── views.py          profile_view (GET + PATCH)
├── urls.py           /api/profile
├── admin.py          empty (no models)
├── migrations/       (empty; no models)
└── README.md
```

## How it works

- On GET or PATCH, the view resolves the demo learner via
  `features.auth.services.get_demo_learner()`. On PATCH it maps the camelCase
  fields (`fullName`, `phone`, `learningLevel`, `interests`, `notifications`,
  `language`, `timezone`) to the learner fields (`full_name`, `phone`,
  `learning_level`, `interests`, `notifications_preferences`, `language`,
  `timezone`), saves, and returns `user_profile(learner)`.
- The `user_profile()` serializer lives in `features.auth.serializers` (owner of
  the Learner shape); both `auth` and `profile` reuse it.

## Data

| Source | Provides |
| :--- | :--- |
| `accounts.Learner` | the single editable account row |
| `auth.serializers.user_profile` | camelCase projection |

## Related

- Auth (identity + login stubs): [`../auth/README.md`](../auth/README.md)
- Dashboard (embeds profile view): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
