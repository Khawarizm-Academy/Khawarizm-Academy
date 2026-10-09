# Khawarizm Academy — Design Tokens & CSS Classes Reference

This reference provides a comprehensive lookup of all design tokens, gradients, CSS variables, and concept-oriented classes defined in `src/styles/tokens.css`, `src/styles/globals.css`, and the per-feature CSS files.

**Where a class lives:** `tokens.css` (variables) → `globals.css` (classes shared by 2+ features) → `src/features/<feature>/<feature>.css` (classes used by one feature, e.g. `features/auth/auth.css`). Every feature CSS is `@import`ed at the top of `globals.css`, so the app still loads one stylesheet — never import a feature CSS from a `.tsx`.

---

## 1. Design Tokens (`tokens.css`)

`tokens.css` is the **single source of truth** for the Observatory palette. It is
imported by `globals.css` after `@import "tailwindcss"`, so its `@theme` block
registers real Tailwind v4 utilities (`bg-`, `text-`, `border-`, `outline-`,
`ring-`, `fill-`, `stroke-`).

> **Key design decision — default-name overrides.** The `@theme` block also
> **overrides Tailwind's default color names** (`slate-*`, `sky-*`, `blue-900/950`,
> `amber-*`, `orange-*`, `emerald-*`, `red-*`) with locked brand values. This means
> every `text-slate-400`, `bg-sky-400`, etc. already resolves to the brand palette —
> there is **zero** Tailwind-default leakage and **no** need for a plain-CSS
> override utility layer. Use the default-name utilities directly in new work.
> Prefer semantic brand names (`navy-*`, `gold-*`, `blue-400/500`, `success-*`…) for
> intent, and the overridden defaults where a component already reads that way.

```css
@theme {
  /* Brand Navy (canvases & surfaces) */
  --color-navy-950: #040f24;
  --color-navy-900: #061a3a;
  --color-navy-800: #092557;
  --color-navy-700: #123168;
  --color-navy-600: #1b3f80;

  /* Brand Cyan (courses pillar / tech accent) */
  --color-blue-500: #167bdb;
  --color-blue-400: #29a9ff;

  /* Brand Gold (scholarships pillar / achievement accent) */
  --color-gold-600: #c88a32;
  --color-gold-400: #e5b65c;
  --color-gold-200: #f3ce7a;

  /* Brand text neutrals */
  --color-white-000: #f5f8fc;
  --color-white-100: #dce5ee;

  /* Brand semantic status */
  --color-success-500: #3fae6b;
  --color-warning-500: #e0a23b;
  --color-danger-500: #d9534f;

  /* DEFAULT-NAME OVERRIDES → locked brand values */
  --color-slate-100: #e6eef7; --color-slate-200: #c5d3e4;
  --color-slate-300: #9fb3cc; --color-slate-400: #8299b5;
  --color-slate-500: #6b84a3; --color-slate-600: #5c7291;
  --color-slate-700: #485f80; --color-slate-800: #092557;
  --color-slate-900: #061a3a; --color-slate-950: #040f24;
  --color-sky-300: #7bc9ff; --color-sky-400: #29a9ff; --color-sky-500: #167bdb;
  --color-blue-900: #1b3f80; --color-blue-950: #040f24;
  --color-amber-300: #e5b65c; --color-amber-400: #c88a32;
  --color-orange-300: #e5b65c; --color-orange-400: #f3ce7a;
  --color-emerald-300: #5fce8f; --color-emerald-400: #4abf78;
  --color-emerald-500: #3fae6b;
  --color-red-400: #e06862; --color-red-500: #d9534f;

  /* Fonts → font-display / font-body / font-mono */
  --font-display: 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif;
  --font-body: 'Tajawal', system-ui, -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Inter', monospace;
}
```

Non-utility CSS variables live in a `:root` block in the same file (consumed via
`var(--…)` in runtime CSS only — they are **not** Tailwind utilities):

