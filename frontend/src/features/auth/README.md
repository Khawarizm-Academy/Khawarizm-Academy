# Auth — تسجيل الدخول

The login entry point, with a fresh-login mode and a returning-user mode.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/login` (`?mode=welcome-back` reopens the returning-user flow) |
| **Shell** | `hideShell` — full screen, no navbar/footer/bottom bar |
| **Skeleton variant** | `default` |
| **Entry** | `pages/LoginPage.tsx` |
| **State provider** | `context/AuthLoginProvider.tsx` |
| **Styles** | `auth.css` (concept classes `auth-*`, `brand-seal*`, `toggle-*`) |

## Purpose

Lets a returning student sign in — email + social OAuth, or the passwordless "welcome back" flow — with mode switching, inline validation, a terms & privacy modal, and a success toast before routing to the dashboard.

## Structure

```text
auth/
├── pages/
│   └── LoginPage.tsx                thin orchestrator: provider + 2 views + overlays
├── components/
│   ├── views/LoginView/
│   │   ├── DesktopLoginView.tsx     split-screen: hero panel + auth chamber
│   │   └── MobileLoginView.tsx      one-column brand + body
│   ├── cards/
│   │   ├── ActiveAuthCard.tsx       picks the card by mode (record, no branch)
│   │   ├── DefaultLoginCard.tsx     email + social + validation
│   │   └── WelcomeBackCard.tsx      returning-user quick login
│   ├── chrome/
│   │   ├── AuthTopBar.tsx            one top bar, surface record
│   │   └── AuthLegalNotice.tsx       one notice, surface record
│   ├── controls/
│   │   ├── AuthModeSwitch.tsx        mode pill switcher (one component, two surfaces)
│   │   └── AuthSocialButton.tsx      provider button via a PROVIDERS record
│   ├── hero/
│   │   ├── AuthHeroPanel.tsx         desktop-only decorative panel
│   │   └── BrandSeal.tsx             shared brand mark
│   └── overlays/
│       ├── AuthTermsModal.tsx        shared modal, null when closed
│       └── AuthToast.tsx             shared toast, null when hidden
├── context/
│   ├── authLoginContext.ts           context + useAuthLogin() hook
│   └── AuthLoginProvider.tsx         owns mode, toast, terms modal, navigation
├── types.ts                          auth surfaces, modes, default user, auth copy
├── auth.css
└── README.md
```

## How it works

- `AuthLoginProvider` owns:
  - `authMode` (`login` / `welcome-back`), initialized from and synced to `?mode=welcome-back`,
  - `user` (a constant `DEFAULT_RETURNING_USER`),
  - `toastMessage` and `showTermsModal`,
  - actions: `changeMode` (writes the URL), `completeAuth` (success toast, then navigate to the dashboard after 800ms), `openTerms` / `closeTerms`, `goHome`.
- `DefaultLoginCard` keeps its own `email` / `error` / `isLoading`; `WelcomeBackCard` keeps `avatarError`.
- `ActiveAuthCard` selects `DefaultLoginCard` or `WelcomeBackCard` through a `Record<AuthMode, …>`, and each remounts with `animate-pop-in`.
- `AuthModeSwitch` is a single component for both surfaces; `lg:` breakpoints and short/long labels pick the size. `AuthSocialButton` reads one `PROVIDERS` record, so there is no provider `if`-chain.

## Data

| Source | Provides |
| :--- | :--- |
| `@/shared/json/auth.json` | `modeOptions` (login / welcome-back labels) |
| `@/shared/lib/navigation` | `NAV_TARGETS` (dashboard, home) |
| `@/app/routerContext` | `useNavigate`, `useSearchParams` |

Authentication is mocked: `completeAuth` shows a toast and navigates to `/dashboard`. A real backend would issue a session and fetch the user (see the backend contract).

## Notes

- Both surfaces render simultaneously; CSS breakpoints show one. The two views share one top bar, one legal notice, one toast, and one modal — never two copies.
- `?mode=welcome-back` is shareable view state and lives in the URL, not `useState`.

## Related

- Routing (`?mode`, `hideShell`): [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Desktop/mobile split: [`docs/02-architecture.md`](../../../../docs/02-architecture.md)
- Dashboard (post-login destination): [`../dashboard/README.md`](../dashboard/README.md)
