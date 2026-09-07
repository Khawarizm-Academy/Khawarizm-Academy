# Khawarizm Academy — Design System

> Read this before any other file. Every screen spec and every Stitch prompt in this project references these tokens by name. If you change a value here, it should ripple everywhere — treat this like a CSS variables file in prose form.

---

## 1. Design principles (the "why" behind every rule below)

1. **Observatory, not dashboard.** The mood is a quiet study session under a night sky — deep navy space, gold light like candlelight on old manuscripts, subtle star/circuit texture. Not a flat corporate SaaS dashboard.
2. **One accent, used with intent.** Gold is precious — it marks the *one* primary action on a screen, key numbers (deadlines, scores, prices), and moments of achievement. If everything is gold, nothing is.
3. **Confidence through restraint.** Codecademy and Scrimba don't over-decorate their UI chrome — the content (code, courses, progress) is the hero. Khawarizm's ornamental elements (geometric line-art, star motifs) live in *backgrounds and empty states*, never inside dense functional UI like tables or forms.
4. **Arabic typography is a first-class citizen**, not a translated afterthought. Line-height, letter tracking, and font choice are tuned for Arabic script quality, not inherited from a Latin default.
5. **Two pillars, one grammar.** Courses and Scholarships use the exact same component grammar (cards, badges, detail-page anatomy) so switching between them feels like the same product, not two bolted-together apps.

---

## 2. Color system

### 2.1 Source palette (from brand sheet — kept as-is, these are locked brand colors)

| Token | Hex | Role |
|---|---|---|
| `navy-900` (Primary Navy) | `#061A3A` | Deepest background |
| `navy-800` (Deep Blue) | `#092557` | Secondary background / cards |
| `blue-500` (Tech Blue) | `#167BDB` | Interactive/tech accent |
| `blue-400` (Electric Blue) | `#29A9FF` | Highlights, links, focus glow |
| `gold-600` (Primary Gold) | `#C88A32` | Primary accent (deep) |
| `gold-400` (Light Gold) | `#E5B65C` | Primary accent (light) |
| `slate-400` (Muted Blue) | `#8299B5` | Secondary text on dark |
| `white-100` (Off White) | `#DCE5EE` | Primary text on dark |

### 2.2 Extended functional tokens (derived — new, for UI completeness)

The brand sheet gives us mood colors, not a full UI system. These are added, staying inside the same family:

| Token | Hex | Role |
|---|---|---|
| `navy-950` | `#040F24` | True page background (below navy-900), used behind modals/overlays |
| `navy-700` | `#123168` | Elevated card surface (one step up from navy-800) — hover/active card states |
| `navy-600` | `#1B3F80` | Borders/dividers on dark surfaces |
| `white-000` | `#F5F8FC` | Rare pure-light surface (e.g. inside a light-mode exam paper view, printable certificate) |
| `slate-600` | `#5C7291` | Disabled text / placeholder text |
| `success-500` | `#3FAE6B` | Correct answers, "open now," passed status — chosen to sit near tech-blue in saturation so it doesn't clash |
| `warning-500` | `#E0A23B` | Deadlines approaching, "closes soon" — deliberately close to gold-600 but desaturated so it doesn't compete with primary gold CTAs |
| `danger-500` | `#D9534F` | Errors, wrong answers, "closed," destructive actions |
| `overlay-scrim` | `rgba(4,15,36,0.72)` | Modal/drawer backdrop, built from navy-950 |

**Rule:** never introduce a new hue family (no purple, no teal-as-accent, no pink). If a new semantic color is ever needed, derive it by adjusting saturation/lightness of an existing token, the way `warning-500` was derived near `gold-600`.

### 2.3 Gradients (from brand sheet, plus one derived)

| Name | Stops | Use |
|---|---|---|
| `gradient-navy` | `#061A3A → #092557` | Page hero backgrounds, section dividers |
| `gradient-tech` | `#167BDB → #29A9FF` | "Courses" pillar accent backgrounds, tech/course-related badges |
| `gradient-gold` | `#C88A32 → #E5B65C` | Primary CTA buttons, "Scholarships" pillar accent backgrounds, achievement/certificate moments |
| `gradient-radial-glow` *(new)* | radial `#29A9FF` at 15% opacity → transparent | Subtle "star glow" behind icons, used sparingly in empty states and the smart-search box focus state |