```css
:root {
  --shadow-elev-1: 0 2px 8px rgba(0, 0, 0, 0.35);
  --shadow-elev-2: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-glow-gold: 0 0 24px rgba(229, 182, 92, 0.25);
  --shadow-glow-blue: 0 0 24px rgba(41, 169, 255, 0.25);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-full: 9999px;
  --color-overlay-scrim: rgba(4, 15, 36, 0.75);
  --skeleton-base: #061a3a; --skeleton-surface: #092557; --skeleton-border: #1b3f80;
  --skeleton-highlight-cyan: rgba(41, 169, 255, 0.12);
  --skeleton-highlight-gold: rgba(229, 182, 92, 0.1);
  --transition-page-duration: 220ms;
  --transition-page-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

> **Fonts (canonical, unified).** Headings/display: **IBM Plex Sans Arabic**;
> body: **Tajawal**; those are the only two brand Arabic faces. `Cairo` has been
> eliminated from every component — do not reintroduce it.

> **Icons (canonical).** Use **lucide-react** for all UI icons. Raw `<svg>` is
> permitted only for illustrations/BrandVisuals artwork and third-party brand
> marks (Google/Facebook logos).

---

## 2. Gradients & Atmosphere Classes

```css
.gradient-gold {
  background: linear-gradient(135deg, #C88A32 0%, #E5B65C 100%);
}

.gradient-tech {
  background: linear-gradient(135deg, #167BDB 0%, #29A9FF 100%);
}

.gradient-navy {
  background: linear-gradient(180deg, #061A3A 0%, #092557 100%);
}

.space-stars-bg {
  background-image: 
    radial-gradient(1.5px 1.5px at 15% 25%, rgba(229, 182, 92, 0.45) 50%, transparent),
    radial-gradient(1.5px 1.5px at 80% 18%, rgba(41, 169, 255, 0.55) 50%, transparent),
    radial-gradient(1.2px 1.2px at 35% 60%, rgba(220, 229, 238, 0.45) 50%, transparent),
    radial-gradient(1.5px 1.5px at 65% 80%, rgba(229, 182, 92, 0.4) 50%, transparent),
    radial-gradient(2px 2px at 50% 30%, rgba(41, 169, 255, 0.35) 50%, transparent);
}
```

---

## 3. Comprehensive CSS Class Index

> **Cascade rule:** classes declared **unlayered** (`.btn-gold`, `.glass-panel`, …) beat
> Tailwind's `@layer utilities`, so JSX utilities cannot override them. New concept classes
> go inside `@layer components` instead — there, JSX utilities win. `@apply` accepts only
> real utilities: it fails on `.flex-center` and `group`.

### Layout Primitives
- `.page-wrapper`: Root container with `bg-[#040F24]`, `text-[#DCE5EE]`, selection styling, and `overflow-x-clip`.
- `.content-container`: Main content wrapper (`max-w-[1280px]`, responsive padding, flex column).
- `.flex-center`, `.flex-between`, `.flex-start`, `.flex-end`, `.flex-col-center`, `.flex-col-between`.
- `.horizontal-scroll-row`: Horizontal flex swipe row with `-mx-4 px-4 overflow-x-auto` and hidden scrollbar.

> **Sticky rules (learned the hard way):**
> 1. **Never `overflow-x-hidden` on an ancestor of sticky chrome.** `hidden` on one axis computes the other axis to `auto`, creating a scroll container that swallows `position: sticky` — the sidebar/navbar scrolls away with the page. Use `overflow-x-clip` (clips the same, creates no scroll container). `.page-wrapper`, `.dash-page` and every future page shell use `clip`.
> 2. **A sticky element only travels inside its parent.** The RootLayout navbar wrappers are `sticky top-0` themselves (their parent is the tall `.page-wrapper`); the navbar inside a wrapper of its own height can never stick.
> 3. **Isolated rails** (dashboard sidebar): `sticky top-0 h-screen overflow-y-auto` — pinned to the viewport for the whole page, scrolling internally if their content is taller than the screen.

### Surfaces & Cards
- `.glass-panel`: Glassmorphic panel with `#061A3A/40`, blur, and `#1B3F80/40` border.
- `.glass-panel-deep`: Opaque glassmorphic panel (`#040F24/90`).
- `.glass-navbar`: Sticky top desktop navigation bar with bottom cyan glow line.
- `.glass-mobile-header`: Sticky mobile top header with bottom shadow.
- `.glass-mobile-bottom-bar`: Fixed mobile bottom navigation with safe-area padding.
- `.card-interactive`: Card with subtle border, 20px shadow, hover `-translate-y-1`.
- `.card-interactive-blue`: Card with hover cyan glow (`#29A9FF`).
- `.card-interactive-gold`: Card with hover gold glow (`#E5B65C`).
- `.card-media-box`: Media image container with `#092557/60` backdrop.
- `.card-icon-box`: Icon box with hover scale.
- `.card-accent-blue` / `.card-accent-gold`: Glowing 2px bottom strip.
- `.card-title`, `.card-title-lg`, `.card-subtitle`, `.card-meta-row`.

### Buttons & Links
- `.btn-gold`: Primary CTA button with gold gradient, active press scale, and drop shadow.
- `.btn-outline-blue`: Secondary CTA button with cyan outline and subtle hover fill.
- `.btn-pill-subtle`: Dark navy button with slate border.
- `.btn-icon-box`: 36x36 squircle button with border.
- `.btn-icon-circle`: 40x40 circle button with border.
- `.link-action-blue` & `.link-action-gold`: Action link with hover background and arrow.

### Forms & Search
- `.search-form-desktop`: 64px rounded pill search bar with `#061A3A/85` glass and blue focus ring.
- `.search-form-mobile`: 56px rounded pill search bar for mobile.
- `.search-pills-container`: Inner capsule holding type filter pills.
- `.btn-search-submit`: Gradient submit button with pulse effect.

### Badges & Tags
- `.badge-gold`: Gold text on `#040F24/85` pill with gold border.
- `.badge-blue`: Cyan text on `#040F24/85` pill with cyan border.
- `.badge-gold-subtle`: Soft gold badge for scholarship coverage.
- `.tag-box`: Rectangular tag with `#092557/40` fill.

### Scrollbar Hiding
- `.no-scrollbar` and `[data-no-scrollbar]`:
  - `scrollbar-width: none !important;`
  - `-ms-overflow-style: none !important;`
  - `::-webkit-scrollbar { display: none !important; width: 0 !important; }`

### Authentication (`.auth-*`, in `features/auth/auth.css`)
Full-screen login / welcome-back chamber (`features/auth/`). The feature owns
`src/features/auth/auth.css`, which `globals.css` imports. Declared in `@layer components`
so JSX utilities can override them — see §3.7 of the skill for the cascade rule.

- **Shells:** `.auth-shell` (centered full-screen), `.auth-split-screen` (desktop frame), `.auth-chamber` (form side), `.auth-mobile` (single-column side).
- **Toast & terms modal:** `.auth-toast`, `.auth-toast-dot`, `.auth-terms-scrim` (`var(--color-overlay-scrim)`), `.auth-terms-panel`, `.auth-terms-title`, `.auth-terms-body`, `.auth-terms-actions`.
- **Top bar & mode switcher:** `.auth-top-bar`, `.auth-back-link`, `.auth-mode-switch`, `.auth-mode-option`, `.auth-mode-option-login`, `.auth-mode-option-returning`.
- **Card:** `.auth-card-slot`, `.auth-body`, `.auth-card` (`var(--shadow-elev-2)`), `.auth-card-head`, `.auth-card-title`, `.auth-card-subtitle`.
- **Social buttons:** `.auth-social-stack`, `.auth-social-btn`, `.auth-social-google`, `.auth-social-facebook`.
- **Divider:** `.auth-divider`, `.auth-divider-line`, `.auth-divider-label`.
- **Form:** `.auth-form`, `.auth-field`, `.auth-label`, `.auth-input-wrap` (+ `-error`), `.auth-input-icon`, `.auth-input`, `.auth-error`.
- **Links & legal:** `.auth-link-slot`, `.auth-link-gold`, `.auth-link-muted`, `.auth-legal`, `.auth-legal-text`, `.auth-legal-link`.
- **Welcome-back stats:** `.auth-avatar`, `.auth-avatar-inner`, `.auth-avatar-img`, `.auth-avatar-fallback`, `.auth-user-name`, `.auth-user-badge`, `.auth-stats-bar`, `.auth-stat`, `.auth-stat-value`, `.auth-stat-label`, `.auth-stat-divider`.
- **Mobile header:** `.auth-mobile-brand`, `.auth-mobile-heading`, `.auth-mobile-title`, `.auth-mobile-subtitle`.
- **Hero panel:** `.auth-hero`, `.auth-glow-gold`, `.auth-glow-cyan`, `.auth-glow-mobile`, `.auth-brand`, `.auth-brand-name`, `.auth-brand-tag`, `.auth-orbit-stage`, `.auth-orbit-canvas`, `.auth-orbit-ring-outer` (add `.animate-orbit-slow` in JSX), `.auth-orbit-ring-inner`, `.auth-orbit-line`, `.auth-orbit-core`, `.auth-orbit-core-glow`, `.auth-orbit-core-star`, `.auth-hero-foot`, `.auth-hero-group`, `.auth-hero-title`, `.auth-hero-text`, `.auth-trust`, `.auth-trust-text`, `.auth-hero-stats`.

### Catalog (`.catalog-*`, in `features/catalog/catalog.css`)
Catalog explorer route (`/catalog`). Same pattern as auth: the feature owns
`src/features/catalog/catalog.css`, `globals.css` imports it, classes sit in `@layer components`.

- **Page layout:** `.catalog-hero`, `.catalog-hero-title`, `.catalog-hero-subtitle`, `.catalog-search-slot` (mobile adds `mt-3`), `.catalog-results`, `.catalog-results-main`, `.catalog-results-aside`.
- **Toolbar:** `.catalog-toolbar`, `.catalog-toolbar-count`, `.catalog-chip-btn` (+ `.catalog-chip-filters` / `.catalog-chip-sort`), `.catalog-sort-menu`, `.catalog-sort-option` (+ `-idle` / `-active`).
- **Data section:** `.catalog-data`, `.catalog-revalidation-line`, `.catalog-grid` (cards **and** skeleton), `.catalog-state`, `.catalog-state-icon`, `.catalog-state-title`, `.catalog-state-text`.
- **Result card:** `.catalog-card-media`, `.catalog-card-thumb`, `.catalog-card-media-shade`, `.catalog-card-symbol` (skeleton: `.catalog-skeleton-symbol`), `.catalog-card-badge`, `.catalog-card-body`, `.catalog-card-category`, `.catalog-card-title`, `.catalog-card-meta`, `.catalog-card-divider`, `.catalog-card-footer`.
- **Filter panels:** `.catalog-sidebar`, `.catalog-panel-head`, `.catalog-panel-title`, `.catalog-reset`, `.catalog-drawer`, `.catalog-drawer-scrim`, `.catalog-drawer-panel`, `.catalog-drawer-handle`.
- **Filter pills:** `.catalog-group-label`, `.catalog-pill`, `.catalog-pill-idle`, `.catalog-pill-gold`, `.catalog-pill-sky`, `.catalog-pill-glow-gold`, `.catalog-pill-glow-sky`.
- **Pagination:** `.catalog-pagination`, `.catalog-page-nav`, `.catalog-page` (+ `-idle` / `-active`).

### Dashboard (`.dash-*`, in `features/dashboard/dashboard.css`)
Learning workspace (`/dashboard`). Same pattern as auth/catalog: the feature owns
`src/features/dashboard/dashboard.css`, `globals.css` imports it, classes sit in `@layer components`.
`dashboard.css` orders variant classes after their base (hero → hero-cyan/hero-red,
nav-item → nav-item-active/idle, modal-icon → -red/-sky/-gold, …).

**Canvas & elevation (aligned with every other page):**
- `.dash-page` paints **no background** — the dashboard sits on the navy-950 page-wrapper and the global celestial washes glow through it. Never add a page-level background to a feature page; the shell owns the canvas.
- **Cards are lighter than the canvas:** floating surfaces are translucent glass (`bg-navy-900/70–80 + backdrop-blur-md + border-navy-600/50`), wells inside them go darker (`bg-navy-950/50`). Never flip this (dark cards on a dark page read as holes).
- Chrome is `.glass-navbar`-grade: `.dash-sidebar` / `.dash-topbar` use `bg-navy-950/90 + backdrop-blur-md`, and both are `sticky top-0`. The sidebar is an **isolated rail** — `sticky top-0 h-screen overflow-y-auto`: pinned to the viewport on every view, scrolling internally if the nav outgrows the screen (see the sticky rules under Layout Primitives).
- Modals, drawer, dropdowns and search panels stay **solid navy-900** for readability over the scrim (same idiom as `.auth-terms-panel`).
- Accent pills are translucent, never solid fills: active nav = `bg-gold-400/10 outline-gold-400/50 text-gold-400`, subnav/filter pills = `bg-blue-400/15`, toggles & sort = `bg-gold-400/15 text-gold-400` (mirrors `.catalog-pill-gold`).

- **Page shell:** `.dash-page` (`selection:` variant), `.dash-grid` (RTL 2-col; pair with inline `animate-fade-in-up animation-delay-100` — plain globals helpers stay in JSX), `.dash-grid-main`, `.dash-grid-aside`.
- **View scaffold:** `.dash-view-title`, `.dash-section-head`, `.dash-row-title`, `.dash-mobile-top-row` (+ `-title` / `-back`), `.dash-chip`, `.dash-chip-mobile` / `.dash-chip-desktop`, `.dash-chip-row` (+ `.no-scrollbar`).
- **Desktop sidebar (Right / Child #1):** `.dash-sidebar`, `.dash-side-section`, `.dash-side-row` (add `group` in JSX), `.dash-nav-item` (+ `-active` / `-idle`), `.dash-avatar`, `.dash-brand-mark`, `.dash-brand-name`, `.dash-user-name` (hover via `group-hover:*`), `.dash-notif-bell`.
- **Top bar & search:** `.dash-topbar` (sticky glass, matches `.glass-navbar`), `.dash-topbar-search`, `.dash-search-overlay`, `.dash-search-panel`, `.dash-subnav`, `.dash-tab` / `.dash-pill-active`.
- **Stats header & sidebar:** `.dash-greet-*`, `.dash-bell-*` (+ `-active` / `-idle`), `.dash-stat-chip-row`, `.dash-widget`, `.dash-widget-icon`, `.dash-widget-head`, `.dash-widget-title`, `.dash-stat/stat-value/stat-label-row`, `.dash-upcoming-row`, `.dash-course-live-dot`.
- **Hero priority cards:** `.dash-hero`, `.dash-hero-cyan`, `.dash-hero-red`, `.dash-hero-tag` (+ `-cyan` / `-red`), `.dash-hero-tag-label` (+ `-live`), `.dash-hero-thumb` (+ `-cyan` / `-red`), `.dash-progress` / `.dash-progress-bar` / `.dash-progress-fill`, `.dash-course-title`, `.dash-countdown-*` (uses `var(--color-danger)`), `.dash-cta*`.
- **Rows & cards:** `.dash-row` (+ `-meta`, `-label`, `-value`, `-icon`), `.dash-deadline-tag`, `.dash-course-icon` (+ tone records `COURSE_ICON`), `.dash-card`, `.dash-card-head`, `.dash-card-body`, `.dash-course-card-details`, `.dash-course-score`.
- **Enrolled view:** `.dash-chip-btn` (+ `-filters` / `-sort`), `.dash-sort-menu` (pair with inline `animate-fade-in-up`), `.dash-sort-option` (+ `-idle` / `-active`, `cursor-pointer`), `.dash-filter-pill` (+ `-idle` / `-active`), `.dash-empty-btn` (+ `-primary` / `-ghost`).
- **Empty hero:** `.dash-empty-hero`, `.dash-empty-badge`, `.dash-empty-title`, `.dash-empty-text`, `.dash-compass` (+ `.animate-orbit-slow` in JSX).
- **Competitions & certificates:** `.dash-toggle`, `.dash-toggle-btn`, `.dash-toggle-active` / `.dash-toggle-idle`, `.dash-cert-card`, `.dash-cert-badge`, `.dash-cert-title`, `.dash-cert-cta`, `.dash-cert-cta-blue`.
- **Notifications:** `.dash-notif` (add `group` in JSX; + `-unread` / `-read`), `.dash-notif-icon` (+ `-tone-*`), `.dash-drawer-scrim`, `.dash-drawer-panel`, `.dash-drawer-head`, `.dash-drawer-item`, `.dash-toast`.
- **Modal chrome (chambers):** `.dash-modal-overlay`, `.dash-modal-shell` (built on `workspace-card`), `.dash-modal-head`, `.dash-modal-title`, `.dash-modal-close`, `.dash-modal-icon` (+ `-red` / `-sky` / `-gold`), `.dash-modal-divider`, plus chamber internals: `.dash-stage-*`, `.dash-chat-*`, `.dash-arena-*`, `.dash-code-*`, `.dash-lead-*`, `.dash-check-*`, `.dash-editor-*`.

### Animations
- `.animate-fade-in` — generic opacity fade (modals, toasts, view swaps). **Was used in 15+ files while undefined; now defined in `globals.css`.**
- `.animate-fade-in-up` / `.animate-fade-in-down` — entrance slides (+ `animation-delay-*` helpers).
- `.animate-page-enter` — page-level entrance (220ms, `--transition-page-ease`).
- `.animate-orbit-slow` / `.animate-counter-orbit-slow` — rotating rings (`AstrolabeLoader`, brand seal, hero orbit). There is **no** `animate-spin-very-slow`.
- `.animate-shimmer`, `.animate-celestial-pulse`, `.animate-radar-ping`, `.animate-dropdown-in` / `.animate-dropdown-out` — skeletons, pulses, dropdowns.
