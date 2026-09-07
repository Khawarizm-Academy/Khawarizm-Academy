# Khawarizm Academy — Homepage UX Specification

> References `01-design-system.md` tokens throughout. All layouts described start-to-end in RTL reading order (right → left), top to bottom.

---

## 1. Homepage layout — section order & rationale

Top to bottom:

1. **Header/nav** (sticky)
2. **Hero + Smart Search Box** — the single most important element on the page
3. **Competitions banner strip** (if an active competition exists — conditional section)
4. **Twin pillar rails: "الدورات المميزة" (Featured Courses) / "المنح والفرص المتاحة" (Available Scholarships)** — side-by-side, equal weight
5. **Events & Seminars strip** (self-hosted content, distinct visual treatment)
6. **"كيف تعمل المنصة" (How it works)** — 3-step visual explainer, builds trust for new visitors
7. **Instagram downloads teaser** (small, utility-tier)
8. **Footer**

Rationale for order: search-first (respects the brief's emphasis on the smart search box as *the* entry point), then urgency-driven content (competitions, if live), then the two core pillars given equal immediate visibility, then lower-frequency content (events, explainer, IG tool), then footer. A returning logged-in user additionally sees a **"تابع من حيث توقفت" (Continue where you left off)** rail inserted directly under the hero — this is the fastest path back into an in-progress course or a saved scholarship, directly serving the 2-3 click rule.

---

## 2. The Smart Search Box (core feature)

### 2.1 What it is (and isn't)

Per your direction, this ships as **structured/guided search, not a real conversational AI** — but it must *feel* like a smart assistant through interaction design, not through actual NLP.

### 2.2 Anatomy

```
┌───────────────────────────────────────────────────────┐
│  [دورة ⚪ /  ⚫ منحة]   ماذا تبحث عنه؟  [مربع كتابة]  [🧭]│
│                                                          │
│  فلاتر سريعة تظهر بعد الكتابة أو عند الضغط:              │
│  [المستوى ▾]  [البلد/الجنسية ▾]  [المجال ▾]             │
└───────────────────────────────────────────────────────┘
```

- **Step 0 — Segment toggle** (الكل / دورة / منحة): a 3-option pill toggle *inside* the search bar's start-edge, mirroring the catalog's own type-switch (see `02b-unified-catalog.md` §2.1 and §5 — this is the same control, same states, appearing in two places). Defaults to **"الكل" for first-time visitors** (a neutral, uncommitted state is now possible because both pillars share one catalog — see `02b-unified-catalog.md` §5) and to whichever type the user last used for returning visitors.
- **Step 1 — Free-text field**: rotating placeholder examples (see design system §5.3). As the user types, this is a **matched-keyword search** against course titles/tags or scholarship titles/tags/countries — not an LLM call. Results begin appearing in a live dropdown after 2 characters.
- **Step 2 — Contextual quick filters** appear *dynamically* based on the toggle:
  - If "دورة" selected: المستوى (مبتدئ/متوسط/متقدم), المجال (برمجة/تصميم/رياضيات/لغات...), اللغة, مجاني/مدفوع.
  - If "منحة" selected: البلد/الجنسية المؤهلة, المرحلة الدراسية, المجال, الجهة المانحة.
- **The "compass" icon** (🧭 conceptually — an astrolabe/compass glyph per design system §5.3) acts as the submit action, but also — this is the "smart" feeling — **tapping it with an empty text field opens a guided 3-question micro-flow** instead of a blank results page:

  > سؤال 1: "ماذا تريد أن تحقق؟" → [أتعلم مهارة جديدة] [أطور مسيرتي المهنية] [أبحث عن فرصة تمويل/منحة]
  > سؤال 2 (تكيّفي حسب الإجابة): إمّا "ما المجال؟" (لو اختار تعلم) أو "من أي بلد أنت؟" (لو اختار منحة)
  > سؤال 3: "ما مستواك الحالي؟" → مبتدئ / متوسط / متقدم

  This is implemented as the `ask_user_input`-style tappable-chip pattern (single-select chips, one question per screen, auto-advances) — genuinely just a filter wizard, but the sequential reveal + adaptive second question is what creates the "smart assistant" perception the brief asks for, at zero AI infrastructure cost.

- **Step 3 — Results**: lands on `/catalog` (the unified catalog — see `02b-unified-catalog.md`) with the type segment and derived filters pre-applied as visible, removable chips. If the toggle was left on "الكل," results are a genuine mixed feed of both courses and scholarships. **This is click 2 of 2-3.**

### 2.3 Click-count audit
- Typed search → tap result in live dropdown → **detail page**. **2 clicks.**
- Compass-wizard (3 taps, feels like "asking," but is UX not friction) → filtered results page → tap a card → **detail page**. **This is technically the 5-click outer bound**, but each "click" is a single tap on a large chip, takes under a second, and is optional (a user can always type directly instead). Flag this clearly to stakeholders: the wizard trades click-count for a friendlier onboarding moment for undecided users; confident users bypass it via direct typing and stay within 2-3 clicks.

### 2.4 Empty/edge states
- No text + toggle only + submit → wizard (above).
- Search with zero matches → friendly empty state ("لم نجد نتائج مطابقة — جرّب هذه الاقتراحات") showing 3 popular alternatives from the selected pillar, never a dead end.
- Network/search error → inline retry, never a full-page error for a search-box failure.

---

## 3. Hero section

- Full-bleed `gradient-navy` background with the subtle ambient star/twinkle motion (design system §7), plus a very faint large-scale line-art motif echoing the logo's dome/arch shape, positioned end-side (left, in RTL) so it doesn't compete with the search box.
- Headline (`display-xl`): benefit-first statement, e.g. "تعلّم مهارة، أو اعثر على منحتك القادمة — في مكان واحد." (Copy direction only — final copy is a separate content pass.)
- Subheadline (`body-lg`, `slate-400`): one sentence reinforcing both pillars exist equally.
- Smart search box sits directly below, is the visual focal point (largest single element, `elev-glow-blue` on focus).
- Small trust row beneath: live counters — "X+ درس مسجّل", "Y+ فرصة منشورة هذا الشهر" (tabular numerals, updates from real data, not hardcoded).

---

## 4. Competitions banner (conditional)

- Only renders if ≥1 competition is currently open for registration or in-progress.
- Full-width strip directly under hero (or under competitions+hero combined if multiple), styled as a **high-contrast announcement bar**, not a card: `gradient-gold` background, dark navy text, a pulsing (subtle, reduced-motion-safe) live indicator if a coding competition is currently running.
- Content: competition name, one-line hook, countdown chip (registration closes in / starts in), single CTA "سجّل الآن" / "شاهد التفاصيل."
- Tapping anywhere on the strip (not just the CTA) opens the Competition Detail Page. **Click 1.**
- If multiple competitions are active, this becomes a lightweight auto-advancing carousel (5-6s per slide, swipeable, pause-on-hover/touch) rather than stacking multiple banners — stacking would compete with the twin pillar rails below for "most important thing on the page" status, which must stay reserved for Courses/Scholarships.

---

## 5. Twin Pillar Rails — Courses & Scholarships (equal weight, the core requirement)

> **Note:** both rails now query the same unified catalog (`02b-unified-catalog.md`), filtered by type and sorted by "featured/relevant." The two-rail *layout* below is unchanged — it's still the right pattern for above-the-fold parity signaling — but the two rails are no longer backed by separate data sources or separate card components; they're the same adaptive card, same query engine, filtered two ways.

### 5.1 Layout

- **Desktop:** two equal-width columns side by side, 50/50 split within the 1280px content width, `space-6` gap between. Courses rail on the **start side (right, RTL)**, Scholarships on the **end side (left)** — this ordering is a coin-flip made consistent, not a hierarchy statement; both have identical header treatment.
- **Mobile:** stacked, but *interleaved* rather than "all courses then all scholarships" — see §5.4 for the mechanism that keeps this feeling balanced.

### 5.2 Rail header (identical structure for both)

```
[Icon]  الدورات المميزة                              عرض الكل ←
        عنوان فرعي قصير يوضح القيمة
```
- Icon: tech-mood line icon for courses, scholarly-mood line icon for scholarships (design system §6).
- "عرض الكل" (View all) link, `body-md`, `blue-400` for courses / `gold-400` for scholarships, with a direction-correct arrow (pointing left, toward content flow end in RTL).

### 5.3 Card content (uses design system §5.2 card anatomy)

**Course card additions:**
- Progress ring overlay on thumbnail if user is enrolled (design system §5.5).
- Meta row: instructor avatar+name · duration ("6 ساعات") · lesson count ("14 درسًا").
- Footer: level badge + "مجاني/يبدأ من X ر.س" + micro-CTA "استمر" (if enrolled) or "ابدأ الآن" (if not).

**Scholarship card additions:**
- Meta row: provider/org name · eligible countries (flag chips, max 3 + "+X") · field tag.
- Footer: deadline countdown chip (color escalates per design system §5.5) + micro-CTA "التفاصيل."
- A small, permanent, low-emphasis line at the bottom of *every* scholarship card: "إعلان فقط — التقديم عبر الجهة المانحة" (announcement only — apply via the provider) in `caption`/`slate-600` — this is the trust disclaimer from design system §9, present even at card level, not just on the detail page.

### 5.4 Mobile interleaving mechanism

To avoid "courses first, scholarships feel secondary" on mobile scroll order, the two rails are shown as:
1. Courses rail header + horizontally-scrolling card row (3-4 cards, swipe)
2. Scholarships rail header + horizontally-scrolling card row (3-4 cards, swipe)

— stacked vertically, **but always as a fixed alternating pair immediately adjacent to each other** (never separated by other homepage sections), and both rails are given identical vertical spacing before/after. This is the practical mobile equivalent of "equal weight": proximity and identical treatment substitute for side-by-side layout when screen width forces stacking.

### 5.5 Click-count
Homepage → tap a card → **Course Landing Page or Scholarship Detail Page**. **1 click.** (Even faster than the general 2-3 click budget — this rail exists precisely to shortcut the unified catalog for the highest-relevance items. See `02b-unified-catalog.md` §6 for the full updated click-count audit across all catalog entry points.)

---

## 6. Events & Seminars strip

- Visually distinct from the twin rails — this content is explicitly "a different type" per the brief (self-hosted, editorial, time-bound).
- Treatment: **large notification/announcement card style**, closer to Mawhiba's editorial event presentation than to the course/scholarship card grammar — wider aspect ratio (e.g. 21:9), single large image, overlaid title + date badge, positioned as a horizontally-scrolling strip if multiple events exist.
- Section header: "الفعاليات والندوات" with "عرض الكل" linking to the standalone Events page.
- Each card taps through directly to the **Event Detail Page**. **1 click.**
- If a limited-time/"live soon" event exists, its card gets a `warning-500` countdown badge, echoing the competitions banner's urgency language but visually subordinate to it (smaller, inline badge vs. full-width strip) since competitions were called out as more prominent in the brief.

---

## 7. "How it works" explainer

- Simple 3-step horizontal (desktop) / vertical (mobile) sequence, icon + short label + one-line description:
  1. **اختر** (دورة أو منحة تناسبك) — Choose
  2. **تعلّم / تابع** (شاهد الدروس، حل المسائل، أو قدّم على المنحة) — Learn/Follow
  3. **تقدّم** (اختبارات، جلسات مباشرة، شهادات) — Progress
- Purely informational, no clicks required; exists to build first-time-visitor trust and orient them before they commit to the search box or rails above (this section could also be A/B tested for position — some products place it before the rails for cold visitors; kept here to prioritize returning-visitor speed-to-content per the click-rule mandate).

---

## 8. Instagram downloads teaser

- Small, single-row card at the bottom of the homepage (above footer): icon + "نزّل مقاطع إنستغرام" + one-line description + arrow link to the dedicated utility page.
- Deliberately low visual weight (`navy-800` flat card, no gradient, no glow) — this is a nice-to-have utility, not a pillar, and must not visually compete with Courses/Scholarships/Events/Competitions.

---

## 9. Logged-in vs. logged-out homepage differences

| Section | Logged-out | Logged-in |
|---|---|---|
| Hero CTA | "أنشئ حسابك مجانًا" secondary button next to search | Omitted — search box alone |
| New rail | — | "تابع من حيث توقفت" inserted directly under hero: last-viewed course lesson + last-saved scholarship, side by side, 2 cards only. This is a lightweight homepage-only preview — the full prioritized version (with live sessions, exams-in-progress, and competition urgency folded in) lives in the dashboard's "تابع الآن" slot, see `08-dashboard-ux.md` §4 |
| Notifications | — | Bell icon shows unread count (new scholarship matching saved filters, live session starting soon, quiz graded) |
| Nav avatar | "دخول / إنشاء حساب" buttons | Avatar → dropdown to لوحتي/حسابي/تسجيل خروج |

---

## 10. Responsive summary

| Breakpoint | Hero | Twin rails | Events | Nav |
|---|---|---|---|---|
| Mobile (<768px) | Search box full-width, headline shorter variant | Stacked, interleaved (§5.4) | Horizontal swipe strip | Bottom tab bar (5 items) |
| Tablet (768-1279px) | Search box ~80% width, centered | Side-by-side but narrower cards (2-up per rail) | Horizontal swipe strip | Top nav, condensed labels |
| Desktop (≥1280px) | Search box max 720px, centered | Full side-by-side, 3-4 cards visible per rail | Horizontal swipe or 2-up grid | Full top nav |
