---
name: khawarizm-desktop-mobile-views
description: How to structure pages and components that have distinct Desktop and Mobile views in Khawarizm Academy. Use whenever splitting a page into surface-specific view components, organizing Desktop/Mobile view pairs into component-name folders, or sharing page state between surfaces with context or props. Covers the folder layout, naming rules, the context provider + hook pattern, data-driven surface differences, and the anti-duplication rules.
---

# Khawarizm Academy — Desktop & Mobile View Organization

The standard for **splitting one page into a Desktop View and a Mobile View** and for **organizing components that render differently per surface**. Every page that shows different markup on `lg+` and below-`lg` is split this way instead of growing one giant file.

> Applies with [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) §6 (no desktop/mobile duplication) and [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) §3.7 (repeated class strings → concept classes). This skill is the folder layout that makes those rules easy to read and enforce.

---

## 1. When a component gets a folder

**Rule: if one component (or page area) has both a Desktop View and a Mobile View, it lives in a folder named after that component, inside the `views/` category, and the two surfaces are two files inside it.**

```
src/features/<feature>/components/views/<ComponentName>/
├── Desktop<ComponentName>View.tsx
└── Mobile<ComponentName>View.tsx
```

Never keep both surfaces as two devices inside one file, and never prefix two sibling files (`DesktopX.tsx` + `MobileX.tsx` at the components root) when they are the same "something".

**A component with only one surface stays a flat single file:**

```
src/features/<feature>/components/<category>/<ComponentName>.tsx
```

> Note the two different `views/` shapes: a **surface-pair folder** (`views/LoginView/`) holds two files, while a **single re-usable view** is one flat file (`views/EnrolledCoursesView.tsx`, `views/NotificationsView.tsx`). Only the pair gets the component-name folder.

---

## 2. Exact naming

| Piece | Name |
| :--- | :--- |
| Folder | `<ComponentName>/` (what the two views are views *of*) |
| Desktop file | `Desktop<ComponentName>View.tsx` |
| Mobile file | `Mobile<ComponentName>View.tsx` |

Real examples (auth + courses):

```
features/auth/components/views/LoginView/
├── DesktopLoginView.tsx
└── MobileLoginView.tsx

features/courses/components/views/CourseLandingView/
├── DesktopCourseLandingView.tsx
└── MobileCourseLandingView.tsx

features/courses/components/views/CoursePlayerView/
├── DesktopCoursePlayerView.tsx
└── MobileCoursePlayerView.tsx
```

Both files export one named component (`export const DesktopLoginView: React.FC`). No `index.ts` barrel — import the file directly with the `@/` alias (see [`khawarizm-organization-and-imports`](../khawarizm-organization-and-imports/SKILL.md)):

```ts
import { DesktopLoginView } from '@/features/auth/components/views/LoginView/DesktopLoginView';
import { MobileLoginView } from '@/features/auth/components/views/LoginView/MobileLoginView';
```

---

## 3. What goes where inside a split

- **Page component** (`pages/<Feature>Page.tsx`) becomes a **thin orchestrator**: mount the provider, render both views as siblings, mount the shared overlays (toast, modal). No layout markup.
- **Surface views** (the two files above) hold only **surface-specific layout** — the split-screen chamber vs the one-column body. They read shared state from context and pass `surface="desktop" | "mobile"` to shared chrome components.
- **Shared chrome** stays as flat single-file components *beside* the views folder when it is used by both surfaces. Items that differed only by a label or a class string become **one component with a surface data record** (§5).
- **Shared overlays** (toast, modal, drawer) are flat components that render nothing when hidden (`if (!open) return null;`).

---

## 4. Sharing state between the surfaces

Two valid options; prefer **context** when 3+ consumers would otherwise prop-drill the same bundle.

### 4.1 Context (recommended for page-wide state)
One page manages its state, both views (and their shared chrome) read it.

```
src/features/<feature>/context/
├── <feature><Area>Context.ts        # createContext + type + use<Feature><Area>() hook
└── <Feature><Area>Provider.tsx      # the provider component (owns state)
```

**Why two files — the fast-refresh rule:** `react-refresh/only-export-components` fails when one file exports both a component (the provider) and a hook. Keep the hook in the plain `.ts` (like `src/app/routerContext.ts` does) and the component in the `.tsx`. No circular import: the provider imports the context from the `.ts`; the hook file imports only types.

```ts
// context/loginPageContext.ts
export interface LoginPageContextValue { /* screen, terms modal, handlers */ }
export const LoginPageContext = createContext<LoginPageContextValue | null>(null);

export function useLoginPage(): LoginPageContextValue {
  const value = useContext(LoginPageContext);
  if (!value) throw new Error('[auth] useLoginPage must be used inside LoginPageProvider.');
  return value;
}
```

```tsx
// context/LoginPageProvider.tsx — owns all page state, passes it via value
export const LoginPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => { … };
```

