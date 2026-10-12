# 01 · Design System

The Khawarizm Academy design system is called **Observatory & Cyber-Intelligence** (المرصد الفلكي الذكي). It is a dark, glassy, space-themed system with a strict two-accent grammar. This document is the reference for the palette, typography, elevation, tokens, layout primitives, and the concept-class vocabulary.

> **Where the system lives:** tokens are in `frontend/src/styles/tokens.css`; shared concept classes and keyframes are in `frontend/src/styles/globals.css`; feature-scoped classes live in `frontend/src/features/<feature>/<feature>.css`. There is exactly **one stylesheet entry point** — `src/index.css` → `globals.css` → every feature CSS.

---

## 1. Color

All colors are Tailwind v4 `@theme` tokens, so each one registers real utilities (`bg-*`, `text-*`, `border-*`, `outline-*`, `ring-*`, `fill-*`, `stroke-*`).

### 1.1 Brand palette

| Token | Hex | Role |
| :--- | :--- | :--- |
| `navy-950` | `#040F24` | **Canvas.** The deep-space void behind every page. |
| `navy-900` | `#061A3A` | Raised surface / glass base. |
| `navy-800` | `#092557` | Elevated panel / inset well. |
| `navy-700` | `#123168` | Border-strong / hover surface. |
| `navy-600` | `#1B3F80` | Hairline borders and dividers. |
| `blue-500` | `#167BDB` | Courses pillar — deep cyan. |
| `blue-400` | `#29A9FF` | Courses pillar — bright cyan (the primary interactive accent). |
| `gold-600` | `#C88A32` | Scholarships pillar — deep brass. |
| `gold-400` | `#E5B65C` | Scholarships pillar — bright brass (achievement accent). |
| `gold-200` | `#F3CE7A` | Highlight / hover brass. |
| `white-000` | `#F5F8FC` | Primary text and bright elements. |
| `white-100` | `#DCE5EE` | Default body text. |
| `success-500` | `#3FAE6B` | Success states. |
| `warning-500` | `#E0A23B` | Warnings / deadlines soon. |
| `danger-500` | `#D9534F` | Errors / destructive / live. |

### 1.2 Locked Tailwind overrides

Several Tailwind default color families are **deliberately overridden** so that every class string in the codebase resolves to a brand color — there is no Tailwind-default leakage anywhere in the app.

| Family | Locked meaning | Source |
| :--- | :--- | :--- |
| `slate-*` | Muted navy-neutral text scale | `#8299B5` |
| `sky-*` | Brand cyan accent | `blue-400/500` |
| `blue-900` / `blue-950` | Navy border / deep surface | `navy-600` / `navy-950` |
| `amber-*` | Brand gold (badges) | `gold-400/600` |
| `orange-*` | Brand gold (CTA) | `gold-400/200` |
| `emerald-*` | Brand success | `success-500` |
| `red-*` | Brand danger | `danger-500` |

**Rule:** never use a raw hex or an arbitrary Tailwind color. Use a token utility; if a token is missing, add it to `tokens.css` (and mirror it in the design sheet) rather than inlining hex.

### 1.3 Non-utility variables (`:root`)

Some values are consumed only from CSS (never as a utility class):

```css
--shadow-elev-1: 0 2px 8px rgba(0,0,0,.35);      /* resting card */
--shadow-elev-2: 0 8px 24px rgba(0,0,0,.45);     /* raised panel / modal */
--shadow-glow-gold: 0 0 24px rgba(229,182,92,.25);
--shadow-glow-blue: 0 0 24px rgba(41,169,255,.25);
--radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 20px;  --radius-full: 9999px;
--color-overlay-scrim: rgba(4,15,36,.75);        /* modal & drawer backdrops */
--skeleton-base: #061A3A;  --skeleton-surface: #092557;  --skeleton-border: #1B3F80;
--skeleton-highlight-cyan: rgba(41,169,255,.12);
--skeleton-highlight-gold: rgba(229,182,92,.10);
--transition-page-duration: 220ms;
--transition-page-ease: cubic-bezier(0.16, 1, 0.3, 1);
```

