# Profile — الملف الشخصي

The editable account surface, rendered as the dashboard's `?view=profile`.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/profile` → redirects to `/dashboard?view=profile` |
| **Shell** | Standard (the redirect target is the immersive dashboard) |
| **Skeleton variant** | `default` |
| **Active tab** | `profile` |
| **Entry** | `pages/ProfilePage.tsx` (redirect); UI is `components/layout/ProfileView.tsx` |
| **State provider** | `context/ProfileProvider.tsx` |
| **Styles** | `profile.css` (concept classes `profile-*`, `toggle-*`) |

## Purpose

Lets a student view and edit their identity and preferences: avatar, personal info, learning level and interests, notification reminders, interface language and timezone — with a live account summary and save/reset feedback.

## Structure

```text
profile/
├── pages/
│   └── ProfilePage.tsx              <Navigate to={NAV_TARGETS.profile} replace/>
├── components/
│   ├── layout/
│   │   ├── ProfileView.tsx          thin composer: provider + content (mounted by the dashboard)
│   │   └── ProfileContent.tsx       two-column body + summary
│   ├── hero/ProfileHero.tsx         avatar + identity header
│   ├── cards/SettingsCard.tsx       grouped settings container (staggered entrance)
│   ├── controls/
│   │   ├── FieldText.tsx            labelled text input
│   │   ├── ToggleSwitch.tsx         on/off control
│   │   └── ProfileSaveActions.tsx   save/reset actions (rendered for both surfaces)
│   └── overlays/ProfileToast.tsx    transient save feedback
├── data/
│   └── profileFetchers.ts           mock/live profile read + save
├── context/
│   ├── profileContext.ts            context + useProfile()
│   └── ProfileProvider.tsx          owns editable state + save/reset
├── types.ts                         profile types, initial data, available interests
├── profile.css
└── README.md
```

## How it works

- `ProfileProvider` owns `profile` (`INITIAL_USER_PROFILE` in mock mode, `GET /profile` in live mode), `isSaving`, and `showToast`, and exposes `changeField`, `toggleInterest`, `toggleNotification`, `changeAvatar` (object URL from a file), `saveChanges` (700ms mock delay, or a real `PATCH /profile` → toast for 3.5s), and `resetProfile`.
- `ProfileContent` derives `currentLevelLabel` and `activeReminders` from the profile.
- `ProfileSaveActions` is deliberately rendered twice with surface classes (`hidden lg:flex` desktop anchor / `lg:hidden` mobile footer) so the taller summary card never pushes the buttons down.
- The UI is **mounted inside the dashboard** at `?view=profile`; the `/profile` route only redirects there. There is no separate profile page layout.

## Data

| Source | Provides |
| :--- | :--- |
| `types.ts` | `INITIAL_USER_PROFILE`, `AVAILABLE_INTERESTS`, profile types |
| `data/profileFetchers.ts` | `GET`/`PATCH /profile` in live mode; mock seed otherwise |
| `@/shared/components/Form/Dropdown` | language / timezone selects |
| `@/shared/components/Controls/SlidingSegmentedControl` | learning-level switch |
| `@/shared/lib/navigation` | `NAV_TARGETS.profile` (via `ProfilePage`) |

In mock mode edits live in provider state and are "saved" with a mock delay; in
live mode `saveChanges` PATCHes `/profile` and the provider loads the saved row on
mount. The backend has no auth yet — it targets the seeded demo learner.

## Notes

- The profile is a view, not a route — deep-link with `/dashboard?view=profile`.
- Avatar upload uses a local object URL with an initials fallback.

## Related

- Dashboard (host): [`../dashboard/README.md`](../dashboard/README.md)
- Routing & redirects: [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Backend profile endpoints: [`docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
