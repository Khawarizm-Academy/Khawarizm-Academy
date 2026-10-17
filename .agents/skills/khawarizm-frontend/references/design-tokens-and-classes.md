# Khawarizm Academy — Design Tokens & CSS Classes Reference

Lookup for every design token, gradient, CSS variable and concept class in `src/styles/tokens.css`, `src/styles/globals.css`, and the per-feature CSS files.

**Where a class lives:** `tokens.css` (variables) → `globals.css` (classes shared by 2+ features) → `src/features/<feature>/<feature>.css` (classes used by one feature). `globals.css` imports each feature CSS (`auth.css`, `catalog.css`, `courses.css`, `dashboard.css`, `home.css`, `profile.css`), so the app still loads **one** stylesheet — never import a feature CSS from a `.tsx`.

---

## 1. Design tokens (`tokens.css`)

`tokens.css` is the **single source of truth** for the Observatory palette. It is imported by `globals.css` right after `@import "tailwindcss"`, so its `@theme` block registers real Tailwind v4 utilities (`bg-`, `text-`, `border-`, `outline-`, `ring-`, `fill-`, `stroke-`).

> **Key decision — default-name overrides.** The `@theme` block also **overrides Tailwind's default color names** (`slate-*`, `sky-*`, `blue-900/950`, `amber-*`, `orange-*`, `emerald-*`, `red-*`) with locked brand values. Every `text-slate-400`, `bg-sky-400`, etc. already resolves to the brand palette — there is **zero** Tailwind-default leakage. Prefer semantic brand names (`navy-*`, `gold-*`, `blue-400/500`, `success-*`) for intent.