**Pillar color-coding (important, used throughout):**
- **Courses pillar** → tech gradient (blue family) as its identifying accent.
- **Scholarships pillar** → gold gradient as its identifying accent.
- This lets users build a spatial/color memory ("blue = learn, gold = opportunity") without needing icons or labels once they're used to the platform — while both still use identical card geometry (pillar parity is about *layout weight*, not about forbidding a distinguishing accent).

### 2.4 Usage matrix

| Context | Background | Text | Accent |
|---|---|---|---|
| Page background | `navy-950` | — | — |
| Primary surface (nav, hero) | `navy-900` | `white-100` | `gold-400` |
| Card / secondary surface | `navy-800` | `white-100` headline, `slate-400` body | pillar-dependent |
| Elevated / hovered card | `navy-700` | `white-100` | brighter accent |
| Primary button | `gradient-gold` | `navy-950` (dark text ON gold, for contrast) | — |
| Secondary button | transparent, `1px` `blue-400` border | `blue-400` | — |
| Tertiary / ghost button | transparent | `white-100` | underline on hover |
| Disabled state | `navy-800` at 50% opacity | `slate-600` | none |
| Success badge | `success-500` at 15% bg tint | `success-500` | — |
| Warning badge (deadline) | `warning-500` at 15% bg tint | `warning-500` | — |
| Danger / wrong answer | `danger-500` at 15% bg tint | `danger-500` | — |

