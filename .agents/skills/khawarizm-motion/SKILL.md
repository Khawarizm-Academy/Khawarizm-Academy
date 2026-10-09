---
name: khawarizm-motion
description: The Celestial Motion System — every shared animation, micro-interaction, and motion utility in Khawarizm Academy. Use whenever adding, editing, or debugging animations, hover effects, entrance cascades, sliding-puck switches, shine sweeps, attention halos, or countdowns on any page, card, button, or tab. Covers the keyframe primitives, @utility classes, staggered cascades, the SlidingSegmentedControl, and their exact caveats so motion always matches the rest of the platform.
---

# Khawarizm Academy — Celestial Motion System

This skill is the **single source of truth for motion** in Khawarizm Academy. Every animated element across the app must come from this system — the same primitives, the same utilities, the same caveats — so a new page's motion is indistinguishable from a hand-polished one.

---

## 1. Where Motion Lives

- All keyframes and motion utilities live in **`frontend/src/styles/globals.css`** in the "Celestial Motion System" section (≈ line 610).
- Motions are declared as Tailwind v4 **`@utility`** classes so variants (`hover:`, `group-hover:`) compose.
- Feature CSS files (`features/<feature>/<feature>.css`) never define their own keyframes for shared motion — they **mirror** a global utility with a raw `animation:` property only when the JSX cannot carry the utility (e.g. the class itself must animate, like `.dash-empty-compass` → `animation: float-y 6s ...`, `.profile-avatar-orbit` → `animation: orbit-slow 60s ...`).
- The global `prefers-reduced-motion: reduce` block at the bottom of `globals.css` flattens every animation — you do not add your own reduced-motion handling.

**Rule: every motion is transform and/or opacity only (GPU-cheap). Never animate `width`, `height`, `top`, `margin`, or `gap` except the established width transitions (`.dash-sidebar-rail`, `.dash-nav-label`).**

---

## 2. The Primitives (Keyframes → Utility)

| Keyframe | Utility | Purpose |
| :--- | :--- | :--- |
| `pop-in` | `animate-pop-in` | Springy entrance: scale 0.6→1.06→1 + rise. Cards, rows, badges, modal panels. |
| `float-y` | `animate-float` / `animate-float-slow` | Gentle ambient bobbing (decorative emblems, empty-state compass). `-slow` = 8s. |
| `wiggle` | `animate-wiggle` | One-shot playful jiggle for icons (rotate ±10°). |
| `bell-ring` | `animate-bell-ring` | Notification bell swing; pivot at top center (`.dash-bell:hover > svg` uses it too). |
| `star-twinkle` | `animate-star-twinkle` | Twinkling dot: opacity 0.25→1 + scale. |
| `shine-sweep` | *(used by `::after` rules)* | Light beam that crosses a CTA on hover (±260% skew). |
| `fadeInUp`/`fadeInDown` | `animate-fade-in-up` / `animate-fade-in-down` | Section/page entrance drifts. |
| `orbit-slow` / `counter-orbit-slow` | `animate-orbit-slow` / `animate-counter-orbit-slow` | 60s / 45s orbiting rings over avatars & emblems. |

**`@apply` cannot consume these helpers** (they are plain global classes / `@utility`, and `@apply` accepts real Tailwind utilities only). Put them in the JSX `className`, or mirror them with a raw `animation:` line inside a feature CSS class.

---

## 3. Staggered Entrance Cascades

Lists and card grids enter as a cascade with an inline `animationDelay` (60–100ms step), keeping the delay on the element that carries `animate-pop-in`:

```tsx
<div className="dash-row animate-pop-in" style={{ animationDelay: `${index * 70}ms` }}>
```

- Use `index * 70` for rows/cards, `* 60` for tighter lists, `* 90`–`* 100` for large cards.
- Section-level entrances already use `animate-fade-in-up animation-delay-100` — don't stack more motion on top.
- `SettingsCard`s stagger via an `index` prop: `style={{ animationDelay: `${index * 90}ms` }}`.

---

## 4. The Fill-Mode Caveat (critical)

`animate-pop-in` / `animate-fade-in-*` use `animation-fill-mode: both`, so the **finished animation leaves a `transform` on the element**. Consequences:

1. **Hover/active transforms on the same element are dead** — `class="card animate-pop-in hover:scale-105"` will not scale.
2. **A filled `transform` also blocks `position: fixed` descendants** (it creates a containing block). The `.page-transition-wrapper` already carries one under non-View-Transition browsers — that is why the dashboard sidebar is `sticky`, never `fixed`.

**Workarounds (already used across the app):**
- Put the hover transform on a **child** element (`.dash-chip-badge` scales via `group-hover:scale-110`). Keep `group` in the JSX.
- Or animate **non-transform** props on the animated element itself: outline color, box-shadow, brightness, letter color (`.dash-row` hover uses `border` + `transition-all`).

