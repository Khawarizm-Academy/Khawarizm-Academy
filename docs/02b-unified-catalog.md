# Khawarizm Academy — Unified Catalog & Adaptive Card System

> This file replaces the idea of two separate catalog pages (a "Courses Catalog" and a "Scholarships Board") with **one catalog engine** that both pillars run on. It's the single most structural change to the IA since the original spec — read this before `03-course-system-ux.md` §2 or `05-scholarships-events-ux.md` §1, which now both defer to this file. References `01-design-system.md`.

---

## 1. Why unify

Originally the spec had two parallel systems (Courses Catalog, Scholarships Board) that were *designed* to feel like siblings but were *built* as two separate things. Unifying them into one catalog:

- Makes pillar-parity structural instead of just visual — they're literally the same list, filtered.
- Lets the platform show **mixed results** naturally (a student searching "برمجة" should see relevant courses *and* relevant scholarships in one place if they haven't committed to one type).
- Simplifies the backend to one query surface instead of two (`07-backend-notes.md` updated accordingly).
- Still fully supports "show me only courses" or "show me only scholarships" as a filter state, not a different page — so nothing about the pillar-specific experience is lost, it's just reached differently.

---

## 2. One route, one page: `/catalog`

Nav entries **"الدورات"** and **"المنح والفرص"** both route to `/catalog` with a pre-applied `type` filter (`type=course` or `type=scholarship`, respectively) — from the user's point of view they still feel like two destinations with two URLs/labels; internally it's one page, one component tree, one data source.

### 2.1 Layout (all breakpoints)

```
┌─────────────────────────────────────────────────────────┐
│  [الكل]  [الدورات]  [المنح والفرص]        ← type switch  │
├─────────────────────────────────────────────────────────┤
│  🔍 بحث داخل النتائج...                                   │
├───────────────┬───────────────────────────────────────────┤
│  فلاتر         │   شبكة العناصر (بطاقات متكيّفة)             │
│  (سياقية،      │                                             │
│  تتغيّر حسب     │                                             │
│  النوع المختار) │                                             │
└───────────────┴───────────────────────────────────────────┘
```

- **Type switch**: a 3-segment control (الكل / الدورات / المنح والفرص) — this is the primary control on the page, always visible, not buried in a filter drawer. It's a segmented pill control using the same visual language as the homepage search box's course/scholarship toggle (design system §5.3), so the interaction feels familiar the moment a user reaches this page.
- **"الكل" (All)** is a genuine mixed view, not a placeholder — it interleaves both item types in one feed (see §4 for ordering logic).
- Switching segments doesn't navigate to a new page — it's an in-place filter transition (fade/reflow, ~200ms per design system §7), so the URL updates (`?type=course`) but there's no full page reload, no loss of scroll position awkwardness.

### 2.2 Contextual filter panel

The filter sidebar (desktop) / filter sheet (mobile) **changes its available filters based on the active type segment**, since courses and scholarships don't share filter dimensions:

| Filter shown when... | الكل (All) | الدورات (Courses) | المنح (Scholarships) |
|---|---|---|---|
| المجال (Field/category) | ✅ shared taxonomy | ✅ | ✅ |
| المستوى (Level) | ✅ (shown as "مبتدئ/متوسط/متقدم" for courses, "بكالوريوس/ماجستير/دكتوراه" for scholarships — see §2.3) | ✅ course levels | ✅ degree levels |
| اللغة (Language) | ✅ | ✅ | — hidden |
| السعر (Price: free/paid) | ✅ | ✅ | — hidden |
| البلد/الجنسية (Eligible country) | ✅ | — hidden | ✅ |
| الجهة (Provider/Instructor) | ✅ (generic "provided by" label) | ✅ (instructor) | ✅ (granting org) |
| حالة التقديم (Open now/closing soon/closed) | ✅ (scholarships only, hidden for pure-course view) | — hidden | ✅ |

**"المجال" (Field) is the one filter taxonomy shared across both item types** — e.g., "برمجة," "تصميم," "هندسة," "علوم," "لغات" apply equally to a course and a scholarship. This shared taxonomy is what makes the "الكل" mixed view coherent rather than just two unrelated lists shown together — filtering by "برمجة" in All-mode genuinely surfaces a relevant course *and* a relevant scholarship in the same field.

### 2.3 The "المستوى" (Level) filter in mixed mode
Since course levels (مبتدئ/متوسط/متقدم) and scholarship degree levels (بكالوريوس/ماجستير/دكتوراه) are different vocabularies, the All-mode filter panel shows them as **two clearly labeled sub-groups within one "المستوى" filter section** rather than forcing a false shared taxonomy:
```
المستوى
  للدورات: [مبتدئ] [متوسط] [متقدم]
  للمنح: [بكالوريوس] [ماجستير] [دكتوراه]
```
Selecting a course-level chip only narrows course results; selecting a degree-level chip only narrows scholarship results; both can be active simultaneously in All-mode, each affecting only its own item type within the mixed feed.

### 2.4 Sort control
- **الأكثر صلة (Most relevant)** — default in "الكل" mode, see §4 for the interleaving/relevance logic.
- **الأحدث (Newest)**
- **الأقرب انتهاءً (Soonest deadline)** — only meaningfully applies to scholarships; when active in All-mode, courses sort by newest as a fallback beneath it, or the sort control simply hides course items to the bottom of the feed for that specific sort (courses have no deadline concept), clearly labeled.
- **الأكثر شيوعًا (Most popular)** — course-relevant metric (enrollment count); in All-mode scholarships sort by save-count as their equivalent popularity signal.

---

## 3. The Adaptive Card Component

This is the component-level heart of the unification: **one card shell, three render modes.**

### 3.1 Shared anatomy (identical across all three modes — this is what makes them feel like one family)
1. Media/thumbnail, 16:9, rounded top corners (`radius-md`)
2. A 2px accent bar along the thumbnail's bottom edge — **this bar's color is the only thing that visually encodes item type at a glance**: tech-blue gradient for courses, gold gradient for scholarships
3. Eyebrow tag row (category badge + one type-specific secondary badge)
4. Title, `heading-md`, 2-line max
5. Meta row (content differs by type, see below)
6. Footer row: primary micro-CTA (end-aligned) + a secondary data point (start-aligned)

Card size, padding, radius, elevation states (`elev-1` resting → `elev-2` hover), and animation timing are **byte-for-byte identical** regardless of mode — no exceptions. This identical geometry is what actually delivers pillar parity, more so than any color or icon choice.

### 3.2 Mode: Course card
- Secondary badge: level (مبتدئ/متوسط/متقدم)
- Meta row: instructor name · duration · lesson count
- Footer: price/"مجاني" (start-aligned) · "استمر"/"ابدأ الآن" (end-aligned)
- Optional overlay: progress ring on thumbnail if enrolled

### 3.3 Mode: Scholarship card
- Secondary badge: degree level or funding type
- Meta row: provider name · eligible-country flag chips (max 3 + "+X")
- Footer: deadline countdown chip, color-escalating per design system §5.5 (start-aligned) · "التفاصيل" (end-aligned)
- Permanent quiet disclaimer line beneath the footer: "إعلان فقط" (per `05-scholarships-events-ux.md` §1.3 trust pattern — unchanged, just now living in the shared card component rather than a scholarship-only one)

### 3.4 Mode: Mixed/mystery context (used only in the "الكل" feed and in homepage rails that might show either)
No new visual mode is needed here — a card simply renders as 3.2 or 3.3 depending on its own `item_type`. The "mixed" feed is a **feed of individually-typed cards**, not a hybrid card design. This keeps the component genuinely simple: the card component takes one prop (`type: 'course' | 'scholarship'`) and renders the matching field set; there is no third card layout to build or maintain.

### 3.5 Skeleton/loading state
One shared skeleton shape for both types (since layout geometry is identical) — no need for type-specific loading placeholders.

---

## 4. Ordering logic for the "الكل" (mixed) feed

To keep a mixed feed from feeling arbitrary:

- **Default relevance sort** interleaves by a simple alternating pattern **weighted by recency/urgency within each type**, not strict 1-1-1-1 alternation (which would feel mechanical) and not full separation by type (which would defeat the purpose of a mixed view). Practical approach: take the top N recommended/recent courses and top N soonest-deadline scholarships, merge-sort them by a shared "freshness/urgency score" (course: newly published or trending; scholarship: deadline proximity), so whichever item is more time-sensitive surfaces higher regardless of type.
- This scoring detail is a backend/ranking concern (see `07-backend-notes.md`), but the UX requirement it must satisfy is: **a user scrolling the All feed should encounter both pillars within the first 2-3 rows**, never "all courses, then eventually scholarships appear" or vice versa.

---

## 5. Homepage & search integration (supersedes prior "two destinations" framing)

- The homepage twin rails (`02-homepage-ux.md` §5) are unchanged in appearance — they still show two visually-separate rails, because that layout is doing important above-the-fold parity signaling for first-time visitors. But **both rails now query the same unified catalog** filtered by type, rather than two separate endpoints.
- The homepage smart search box's course/scholarship toggle (`02-homepage-ux.md` §2.2) now maps directly to the catalog's type-switch segments — selecting "دورة" in the search box and landing on results is functionally identical to landing on `/catalog?type=course`. One mental model, reinforced everywhere.
- **New option enabled by unification**: a user can leave the search box toggle in a neutral "الكل" state (no strong default) if they're genuinely unsure which pillar they want — typing "برمجة" with no toggle selected lands on `/catalog?type=all&q=برمجة`, showing both a relevant course and a relevant scholarship. This wasn't cleanly possible before; it's a direct benefit of the unification. Update: the toggle should now default to **"الكل" for first-time visitors** (not "دورة" as previously specified), since forcing an early type commitment before a user has expressed intent no longer serves any technical necessity now that the catalog is unified. Returning users still default to their last-used type.

---

## 6. Click-count audit (updated)

| Path | Clicks |
|---|---|
| Homepage nav "الدورات" → `/catalog?type=course` → card → detail | 2 clicks (nav pre-filters, so landing IS the filtered view) |
| Homepage nav "المنح والفرص" → `/catalog?type=scholarship` → card → detail | 2 clicks |
| Homepage search (typed, no toggle) → `/catalog?type=all&q=...` → card → detail | 2 clicks |
| Homepage rail card (either pillar) → detail directly | 1 click, unchanged |
| Within catalog, switching type segments | 0 clicks in the navigational sense (in-place filter, not a new page) |

No path got longer as a result of unification — segment-switching inside the catalog is free (doesn't count against the budget) since it's a filter interaction, not a navigation step.

---

## 7. What did NOT change

- Detail pages remain **fully separate templates** — Course Landing Page and Scholarship Detail Page still have distinct content structures (curriculum accordion vs. eligibility/disclaimer block) because their content genuinely differs. Unification applies to the **browsing/discovery layer only**, not to the deep content pages. See `03-course-system-ux.md` §3 and `05-scholarships-events-ux.md` §1.3, both unchanged.
- The disclaimer pattern for scholarships is unchanged and still mandatory at both card and detail level.
- Events and Competitions remain outside this catalog entirely — they keep their own distinct wide-card visual grammar and are not filterable alongside Courses/Scholarships, since they're a different content kind by design (per `00-overview.md` §5 and `05-scholarships-events-ux.md` §3).