Use these via `var(--…)`; a raw `shadow-[0_8px_24px_rgba(0,0,0,0.35)]` is a token waiting to happen.

---

## 2. Typography

| Token | Family | Use |
| :--- | :--- | :--- |
| `font-display` | **IBM Plex Sans Arabic** | Headings, titles, brand. |
| `font-body` | **Tajawal** | Body copy, labels, UI text (the `body` default). |
| `font-mono` | **IBM Plex Mono** → Inter | Numbers, timers, code, serials. |

Fonts are loaded in `frontend/index.html` and bound to Tailwind's `font-display` / `font-body` / `font-mono`. **Never** write `font-['IBM_Plex_Sans_Arabic']` — use the semantic utility.

Guidelines:
- Headings are `font-display` and `text-white`; body is `font-body` and `text-slate-400` (or `white-100`).
- Numeric displays (countdowns, stats, certificates) use `font-mono tabular-nums`.
- Arabic text never gets a `letter-spacing` utility.

---

## 3. Elevation & surfaces

Elevation moves **lighter** as a surface rises, not darker. Dark cards on the void read as holes.

| Layer | Recipe | Class |
| :--- | :--- | :--- |
| Canvas | `navy-950` + celestial washes | `.page-wrapper` |
| Glass panel | `navy-900/40` + `backdrop-blur-md` + `navy-600/40` border | `.glass-panel`, `.glass-panel-deep` |
| Chrome (nav/footer) | `navy-950/90` + blur + navy borders | `.glass-navbar`, `.glass-mobile-header`, `.glass-mobile-bottom-bar` |
| Interactive card | glass shell + accent border + hover lift | `.card-interactive-blue`, `.card-interactive-gold`, `.card-interactive` |
| Inset well | `navy-950/50` — only *inside* a raised surface | utility |
| Over a scrim | **solid** `navy-900` (readability beats ambience) | modals, drawers, menus |

Active accents are **translucent, never solid fills**: gold for achievements (`bg-gold-400/10 outline-gold-400/50 text-gold-400`), cyan for the courses domain (`bg-blue-400/15`).

The four `box-shadow` variables are applied through concept classes, not littered in JSX.

---

## 4. Layout primitives

| Class | Purpose |
| :--- | :--- |
| `.page-wrapper` | The only legitimate page background — navy-950 with the global celestial washes. Never paint a page-level background. |
| `.content-container` | Centered, max-width, horizontal padding for page content. Used as `<main>` on every standard page. |
| `.horizontal-scroll-row` | Touch-friendly horizontal swipe row (`.no-scrollbar`, momentum scrolling). |
| `.no-scrollbar` | Hides the native scrollbar on chip rails and card carousels. |

**The custom scrollbar** (in `globals.css`) is part of the design: 7px width, `navy-950` track, `navy-600` pill thumb, `blue-400` hover, with Firefox `scrollbar-color` support. Unstyled OS scrollbars are never allowed on desktop.

---

## 5. Concept classes — the vocabulary

A **concept class** is a short, semantic name for a styling decision. If the same run of utilities appears twice for the same kind of element, that is a missing concept class, not styling. Extract it into the owning CSS file and use the short name in JSX.

**Where it goes — same rule as components:**
- Used by **one feature** → `frontend/src/features/<feature>/<feature>.css`.
- Used by **2+ features** → `frontend/src/styles/globals.css`.

Feature CSS files are imported once at the top of `globals.css`; a `.tsx` never imports a `.css`.

### 5.1 Buttons & actions (shared)

| Class | Meaning |
| :--- | :--- |
| `.btn-gold` | Primary action (one per screen/section). Brass fill, shine sweep on hover. |
| `.btn-outline-blue` | Secondary cyan outline action. |
| `.btn-pill-subtle` | Idle filter chip / selector pill. |
| `.btn-icon-box` | 36×36 squircle icon action (save, bookmark). |
| `.btn-icon-circle` | 40×40 circular icon action (share, profile). |
| `.btn-search-submit` | Search field submit button. |
| `.link-action` / `.link-action-blue` / `.link-action-gold` | Text action links (`عرض الكل ←`). |
| `.btn-attention` | Golden attention halo — **at most one per screen**. |