```css
@theme {
  /* Brand navy (canvases & surfaces) */
  --color-navy-950: #040f24;
  --color-navy-900: #061a3a;
  --color-navy-800: #092557;
  --color-navy-700: #123168;
  --color-navy-600: #1b3f80;

  /* Brand cyan (courses pillar / tech accent) */
  --color-blue-500: #167bdb;
  --color-blue-400: #29a9ff;

  /* Brand gold (scholarships pillar / achievement accent) */
  --color-gold-600: #c88a32;
  --color-gold-400: #e5b65c;
  --color-gold-200: #f3ce7a;

  /* Brand text neutrals */
  --color-white-000: #f5f8fc;
  --color-white-100: #dce5ee;

  /* Semantic status */
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

Non-utility CSS variables live in a `:root` block in the same file (consumed via `var(--…)` at runtime — they are **not** Tailwind utilities):

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

> **Fonts (canonical).** Display/headings: **IBM Plex Sans Arabic**; body: **Tajawal**. Those are the only two brand Arabic faces — `Cairo` has been eliminated, do not reintroduce it.
> **Icons (canonical).** Use **lucide-react** for all UI icons. Raw `<svg>` is allowed only for illustrations / `BrandVisuals` artwork and third-party brand marks (Google/Facebook logos).

---

## 2. Gradients & atmosphere

```css
.gradient-gold  { background: linear-gradient(135deg, #C88A32 0%, #E5B65C 100%); }
.gradient-tech  { background: linear-gradient(135deg, #167BDB 0%, #29A9FF 100%); }
.gradient-navy  { background: linear-gradient(180deg, #061A3A 0%, #092557 100%); }

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

## 3. Comprehensive class index

> **Cascade rule:** classes declared **unlayered** (`.btn-gold`, `.glass-panel`, …) beat Tailwind's `@layer utilities`, so JSX utilities cannot override them. New concept classes go inside `@layer components` instead — there, JSX utilities win. `@apply` accepts only real utilities: it fails on `.flex-center` and `group`.

### Layout primitives
- `.page-wrapper`: root container — `bg-[#040F24]`, `text-[#DCE5EE]`, selection styling, `overflow-x-clip`.
- `.content-container`: main content wrapper (`max-w-[1280px]`, responsive padding, flex column).
- `.flex-center`, `.flex-between`, `.flex-start`, `.flex-end`, `.flex-col-center`, `.flex-col-between`.
- `.horizontal-scroll-row`: horizontal flex swipe row with `-mx-4 px-4 overflow-x-auto` and hidden scrollbar.

> **Sticky rules (learned the hard way):**
> 1. **Never `overflow-x-hidden` on an ancestor of sticky chrome.** `hidden` on one axis computes the other to `auto`, creating a scroll container that swallows `position: sticky`. Use `overflow-x-clip`. `.page-wrapper` and `.dash-page` use `clip`.
> 2. **A sticky element only travels inside its parent.** The RootLayout navbar wrappers are `sticky top-0` themselves (parent = the tall `.page-wrapper`).
> 3. **Isolated rails** (dashboard sidebar): `sticky top-0 h-screen overflow-y-auto` — pinned to the viewport, scrolling internally if taller than the screen.

### Surfaces & cards
- `.glass-panel` (`#061A3A/40` + blur + `#1B3F80/40` border), `.glass-panel-deep` (`#040F24/90`).
- `.glass-navbar`, `.glass-mobile-header`, `.glass-mobile-bottom-bar`.
- `.card-interactive`, `.card-interactive-blue` (cyan hover glow), `.card-interactive-gold` (gold hover glow).
- `.card-media-box`, `.card-icon-box`, `.card-accent-blue` / `.card-accent-gold`.
- `.card-title`, `.card-title-lg`, `.card-subtitle`, `.card-meta-row`.

### Buttons & links
- `.btn-gold`, `.btn-outline-blue`, `.btn-pill-subtle`, `.btn-icon-box`, `.btn-icon-circle`, `.btn-search-submit`.
- `.link-action-blue` / `.link-action-gold`.

### Forms & search
- `.search-form-desktop` (64px glass pill), `.search-form-mobile` (56px), `.search-pills-container`, `.btn-search-submit`.

### Section headers & badges
- `.section-header-row`, `.section-header-title`, `.section-accent-title-blue`, `.section-accent-title-gold`.
- `.badge-gold`, `.badge-blue`, `.badge-gold-subtle`, `.tag-box`.

### Shared state & switch
- `.state-panel`, `.state-panel-icon`, `.state-panel-title`, `.state-panel-text` — the shared empty/error chamber used by `<StatePanel />`.
- `.seg-control`, `.seg-track`, `.seg-puck` (+ `-blue` / `-gold`), `.seg-option`, `.seg-option-idle`, `.seg-option-on-blue` / `.seg-option-on-gold` — the `SlidingSegmentedControl` puck (see [`khawarizm-motion`](../../khawarizm-motion/SKILL.md) §7).

### Scrollbar hiding
- `.no-scrollbar` and `[data-no-scrollbar]` → `scrollbar-width: none !important; -ms-overflow-style: none !important; ::-webkit-scrollbar { display: none !important; width: 0 !important; }`.

### Authentication (`.auth-*`, `features/auth/auth.css`)
Declared in `@layer components`. Full-screen login chamber.
- **Shells:** `.auth-shell`, `.auth-split-screen`, `.auth-chamber`, `.auth-mobile`.
- **Toast & terms:** `.auth-toast`, `.auth-toast-dot`, `.auth-terms-scrim` (`var(--color-overlay-scrim)`), `.auth-terms-panel`, `.auth-terms-title`, `.auth-terms-body`, `.auth-terms-actions`.
- **Top bar & screen toggle:** `.auth-top-bar`, `.auth-back-link`; the sign-in ⇆ register link in `LoginCard` uses `.auth-link-slot` + `.auth-link-gold`. (Legacy `.auth-mode-switch*` classes remain in the file but are unused.)
- **Card:** `.auth-card-slot`, `.auth-body`, `.auth-card` (`var(--shadow-elev-2)`), `.auth-card-head`, `.auth-card-title`, `.auth-card-subtitle`.
- **Social & divider:** `.auth-social-stack`, `.auth-social-btn`, `.auth-social-google`, `.auth-social-facebook`, `.auth-divider`, `.auth-divider-line`, `.auth-divider-label`.
- **Form:** `.auth-form`, `.auth-field`, `.auth-label`, `.auth-input-wrap` (+ `-error`), `.auth-input-icon`, `.auth-input`, `.auth-error`.
- **Links & legal:** `.auth-link-slot`, `.auth-link-gold`, `.auth-link-muted`, `.auth-legal`, `.auth-legal-text`, `.auth-legal-link`.
- **Legacy (unused after the single-card login):** `.auth-avatar*`, `.auth-user-name`, `.auth-user-badge`, `.auth-stats-bar`, `.auth-stat*` remain in `auth.css` but no component renders them.
- **Mobile header:** `.auth-mobile-brand`, `.auth-mobile-heading`, `.auth-mobile-title`, `.auth-mobile-subtitle`.
- **Hero:** `.auth-hero`, `.auth-glow-gold`, `.auth-glow-cyan`, `.auth-glow-mobile`, `.auth-brand`, `.auth-brand-name`, `.auth-brand-tag`, `.auth-orbit-stage`, `.auth-orbit-canvas`, `.auth-orbit-ring-outer` (+ `.animate-orbit-slow` in JSX), `.auth-orbit-ring-inner`, `.auth-orbit-line`, `.auth-orbit-core`, `.auth-orbit-core-glow`, `.auth-orbit-core-star`, `.auth-hero-foot`, `.auth-hero-group`, `.auth-hero-title`, `.auth-hero-text`, `.auth-trust`, `.auth-trust-text`, `.auth-hero-stats`.

### Admin console (`.admin-*`, `features/admin/admin.css`)
Declared in `@layer components`. Single responsive surface (`/admin`, `hideShell`, `requiresAdmin`).
- **Shell:** `.admin-page`, `.admin-container`, `.admin-main`, `.admin-view`, `.admin-view-section`, `.admin-topbar` (+ `.admin-topbar-mark/-head/-title/-sub/-lead/-actions`), `.admin-side` (+ `.admin-side-brand*`), `.admin-nav-item` (+ `-active` / `-idle`), `.admin-pill` (+ `-active` / `-idle`).
- **Stats:** `.admin-stat-grid`, `.admin-stat`, `.admin-stat-sky|gold|emerald|danger`, `.admin-stat-icon`, `.admin-stat-label`, `.admin-stat-value`.
- **Tables & cells:** `.admin-table`, `.admin-table-head`, `.admin-table-row` (+ `-static`), `.admin-row-open`, `.admin-cell`, `.admin-cell-label`, `.admin-cell-value`, `.admin-cell-sub`, `.admin-cell-user`, `.admin-user`, `.admin-user-avatar`, `.admin-user-text`, `.admin-user-name`, `.admin-user-email`, `.admin-mono`, `.admin-num`.
- **Toolbar & pagination:** `.admin-toolbar`, `.admin-search` (+ `.admin-search-icon/-input/-clear`), `.admin-select` (the role dropdown), `.admin-pagination`, `.admin-page-btn`, `.admin-page-info`.
- **Chart & breakdowns:** `.admin-chart`, `.admin-chart-bars`, `.admin-chart-col`, `.admin-chart-bar`, `.admin-chart-track`, `.admin-chart-count`, `.admin-chart-day`; `.admin-breakdown-grid`, `.admin-breakdown`, `.admin-breakdown-row`, `.admin-breakdown-track`, `.admin-breakdown-fill`, `.admin-breakdown-label`, `.admin-breakdown-count`, `.admin-breakdown-meta`, `.admin-breakdown-title`, `.admin-breakdown-empty`.
- **Detail, activity & badges:** `.admin-detail-*`, `.admin-feed`, `.admin-event*`, `.admin-mini-*`, `.admin-badge` (+ `-admin/-instructor/-student/-active/-inactive/-current/-login/-logout/-refresh/-rejected/-revoked`).
- **Buttons, modal & states:** `.admin-ghost-btn`, `.admin-danger-btn`, `.admin-revoke-btn`, `.admin-retry-btn`, `.admin-icon-btn`, `.admin-actions`, `.admin-mini-actions`; `.admin-modal` (+ `.admin-modal-overlay/-head/-icon/-title/-sub/-lead/-text/-body`); `.admin-notice` (+ `.admin-notice-close`), `.admin-empty` (+ `.admin-empty-icon/-title/-hint`), `.admin-detail-empty`.

### Catalog (`.catalog-*`, `features/catalog/catalog.css`)
- **Page:** `.catalog-hero`, `.catalog-hero-title`, `.catalog-hero-subtitle`, `.catalog-search-slot`, `.catalog-results`, `.catalog-results-main`, `.catalog-results-aside`.
- **Toolbar:** `.catalog-toolbar`, `.catalog-toolbar-count`, `.catalog-chip-btn` (+ `-filters` / `-sort`), `.catalog-sort-menu`, `.catalog-sort-option` (+ `-idle` / `-active`).
- **Data section:** `.catalog-data`, `.catalog-revalidation-line`, `.catalog-grid` (cards **and** skeleton), `.catalog-state`, `.catalog-state-icon`, `.catalog-state-title`, `.catalog-state-text`.
- **Card:** `.catalog-card-media`, `.catalog-card-thumb`, `.catalog-card-media-shade`, `.catalog-card-symbol` (+ `.catalog-skeleton-symbol`), `.catalog-card-badge`, `.catalog-card-body`, `.catalog-card-category`, `.catalog-card-title`, `.catalog-card-meta`, `.catalog-card-divider`, `.catalog-card-footer`.
- **Filters:** `.catalog-sidebar`, `.catalog-panel-head`, `.catalog-panel-title`, `.catalog-reset`, `.catalog-drawer`, `.catalog-drawer-scrim`, `.catalog-drawer-panel`, `.catalog-drawer-handle`, `.catalog-group-label`, `.catalog-pill`, `.catalog-pill-idle`, `.catalog-pill-gold`, `.catalog-pill-sky`, `.catalog-pill-glow-gold`, `.catalog-pill-glow-sky`.
- **Pagination:** `.catalog-pagination`, `.catalog-page-nav`, `.catalog-page` (+ `-idle` / `-active`).

### Courses (`.course-*`, `.player-*`, `.cert-*`, `features/courses/courses.css`)
Course landing, player and certificate. Declared in `@layer components`.
- **Landing:** `.course-hero-grid`, `.course-hero-main`, `.course-hero-aside`, `.course-cover` (+ `-img` / `-shade` / `-badge`), `.course-breadcrumb` (+ `-link`), `.course-title`, `.course-tagline`, `.course-meta-row`, `.course-stat` (+ `-row` / `-label` / `-value`), `.course-action-card`, `.course-action-price` (+ `-free`), `.course-info-*`, `.course-outcome-*`, `.course-accordion*`, `.course-section*`, `.course-sticky-cta`, `.course-toast`, `.course-surface-desktop` / `.course-surface-mobile`.
- **Player:** `.player-stage` (+ `-sticky`), `.player-bar` (+ `-title`), `.player-seek*`, `.player-controls-bar`, `.player-action-btn` / `.player-action-primary`, `.player-sidebar` (+ `-head`), `.player-panel` (+ `-head` / `-title`), `.player-tabs` / `.player-tab` (+ `-active` / `-idle`), `.player-lesson` (+ `-active` / `-available` / `-completed` / `-locked`) and `.player-lesson-*`, `.player-path-*`, `.player-live-card` (+ `-live` / `-past` / `-upcoming`), `.player-exam-*`, `.player-option-*`, `.player-feedback*`, `.player-drawer*`, `.player-menu*`, `.player-mini*`.
- **Certificate:** `.cert-stage`, `.cert-frame` (+ `-inner`), `.cert-burst` (+ `-core` / `-ring`), `.cert-seal`, `.cert-heading`, `.cert-subtitle`, `.cert-course`, `.cert-name`, `.cert-certifies`, `.cert-completed`, `.cert-meta`, `.cert-score`, `.cert-stats`, `.cert-stat` (+ `-label` / `-value`), `.cert-actions`, `.cert-watermark`.

### Home (`.quick-*`, `features/home/home.css`)
- `.quick-rail`, `.quick-link` (+ `-blue` / `-gold`), `.quick-link-icon` (+ `-blue` / `-gold`), `.quick-link-title`, `.quick-link-sub`, `.quick-link-text`, `.quick-link-arrow`.

### Profile (`.profile-*`, `.toggle-*`, `features/profile/profile.css`)
- **Layout:** `.profile-root`, `.profile-stack`, `.profile-columns`, `.profile-column-primary`, `.profile-column-secondary`, `.profile-block`, `.profile-wash-blue`, `.profile-wash-gold`.
- **Hero:** `.profile-hero`, `.profile-hero-row`, `.profile-hero-id`, `.profile-hero-action`, `.profile-avatar` (+ `-ring` / `-orbit` / `-initials` / `-edit`), `.profile-name` (+ `-row`), `.profile-badge`, `.profile-verified`, `.profile-meta`.
- **Cards & fields:** `.profile-card` (+ `-head` / `-icon` / `-title`), `.profile-fields-grid`, `.profile-field` (+ `-icon` / `-label-row`), `.profile-label`, `.profile-hint`, `.profile-form`, `.profile-actions`, `.profile-stat` (+ `-label` / `-value`), `.profile-interests` (+ `-head`), `.profile-interest` (+ `-on` / `-off`), `.profile-toast` (+ `-icon` / `-text`).
- **Toggle:** `.toggle-row`, `.toggle-label`, `.toggle-track` (+ `-on` / `-off`), `.toggle-knob` (+ `-on` / `-off`).

### Dashboard (`.dash-*`, `features/dashboard/dashboard.css`)
`dashboard.css` orders variant classes after their base (hero → hero-cyan/hero-red, nav-item → nav-item-active/idle, modal-icon → -red/-sky/-gold, …).

**Canvas & elevation:**
- `.dash-page` paints **no background** — the dashboard sits on the navy-950 `.page-wrapper` and the global celestial washes glow through. Never add a page-level background to a feature page.
- **Cards are lighter than the canvas:** floating surfaces are translucent glass (`bg-navy-900/70–80 + backdrop-blur-md + border-navy-600/50`); wells inside them go darker (`bg-navy-950/50`). Never flip this.
- Chrome is `.glass-navbar`-grade: `.dash-sidebar` / `.dash-topbar` use `bg-navy-950/90 + backdrop-blur-md`, both `sticky top-0`. The sidebar is an **isolated rail** (`sticky top-0 h-screen overflow-y-auto`).
- Modals, drawer, dropdowns and search panels stay **solid navy-900** for readability over the scrim.
- Accent pills are translucent, never solid: active nav = `bg-gold-400/10 outline-gold-400/50 text-gold-400`, subnav/filter pills = `bg-blue-400/15`, toggles & sort = `bg-gold-400/15 text-gold-400`.

- **Page shell:** `.dash-page`, `.dash-grid` (RTL 2-col; pair with inline `animate-fade-in-up animation-delay-100`), `.dash-grid-main`, `.dash-grid-aside`.
- **View scaffold:** `.dash-view-title`, `.dash-section-head`, `.dash-row-title`, `.dash-mobile-top-row` (+ `-title` / `-back`), `.dash-chip`, `.dash-chip-mobile` / `.dash-chip-desktop`, `.dash-chip-row`.
- **Sidebar (right / Child #1):** `.dash-sidebar`, `.dash-side-section`, `.dash-side-row`, `.dash-nav-item` (+ `-active` / `-idle`), `.dash-avatar`, `.dash-brand-mark`, `.dash-brand-name`, `.dash-user-name`, `.dash-bell` (+ `-active` / `-idle` / `-badge` / `-count`).
- **Top bar & search:** `.dash-topbar`, `.dash-topbar-search`, `.dash-search-overlay`, `.dash-search-panel`, `.dash-subnav` (mobile/tablet-only, `lg:hidden`), `.dash-tab` / `.dash-pill-active`.
- **Stats:** `.dash-greet-*`, `.dash-stat-chip-row`, `.dash-widget` (+ `-icon` / `-head` / `-title`), `.dash-stat` (+ `-value` / `-label` / `-row`), `.dash-upcoming-row`, `.dash-course-live-dot`.
- **Hero priority cards:** `.dash-hero` (+ `-cyan` / `-red`), `.dash-hero-tag` (+ `-cyan` / `-red` / `-label` / `-live`), `.dash-hero-thumb` (+ `-cyan` / `-red`), `.dash-progress` / `.dash-progress-bar` / `.dash-progress-fill`, `.dash-course-title`, `.dash-countdown-*`, `.dash-cta*`.
- **Rows & cards:** `.dash-row` (+ `-meta` / `-label` / `-value` / `-icon`), `.dash-deadline-tag`, `.dash-course-icon`, `.dash-card` (+ `-head` / `-body`), `.dash-course-card-details`, `.dash-course-score`.
- **Enrolled view:** `.dash-chip-btn` (+ `-filters` / `-sort`), `.dash-sort-menu`, `.dash-sort-option` (+ `-idle` / `-active`), `.dash-filter-pill` (+ `-idle` / `-active`), `.dash-empty-btn` (+ `-primary` / `-ghost`).
- **Empty hero:** `.dash-empty-hero`, `.dash-empty-badge`, `.dash-empty-title`, `.dash-empty-text`, `.dash-compass`.
- **Competitions & certificates:** `.dash-toggle`, `.dash-toggle-btn`, `.dash-toggle-active` / `.dash-toggle-idle`, `.dash-cert-card`, `.dash-cert-badge`, `.dash-cert-title`, `.dash-cert-cta`, `.dash-cert-cta-blue`.
- **Notifications:** `.dash-notif` (+ `-unread` / `-read`), `.dash-notif-icon` (+ `-tone-*`), `.dash-drawer-scrim`, `.dash-drawer-panel`, `.dash-drawer-head`, `.dash-drawer-item`, `.dash-toast`.
- **Modal chrome (chambers):** `.dash-modal-overlay`, `.dash-modal-shell`, `.dash-modal-head`, `.dash-modal-title`, `.dash-modal-close`, `.dash-modal-icon` (+ `-red` / `-sky` / `-gold`), `.dash-modal-divider`, plus chamber internals `.dash-stage-*`, `.dash-chat-*`, `.dash-arena-*`, `.dash-code-*`, `.dash-lead-*`, `.dash-check-*`, `.dash-editor-*`.

### Animations
- `.animate-fade-in` — generic opacity fade (modals, toasts, view swaps).
- `.animate-fade-in-up` / `.animate-fade-in-down` — entrance slides (+ `animation-delay-*` helpers).
- `.animate-page-enter` — page entrance (220ms, `--transition-page-ease`); disabled when `html[data-vt-enabled='true']`.
- `.animate-orbit-slow` / `.animate-counter-orbit-slow` — rotating rings. There is **no** `animate-spin-very-slow`.
- `.animate-shimmer`, `.animate-celestial-pulse`, `.animate-radar-ping`, `.animate-dropdown-in` / `.animate-dropdown-out`.
- **`@utility` motion** (composed with `hover:` / `group-hover:`): `animate-pop-in`, `animate-float`, `animate-float-slow`, `animate-wiggle`, `animate-bell-ring`, `animate-star-twinkle`. Full system: [`khawarizm-motion`](../../khawarizm-motion/SKILL.md).

---

## 4. Project docs

[`docs/01-design-system.md`](../../../../docs/01-design-system.md) is the human-facing twin of this reference; the skill remains canonical for agents.