---

## 5. Hover Micro-Interactions (the standard set)

| Interaction | Pattern |
| :--- | :--- |
| Icon lift + tint | `group`/parent `:hover` rule targets the icon child: `@apply text-blue-400 -translate-y-0.5 scale-110` with `transition-all` on the icon (see `.dash-topbar-tab`, `.dash-nav-item-idle`). |
| Icon tilt | `@apply rotate-12 scale-110` on hover (see `.dash-topbar-search-glyph`). |
| Press feedback | `active:scale-95` on every clickable button/pill. |
| Card raise | `hover:border-sky-400/40 hover:brightness-110` + shadow lift — never scale the card itself if it carries an entrance animation. |
| Bell swing | `.dash-bell:hover > svg { transform-origin: top center; animation: bell-ring ...; }` |
| Shine sweep | `::after` beam (below) — gold and blue CTAs only. |

---

## 6. CTA Motion: Shine Sweep + Attention Halo

**Gold CTA shine** (`.btn-gold`, defined in `globals.css`):
- The button is `position: relative; overflow: hidden`.
- A `::after` beam is parked off-canvas (`translateX(-260%) skewX(-20deg)`) and runs `shine-sweep 0.7s ease` on `:hover`.

**Blue primary CTAs** share the same beam via a combined rule in `features/dashboard/dashboard.css`:
```css
.dash-cta-blue::after,
.dash-course-action-active::after { /* beam, parked */ }
.dash-cta-blue:hover::after,
.dash-course-action-active:hover::after { animation: shine-sweep 0.7s ease; }
```
Any primary **blue gradient** action (`from-blue-400 to-blue-500 text-white`) joining this family must also declare `relative overflow-hidden` and join the `::after` selector list.

**Attention halo** (`.btn-attention` + `cta-halo` keyframes, `globals.css`):
- Animated `box-shadow` golden pulse — **not** a scaled ring, because `.btn-gold` clips overflow.
- Rule: exactly **one** hero CTA per screen gets it (challenge "دخول التحدي", profile "حفظ التغييرات"). Never sprinkle it across a page or the effect dies.

---

## 7. Sliding-Switch Motion (apply the home-search puck everywhere)

`SlidingSegmentedControl` (`src/shared/components/Controls/SlidingSegmentedControl.tsx`) is **the** shared side-by-side switch — the same spring-glide puck as the home SmartSearchBar.

- API: `options={[{ id, label }]} value={id} onChange={fn} tone="blue" | "gold"`, optional `className`, `aria-label`.
- Positioning is RTL-safe: the `.seg-puck` sits inside an absolute `.seg-track` and translates `translateX(-${activeIndex * 100}%)`; the puck slides with a **400ms overshoot spring** (`ease-[cubic-bezier(0.34,1.56,0.64,1)]`).
- **Use it for every side-by-side toggle**: dashboard sub-navigation (`DashboardSubNavigation`), enrolled-courses filters, saved-scholarships tabs, competitions filter, profile learning level. Do not hand-roll a different switch.
- `.seg-*` styling lives in `globals.css` (§ "Sliding Segmented Control"): `.seg-control` (track shell), `.seg-track`, `.seg-puck[-blue|-gold]` (active highlight, translucent tint + outline — never solid fills), `.seg-option`, `.seg-option-idle`, `.seg-option-on-blue|gold` (bold + glow drop-shadow).

---

## 8. Countdown Motion

- `useCountdown` (`src/shared/hooks/useCountdown.ts`) + `CountdownDigits` (`src/shared/components/Banners/CountdownDigits.tsx`) render the live challenge deadline (used by `ChallengeSpotlightCard` and the home competition banner).
- Countdown chambers: `.dash-countdown` / `.dash-countdown-time` (dashboard) — `font-mono tracking-widest`, inset navy well inside the raised card.

---

## 9. Motion Checklist

- [ ] Motion is transform/opacity only; no width/height animation unless it is an established expanded-rail/label reveal.
- [ ] Entrance uses `animate-pop-in` + staggered `animationDelay`; no manual keyframes in feature CSS unless mirroring a global primitive.
- [ ] The fill-mode caveat respected: hover/active transforms live on children; no `fixed` descendants under an animated element.
- [ ] Every side-by-side toggle is a `SlidingSegmentedControl`, not a bespoke switcher.
- [ ] At most one `btn-attention` halo per screen; shine sweeps only on primary gold/blue CTAs.
- [ ] No new keyframes in feature CSS for shared motion; prefer extending `globals.css` (2+ features) or mirroring raw `animation:` with the global keyframe.
- [ ] `prefers-reduced-motion` left to the global media query — nothing extra.