### 5.2 Cards (shared)

| Class | Meaning |
| :--- | :--- |
| `.card-interactive` | Neutral interactive card shell. |
| `.card-interactive-blue` | Courses-domain card shell. |
| `.card-interactive-gold` | Scholarships-domain card shell. |
| `.card-media-box` | Media/thumbnail frame inside a card. |
| `.card-icon-box` | Icon plate inside a card. |
| `.card-title` / `.card-title-lg` / `.card-subtitle` | Card text roles. |
| `.card-meta-row` | Footer meta row (duration, students, deadline). |
| `.card-accent-blue` / `.card-accent-gold` / `.card-top-bar-gold` | Accent edges. |
| `.card-status-*` / `.card-coverage` | Status capsules and coverage badges. |
| `.rail-card-size` | Fixed width for horizontal rail cards. |

### 5.3 Sections, badges & glow

| Class | Meaning |
| :--- | :--- |
| `.section-header-row`, `.section-header-title` | Section header composition. |
| `.section-accent-title-blue` / `-gold` | Accent bar + title. |
| `.badge-pill`, `.badge-blue`, `.badge-gold`, `.badge-gold-subtle`, `.tag-box` | Pills, badges, tags. |
| `.elev-glow-gold` / `.elev-glow-blue` | Element-level accent glow. |
| `.space-stars-bg` | Static starfield texture. |
| `.gradient-gold` / `.gradient-tech` / `.gradient-navy` | Brand gradients. |

### 5.4 Search, segmented switch & countdown (shared)

| Class | Meaning |
| :--- | :--- |
| `.search-form-desktop` / `.search-form-mobile` / `.search-pills-container` | Search shells per surface. |
| `.search-swell`, `.search-switcher-mobile`, `.search-puck*`, `.search-type-*`, `.search-input-*` | Smart search type switcher. |
| `.seg-control`, `.seg-track`, `.seg-puck(-blue/-gold)`, `.seg-option(-idle)/(on-blue/on-gold)` | The sliding segmented control styling. |
| `.digit-box`, `.digit-box-active`, `.digit-box-mobile*`, `.digit-text`, `.digit-label`, `.count-*` | Countdown chambers and digits. |
| `.sliding-chamber-indicator` | The sliding indicator used by the search switcher. |

### 5.5 Chrome & states (shared)

`app-shell`: `.app-atmosphere`, `.app-wash`, `.shell-chrome`, `.shell-footer`, `.shell-bottom-bar`.
`navigation`: `.nav-*`, `.mh-*` (mobile header), `.bb-*` (bottom bar).
`footer`: `.app-footer`, `.footer-*`.
`states`: `.state-panel*` (empty/error panels).
`artwork`: `.art-logo-row`, `.art-seal*`, `.art-brand-text`, `.art-shell*`, `.art-event-*`, `.art-dotgrid`, `.art-tag*`, `.art-code*`, `.art-tech-chip`, `.art-candle-glow`.
`forms`: `.input-field`, `.dropdown-*`.
`placeholders/404`: `.placeholder-*`, `.emblem-*`.
`loading`: `.loader-*`, `.skeleton-*`, `.skeleton-page/rail/media-well/card-body/meta/sidebar`.

### 5.6 Feature-scoped class families

Each feature owns its prefix; the full list lives in the feature README.

| Feature CSS | Prefixes |
| :--- | :--- |
| `features/auth/auth.css` | `auth-*`, `brand-seal*`, `toggle-*` |
| `features/catalog/catalog.css` | `catalog-*` |
| `features/courses/courses.css` | `course-*`, `player-*` |
| `features/dashboard/dashboard.css` | `dash-*` |
| `features/home/home.css` | `quick-*` |
| `features/profile/profile.css` | `profile-*`, `toggle-*` |

### 5.7 Authoring rules for concept classes