**Fail loudly:** the hook throws outside the provider ([`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) §9).

### 4.2 Props (fine for a small bundle)
When only the two views consume the state and it is 2–3 values, pass props from the page instead of creating a context. Do not prop-drill the same value through 4 intermediate components when context exists.

---

## 5. Surface differences are data, not branches

Two views of the same UI still follow [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) §3 and §6 — **never `if (isMobile)` or nested surface ternaries** to pick which markup renders.

- **Label / class / width differs** → a `Record<AuthSurface, …>` inside the component, one entry per surface:

```tsx
const TOP_BAR: Record<AuthSurface, { className: string; backLabel: string }> = {
  desktop: { className: 'auth-top-bar', backLabel: 'العودة للرئيسية' },
  mobile: { className: 'auth-top-bar max-w-md mb-4', backLabel: 'الرئيسية' },
};
```

- **Which view / panel is active** → a lookup keyed by the state discriminator (a `Record<Screen, ReactNode>`), not a ternary chain.
- **Genuinely different screen content with real markup differences** → an early return in one shared component (allowed: "genuinely different work"), or a record of render functions per surface.
- The two surfaces share **one** top bar, **one** legal notice, **one** toast, **one** modal — never two copies.

---

## 6. Step-by-step — split a page into views

1. **Find the shared state** (screen, toggles, modal open, toast, URL sync) and the shared handlers.
2. **Create the context** (`.ts`) + provider (`.tsx`) under `features/<feature>/context/` and move the state + handlers into the provider.
3. **Extract shared chrome** into flat components beside the views folder: top bar, legal notice, footer, the content card. Use a `Surface` record for surface-varying labels/classes.
4. **Create the folder** `components/views/<ComponentName>/` and move the existing desktop JSX → `Desktop<ComponentName>View.tsx`, mobile JSX → `Mobile<ComponentName>View.tsx`. Each reads context; each passes `surface` to shared chrome.
5. **Slim the page** to: provider → shell div → toast → both views → modal.
6. **Verify** (§8).

---

## 7. Auth — the reference split

`features/auth/` is the canonical example. It has **two** contexts: an app-wide
session (`AuthProvider`) and the login page's own UI state (`LoginPageProvider`).

```
features/auth/
├── context/
│   ├── authContext.ts               # AuthContext + useAuth() — the app-wide session
│   ├── AuthProvider.tsx             # boots /auth/config + /auth/me, owns signIn/signOut
│   ├── loginPageContext.ts          # LoginPageContext + useLoginPage() — page-only state
│   └── LoginPageProvider.tsx        # owns screen ('sign-in'|'register') + terms modal
├── components/
│   ├── cards/
│   │   └── LoginCard.tsx            # the form; reads useLoginPage()/useAuth(), variant prop
│   ├── hero/
│   │   ├── AuthHeroPanel.tsx        # desktop-only, stays flat (single surface)
│   │   └── BrandSeal.tsx            # shared by hero header + mobile brand
│   ├── chrome/
│   │   ├── AuthLegalNotice.tsx      # one component, LOGIN_NOTICE per surface
│   │   └── AuthTopBar.tsx           # one top bar, TOP_BAR record per surface
│   ├── controls/
│   │   └── AuthSocialButton.tsx     # PROVIDERS record (class + brand mark)
│   ├── overlays/
│   │   ├── AuthTermsModal.tsx       # shared overlay, null when closed
│   │   └── AuthToast.tsx            # shared overlay, mounted once in RootLayout
│   └── views/LoginView/
│       ├── DesktopLoginView.tsx     # hero + top bar + card + legal notice
│       └── MobileLoginView.tsx      # one-column brand + body
└── pages/
    └── LoginPage.tsx                # provider → .auth-shell → 2 views + modal
```

`features/courses/` reuses the same pattern for `views/CourseLandingView/` and `views/CoursePlayerView/`.

---

## 8. Verification

```bash
cd frontend
npm run build      # tsc -b + vite build
npx eslint src     # includes react-refresh/only-export-components — keep hooks out of .tsx
```

Then verify **behavior**, not just types: the refactor must render the exact same DOM on both surfaces — print/compare the JSX tree before and after (same class names, same `key`-driven pop-in remounts, same overlays).

---

## 9. Related skills & docs

- [`khawarizm-code-style`](../khawarizm-code-style/SKILL.md) — one-line comments, data over branches, JSON placement, no desktop/mobile duplication.
- [`khawarizm-layout-edit`](../khawarizm-layout-edit/SKILL.md) — fixing misaligned views after a split (centering, grids, sticky offsets).
- [`khawarizm-frontend`](../khawarizm-frontend/SKILL.md) — directory placement matrix, concept classes, RTL rules.
- [`khawarizm-page-builder`](../khawarizm-page-builder/SKILL.md) — the full 10-step flow for building a new page, which produces these view splits.
- **Human-facing docs:** [`docs/02-architecture.md`](../../../docs/02-architecture.md)