**Contrast check:** `white-100` (#DCE5EE) on `navy-900` (#061A3A) ≈ 13.9:1 — passes AAA. `slate-400` (#8299B5) on `navy-800` (#092557) ≈ 4.6:1 — passes AA for normal text. Navy text on `gold-400` buttons ≈ 8.2:1 — passes AAA. Always verify new combinations against these two backgrounds before shipping.

---

## 3. Typography

### 3.1 Typefaces

| Role | Arabic typeface | Latin/numeral fallback | Notes |
|---|---|---|---|
| Display / headlines | **IBM Plex Sans Arabic** (Bold/SemiBold) or **Cairo** (Bold) | IBM Plex Sans | Geometric, modern, reads as "tech" not "government form" — matches the Codecademy/Scrimba confidence |
| Body text | **IBM Plex Sans Arabic** (Regular/Medium) or **Tajawal** | IBM Plex Sans | Optimized for long reading (lesson descriptions, scholarship criteria) |
| Numerals / stats / countdowns | **Latin numerals (0-9)**, not Eastern Arabic-Indic, set in a monospaced or tabular-figure style (e.g. IBM Plex Mono for countdowns) | — | Deadlines, scores, and prices need to be scannable at a glance; tabular figures prevent countdown timers from "jumping" in width |
| Code snippets (coding competitions) | — | **IBM Plex Mono** or **JetBrains Mono** | Ligatures off, tabular figures on |

*(If Cairo/Tajawal/IBM Plex Arabic licensing is a concern for Stitch's font picker, both Cairo and Tajawal are open-source Google Fonts and are safe defaults to name directly in prompts.)*

### 3.2 Type scale (mobile base → desktop)

| Token | Mobile | Desktop | Weight | Use |
|---|---|---|---|---|
| `display-xl` | 32px / 1.3 | 56px / 1.2 | Bold (700) | Homepage hero headline only |
| `display-lg` | 26px / 1.3 | 40px / 1.25 | Bold (700) | Page titles (Course landing, Scholarship detail) |
| `heading-lg` | 22px / 1.35 | 28px / 1.3 | SemiBold (600) | Section titles ("الدورات المميزة") |
| `heading-md` | 18px / 1.4 | 22px / 1.35 | SemiBold (600) | Card titles, modal titles |
| `body-lg` | 16px / 1.6 | 18px / 1.6 | Regular (400) | Lesson descriptions, scholarship body text |
| `body-md` | 14px / 1.6 | 15px / 1.6 | Regular (400) | Default UI text, form labels |
| `body-sm` | 13px / 1.5 | 13px / 1.5 | Regular (400) | Metadata, timestamps, helper text |
| `caption` | 11px / 1.4 | 12px / 1.4 | Medium (500) | Badges, tags, eyebrow labels |

**Arabic-specific rules:**
- Minimum body text size is **14px** — never go smaller for Arabic than you would for Latin at 13px; Arabic script needs slightly more room to stay legible, especially with diacritless everyday text.
- Line-height is deliberately generous (1.5–1.6 for body) because Arabic ligatures and ascenders/descenders need more vertical breathing room than Latin.
- Avoid full justification (`text-align: justify`) on Arabic paragraphs — it creates uneven word-spacing (kashida issues). Use left-ragged-in-RTL (i.e., ragged on the left edge) alignment.
- Never letter-spread (`letter-spacing`) Arabic text — it breaks letter connections. Reserve tracking adjustments for Latin numerals/codes only.

---

## 4. Spacing, grid & radius

### 4.1 Spacing scale (4px base unit)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (px) — named `space-1` through `space-9` in that order.

- Card internal padding: `space-4` (16px) mobile, `space-5`→24px desktop.
- Section vertical rhythm: `space-7` (48px) mobile, `space-8` (64px) desktop between major homepage sections.

### 4.2 Grid

- Mobile: 4-column grid, 16px gutter, 16px margin.
- Tablet: 8-column grid, 20px gutter, 24px margin.
- Desktop: 12-column grid, 24px gutter, max content width **1280px**, centered.
- Course/Scholarship card grids: 1 col (mobile) → 2 col (tablet) → 3 col (desktop) → 4 col (large desktop ≥1440px).

### 4.3 Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Badges, tags, small buttons |
| `radius-md` | 12px | Cards, inputs |
| `radius-lg` | 20px | Modals, the smart search box, hero panels |
| `radius-full` | 999px | Avatar, pill buttons, progress rings |

Avoid fully-square corners anywhere — it's the one small signature that keeps the UI feeling warm rather than institutional, echoing the arch shape in the Khawarizm logo.

### 4.4 Elevation (on dark UI, shadows behave differently than on white)

Standard drop-shadows barely read on a `navy-950` background. Use **glow elevation** instead:

| Token | Definition | Use |
|---|---|---|
| `elev-0` | none | Flat inline elements |
| `elev-1` | `0 2px 8px rgba(0,0,0,0.35)` + `1px` border `navy-600` | Resting cards |
| `elev-2` | `0 8px 24px rgba(0,0,0,0.45)`, border brightens to `blue-500` at 30% | Hovered/focused cards |
| `elev-glow-gold` | `0 0 24px rgba(229,182,92,0.25)` | Primary CTA hover, achievement moments, "featured" badge |
| `elev-glow-blue` | `0 0 24px rgba(41,169,255,0.25)` | Active/selected states, focused inputs, live session "on air" indicator |

---

## 5. Core components

*(Written as specs, not code — translate to your framework/Stitch as needed.)*

### 5.1 Buttons
- **Primary:** `gradient-gold` fill, `navy-950` text, `radius-md`, `elev-glow-gold` on hover, subtle scale (1.02) on press. One per screen/section — this is the "the one thing we want you to do" button.
- **Secondary:** transparent fill, `blue-400` 1px border + text, fills to `blue-500`/10% tint on hover.
- **Ghost/tertiary:** text-only, `white-100`, gains underline + `blue-400` color on hover.
- **Icon buttons** (bookmark/save, share): `navy-700` circular background, `radius-full`, 40x40px minimum tap target.

### 5.2 Cards (the single most important component — used for both pillars)
Anatomy, top to bottom (mirrored for RTL):
1. **Media/thumbnail** (16:9), top corners rounded to `radius-md`, with a small pillar-accent gradient bar (2px) along the bottom edge of the image — blue for courses, gold for scholarships.
2. **Eyebrow tag row**: category badge (e.g., "برمجة" / "منحة دراسية") + level/country badge, `caption` size.
3. **Title**: `heading-md`, max 2 lines, ellipsis overflow.
4. **Meta row**: for courses → instructor + duration + lesson count; for scholarships → provider + deadline countdown (uses `warning-500` if <7 days remain).
5. **Footer row**: primary micro-CTA (e.g., "استمر" / "التفاصيل") right-aligned (which is the *start* edge in RTL... see §8), price or "مجاني" badge left-aligned.

Card states: resting (`elev-1`) → hover (`elev-2`, thumbnail scales 1.03 inside its clip) → pressed (scale 0.98).

### 5.3 Smart search / AI-style input bar
- Pill-shaped, `radius-full`, height 56px mobile / 64px desktop, `navy-800` fill with `1px` `blue-500` border that gains `elev-glow-blue` on focus.
- Left-side (start-side in RTL = visually right) icon: a stylized compass/astrolabe glyph (nod to Al-Khwarizmi/astronomy) instead of a generic magnifying glass — small but important brand differentiator.
- Contains, inline, a **2-segment toggle chip** ("دورة" / "منحة") the user sets before or after typing — this is what makes it "smart" without needing real AI: it's really a guided/structured search. Full logic in `02-homepage-ux.md`.
- Placeholder text rotates every 4s through examples: "أبحث عن دورة برمجة للمبتدئين…", "أبحث عن منحة للسعوديين في هندسة الحاسب…".

### 5.4 Badges/Tags
`caption` text, `radius-sm`, 4px/10px padding, tinted background at 15% of the semantic color, full-opacity text of that color. Used for: subject category, level (مبتدئ/متوسط/متقدم), country/nationality eligibility, price (مجاني/مدفوع), status (مفتوح الآن/يغلق قريبًا/مغلق).

### 5.5 Progress indicators
- **Course progress ring**: circular, `radius-full`, gold-to-blue gradient stroke representing % complete, used on course cards for enrolled users and on the dashboard.
- **Linear progress bar**: used inside the course player for "lesson X of Y," track color `navy-700`, fill `gradient-tech`.
- **Countdown chip**: for scholarship deadlines and live "closes in" competition timers — tabular numerals, `warning-500` once under 7 days, `danger-500` once under 24 hours.

### 5.6 Modals & drawers
- Backdrop: `overlay-scrim`.
- Panel: `navy-800`, `radius-lg`, slides up from bottom on mobile (bottom-sheet pattern), centers with fade+scale on desktop.
- Used for: quiz question review, "confirm registration," live session join confirmation, Instagram download preview.

### 5.7 Navigation
- **Top nav (desktop):** `navy-950` background, `1px` bottom border `navy-600`, logo start-aligned (right, in RTL), links centered/end-clustered, search + account end-aligned (left, in RTL).
- **Bottom nav (mobile):** `navy-900`, floating slightly with `elev-1`, active tab shown via filled icon + `gold-400` label + a small dot indicator above the icon (not a full pill background — keeps it light).

---

## 6. Iconography

- Style: **line icons, 1.5–2px stroke**, rounded caps — matching the linework style already used in the brand sheet's "usage guide" icons (book, star, laptop, planet, column).
- Two icon "moods" to draw from, matching the two pillars: **technology/geometry** (circuit lines, compass, code brackets) for courses, and **classical/scholarly** (open book, column, scroll, star/astrolabe) for scholarships and the brand's "ancient knowledge" identity.
- Never use filled/glyph-style icons from a generic set (e.g., Font Awesome solid) — they read as "template." Prefer a consistent outline set (Phosphor, Lucide, or a custom set matching the brand sheet's style) at consistent stroke width throughout.
- Achievement/gamification icons (badges, certificates, competition trophies) may use gold fill as a deliberate exception — this is the "precious moment" the whole gold-restraint principle is protecting.

---

## 7. Motion

Motion should feel like **quiet, precise mechanism** — think of an astrolabe's gears, not a bouncy consumer app.

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Card hover elevate | 180ms | ease-out | scale 1.0→1.03 on thumbnail only |
| Button press | 100ms | ease-in-out | scale 1.0→0.98 |
| Page/section transitions | 240ms | ease-in-out | slide + fade, direction-aware for RTL (new content enters from the *start*/right edge) |
| Modal/drawer open | 220ms | ease-out | scale 0.96→1.0 + fade, or slide-up on mobile bottom sheets |
| Countdown digit tick | instant | — | no easing on numeral changes, keeps urgency honest |
| Success/correct-answer feedback | 300ms | spring (subtle overshoot) | this is one of the few places a slightly playful bounce is allowed — echoes Scrimba's encouraging feedback moments |
| Star/glow ambient background | 6–10s loop | linear | very subtle parallax/twinkle in hero backgrounds only, must not distract from foreground content or affect performance |

Respect `prefers-reduced-motion` — disable ambient star animation and reduce all transitions to opacity-only fades.

---

## 8. RTL & Arabic-specific rules

1. **Full mirroring**, not just text direction: nav order, icon directions (back arrows point right, forward/next arrows point left), progress bars fill right-to-left, card carousels scroll right-to-left, breadcrumbs reverse.
2. **Numerals stay LTR** even inside RTL sentences (dates, prices, percentages, countdown timers) — this is standard and expected in Arabic UI, don't force Eastern Arabic-Indic numerals unless a client specifically requests them.
3. **Icons that depict directionality** (arrows, play buttons pointing into a mirrored timeline) must flip. Icons that are direction-neutral (search, bookmark, star, bell) do not.
4. **Mixed content lines** (an Arabic sentence containing a course title in English, e.g. "دورة React للمبتدئين") need correct bidi isolation — wrap embedded Latin terms so they don't visually reverse.
5. **Form fields**: labels sit above inputs (not inline-start) to avoid RTL/LTR label-alignment ambiguity; input text aligns right, but email/URL/number fields align their content LTR within a right-aligned field.
6. Any Stitch prompt must **explicitly state "right-to-left, Arabic-first layout, mirror all directional UI"** — Stitch defaults to LTR and will not infer this from font choice alone.

---

## 9. Voice & tone (Arabic copy)

- **Register:** modern standard Arabic (فصحى), but approachable and warm — closer to how a good teacher or older sibling talks, not bureaucratic/formal government-document Arabic. Avoid overly archaic vocabulary despite the "ancient knowledge" visual theme; the *visuals* carry the heritage feel, the *copy* should feel current.
- **Confidence, not hype:** Scrimba-style encouragement ("أنت قادر على هذا 💪") is fine in micro-copy (quiz feedback, course completion) but the homepage/marketing copy should stay closer to Codecademy's clear, benefit-first statements rather than exclamation-heavy hype.
- **Scholarship copy is neutral and factual**, with a clear, repeated disclaimer pattern (see `05-scholarships-events-ux.md`) that Khawarizm curates/announces but does not administer these opportunities — this is a trust and liability point, not just a UX nicety.
- **Numbers and deadlines are always precise** ("يغلق التقديم خلال 3 أيام" not "قريبًا") — vagueness undermines trust in the opportunities pillar specifically.

---

## 10. Do / Don't summary

| Do | Don't |
|---|---|
| Use gold for exactly one primary action per screen | Use gold as a general "nice color" fill everywhere |
| Give courses and scholarships identical card geometry | Make one pillar's cards bigger/higher/first by default |
| Use glow-based elevation on dark surfaces | Use default black drop-shadows (invisible on navy) |
| Keep Arabic body text ≥14px with generous line-height | Reuse a Latin type scale's tight line-heights |
| Mirror all directional chrome for RTL | Just flip `text-align` and call it RTL-ready |
| Use tabular Latin numerals for countdowns/prices | Let numeral widths jitter or use Eastern Arabic-Indic inconsistently |
| Keep ornamental star/geometric motifs in backgrounds/empty states | Put decorative line-art inside dense tables or forms |