1. Declare them in `@layer components` so a utility in JSX can still override them. Only the legacy shared classes (`.btn-gold`, `.link-action-blue`) are intentionally unlayered.
2. Use token variables (`var(--shadow-elev-2)`) inside the class — never literals.
3. `@apply` accepts **real Tailwind utilities only**. It fails on plain custom classes (`.flex-center`), marker classes (`group`), and plain global helpers (`animate-fade-in`, `animate-fade-in-up`, `animation-delay-100`). Keep `group` in the JSX, and mirror an animation with a raw `animation:` property when the class itself must animate.
4. **Check that the class exists.** A typo renders nothing — a dead `animate-spin-very-slow` shipped once; the correct class is `animate-orbit-slow`.

---

## 6. Motion

The full motion system is documented in [04 · Loading, Caching & Motion](04-loading-caching-and-motion.md). Summary of the primitives that live in `globals.css`:

| Keyframe | Utility | Purpose |
| :--- | :--- | :--- |
| `pop-in` | `.animate-pop-in` | Springy entrance (scale 0.6 → 1.06 → 1 + rise). |
| `fadeIn` / `fadeInUp` / `fadeInDown` | `.animate-fade-in`, `.animate-fade-in-up`, `.animate-fade-in-down` | Fade drifts for sections and modals. |
| `float-y` | `.animate-float`, `.animate-float-slow` | Ambient bobbing (emblems). |
| `wiggle` / `bell-ring` / `star-twinkle` | `.animate-wiggle`, `.animate-bell-ring`, `.animate-star-twinkle` | Playful icon micro-interactions. |
| `orbit-slow` / `counter-orbit-slow` | `.animate-orbit-slow`, `.animate-counter-orbit-slow` | 60s / 45s orbiting rings. |
| `shimmer-sweep`, `celestial-pulse`, `radar-ping`, `shine-sweep`, `cta-halo`, `skeleton-celestial-shimmer`, `pageEnter` | various | Shimmer, pulse, ping, shine/halo, skeleton, page entrance. |

All motion is **transform/opacity only** (GPU-cheap), and the global `prefers-reduced-motion: reduce` block flattens everything — you never write your own reduced-motion handling.

---

## 7. RTL rules

The document is `dir="rtl"`, so:

- **Start edge = right, end edge = left.** Use logical properties/utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`), never `left`/`right` for layout.
- **In a horizontal flex container, child #1 renders on the far right.** A right-hand sidebar must be the first child in the DOM.
- **Form inputs:** the leading icon is the first child (renders right), the input second, and the input uses `text-right` + `dir="auto"` so Arabic and Latin text both behave.
- **Directional arrows** point with the reading flow: `←` for "next / proceed", `→` for "back / return".

---

## 8. Icons

- Icons come from **`lucide-react`** only — no emojis, no ad-hoc SVGs, no Unicode symbols for UI.
- Consistent stroke width (`1.8`–`2.2`) and size.
- Semantic mapping: `Home`/`LayoutDashboard` (dashboard), `BookOpen` (courses), `GraduationCap`/`Award` (scholarships), `Bookmark` (saved), `Trophy` (competitions), `Bell` (notifications), `Search`, `Radio`/`Play`/`Pause`, `CheckCircle2`/`X`.
- JSON configs store an icon **name** (a string); `resolveIcon()` in `@/shared/lib/navigation` hydrates it to the component and throws on an unknown name.

---

## 9. Design checklist

- [ ] Every color, font, radius, shadow, and scrim comes from a token.
- [ ] No page paints its own background — the canvas is `.page-wrapper`.
- [ ] Cards are lighter than the canvas; inset wells only sit inside raised surfaces.
- [ ] Active accents are translucent, not solid fills.
- [ ] Any utility run typed twice became a concept class in the owning CSS file.
- [ ] New classes are declared in `@layer components`; `@apply` uses real utilities only.
- [ ] Both pillars keep their accent (cyan = courses, gold = scholarships) without swapping.
- [ ] One `btn-gold` primary action and at most one `.btn-attention` halo per screen.
- [ ] Layout is logical-property based and correct in RTL.
