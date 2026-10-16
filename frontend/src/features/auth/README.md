# Auth — تسجيل الدخول

The login entry point: one sign-in / create-account screen plus the app-wide
session context that every guarded page reads.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/login` (`/auth` redirects here; `?next=` returns the reader after sign-in) |
| **Shell** | `hideShell` — full screen, no navbar/footer/bottom bar |
| **Skeleton variant** | `default` |
| **Entry** | `pages/LoginPage.tsx` |
| **State providers** | `context/AuthProvider.tsx` (app-wide session) + `context/LoginPageProvider.tsx` (page screen/terms) |
| **Styles** | `auth.css` (concept classes `auth-*`, `brand-seal*`) |

## Purpose

Real sign-in: email + password (sign-in / register screens) exchanged for the
API's session, with Google/Facebook ready behind a real Firebase project, inline
validation, a terms & privacy modal, and a global auth toast for session-loss
and welcome notices.

## Structure

```text
auth/
├── pages/
│   └── LoginPage.tsx                thin orchestrator: auth guard + 2 views + terms modal
├── components/
│   ├── views/LoginView/
│   │   ├── DesktopLoginView.tsx     split-screen: hero panel + auth chamber
│   │   └── MobileLoginView.tsx      one-column brand + body
│   ├── cards/
│   │   └── LoginCard.tsx            the one real card: credentials + social + screen toggle
│   ├── chrome/
│   │   ├── AuthTopBar.tsx            one top bar, surface record
│   │   └── AuthLegalNotice.tsx       one notice, surface record
│   ├── controls/
│   │   └── AuthSocialButton.tsx      provider button via a PROVIDERS record
│   ├── hero/
│   │   ├── AuthHeroPanel.tsx         desktop-only decorative panel
│   │   └── BrandSeal.tsx             shared brand mark
│   └── overlays/
│       ├── AuthTermsModal.tsx        shared modal, null when closed
│       └── AuthToast.tsx             global notice, mounted by RootLayout
├── context/
│   ├── authContext.ts                app-wide context + useAuth() + SignInCredentials
│   ├── AuthProvider.tsx              owns user, config, isReady, isSubmitting, notice
│   ├── loginPageContext.ts           page-only context + useLoginPage()
│   └── LoginPageProvider.tsx         owns screen (sign-in/register) + terms modal
├── data/
│   ├── authFetchers.ts               typed calls to the /auth/* routes
│   └── firebaseClient.ts              lazy `firebase` SDK import (real project only)
├── types.ts                          AuthUser/Config/Result/Session, screens, labels
├── __tests__/AuthProvider.test.tsx
├── auth.css
└── README.md
```

## How it works

- `AuthProvider` owns `user`, `config`, `isReady`, `isSubmitting`, and `notice`.
  It boots by fetching `/auth/config`, then rehydrating a stored session via
  `/auth/me`. `signIn(provider, credentials)` mints an ID token — the synthetic
  `dev:<email>` when `config.devAuth`, otherwise the lazily imported Firebase
  SDK (`data/firebaseClient.ts`) — and posts it to `/auth/firebase`;
  `signOut()` calls `/auth/logout` and clears the tokens.
- Tokens live in `localStorage` (`shared/lib/authStorage.ts`).
  `shared/lib/apiClient.ts` attaches the Bearer header, does one silent
  refresh-and-replay on a 401, and otherwise clears the tokens and fires the
  registered auth-lost handler with the API's `code`; `AuthProvider` turns that
  into a signed-out user plus a `notice` from `SESSION_LOST_MESSAGES`.
- `LoginPageProvider` keeps the page-only state (`screen` = `sign-in` /
  `register`, terms modal) out of the app-wide auth context; `LoginPage`
  redirects away when a session is already live.
- `LoginCard` keeps its own field state, validates inline, and maps API/Firebase
  error codes to Arabic copy. Google/Facebook buttons render **disabled** with
  an `auth-hint` note while `config.devAuth` is true.
- `AuthSocialButton` reads one `PROVIDERS` record, so there is no provider
  `if`-chain.

## Data

| Source | Provides |
| :--- | :--- |
| `data/authFetchers.ts` | typed calls to `/auth/config`, `/auth/firebase`, `/auth/me`, `/auth/logout`, `/auth/sessions*` |
| `@/shared/lib/authStorage` | access + refresh tokens in `localStorage` |
| `@/shared/lib/apiClient` | Bearer header, silent refresh, auth-lost handler |
| `@/shared/lib/navigation` | `NAV_TARGETS` (dashboard, home) |
| `@/app/routerContext` | `useNavigate`, `useSearchParams` |

## Notes

- Both surfaces render simultaneously; CSS breakpoints show one. The two views share one top bar, one legal notice, one terms modal — never two copies. The toast is global (`RootLayout`), not per-page.
- Authentication is real end-to-end: the old dummy auth cards and `shared/json/auth.json` were deleted; there is no mocked sign-in path left.

## Related

- Routing (`?next`, `hideShell`): [`docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
- Desktop/mobile split: [`docs/02-architecture.md`](../../../../docs/02-architecture.md)
- Dashboard (post-login destination): [`../dashboard/README.md`](../dashboard/README.md)
