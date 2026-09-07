# Khawarizm Academy — Scholarships, Events & Instagram Downloads UX

> References `01-design-system.md`. This file covers the platform's second core pillar (Scholarships/Opportunities) plus two secondary content types (Events/Seminars, Instagram Downloads). **Catalog browsing for scholarships (filters, sorting, the scholarship card itself) now lives in `02b-unified-catalog.md`**, since Courses and Scholarships share one catalog engine — this file picks up from the moment a user lands on a specific Scholarship Detail Page.

---

## 1. Scholarships & Opportunities ("المنح والفرص")

### 1.1 Positioning reminder
This pillar is **equal in weight to Courses**, not a secondary feature — see `00-overview.md` §5 and `02-homepage-ux.md` §5 for the homepage parity rules. As of the unified catalog, that equality is structural: scholarships and courses are browsed through the exact same catalog engine and the exact same adaptive card component, filtered by type. This file now covers only what's specific to scholarships: the detail page and the trust/disclaimer pattern.

### 1.2 Reaching the Scholarship Detail Page
Discovery, filtering, sorting, and the scholarship-card component are specified once — shared with courses — in `02b-unified-catalog.md`:

- Catalog layout, type-switch, and contextual filters (البلد/الجنسية، المرحلة الدراسية، المجال، الجهة المانحة، حالة التقديم) → `02b-unified-catalog.md` §2.2
- The scholarship card's exact anatomy, including the "إعلان فقط" disclaimer line at card level → `02b-unified-catalog.md` §3.3
- Default sort: "الأقرب انتهاءً" (soonest deadline), unlike courses which default to popularity, since missing a deadline is the core failure mode this product should help prevent → `02b-unified-catalog.md` §2.4
- Closed/expired opportunities are **not deleted** — they move to a collapsed "فرص منتهية" state, filterable via حالة التقديم, preserving them as browsable reference/social-proof content without cluttering active results.

Everything from §1.3 onward covers what's specific to one scholarship's own page.

### 1.3 Scholarship Detail Page
Anatomy:
1. **Breadcrumb**: الرئيسية / المنح والفرص / [اسم المنحة]
2. **Header**: opportunity title (`display-lg`), provider name + logo, status badge (مفتوح الآن/يغلق قريبًا/مغلق), deadline countdown (large, prominent — this is the single most important data point on the page).
3. **Eligibility summary card**: at-a-glance chips — country/nationality, degree level, field, age/GPA requirements if applicable, funding coverage (كامل/جزئي — full/partial).
4. **"عن المنحة" (About)**: full description, what it covers, application requirements — sourced/curated content, written in Khawarizm's neutral factual voice per design system §9.
5. **Trust/disclaimer block** (prominent, not buried in fine print): a clearly bordered callout, e.g.:
   > ⓘ **هذه منحة تُقدَّم من جهة خارجية.** أكاديمية خوارزم تنشر هذا الإعلان لمساعدتك على الاطلاع على الفرص المتاحة، ولا تدير عملية التقديم أو تضمن القبول. للتقديم ومعرفة التفاصيل الكاملة، يرجى زيارة الموقع الرسمي للجهة المانحة.
   
   This block uses `navy-700` background with a `blue-400` left border accent (info-style, not warning-style — it's a clarification, not an error) and sits **above the fold**, directly under the eligibility card, not at the bottom of the page where it could be missed.
6. **Primary CTA**: "التقديم عبر الموقع الرسمي" (Apply via official site) — outbound link, opens in a new tab, clearly indicated with an external-link icon so users understand they're leaving Khawarizm.
7. **Secondary actions**: "احفظ" (save/bookmark — adds to the "منحي المحفوظة" section of the dashboard, see `08-dashboard-ux.md` §6, and can trigger a deadline-reminder notification), "شارك" (share).
8. **Related opportunities** rail: same المجال or نفس الجهة المانحة.

### 1.4 Deadline reminder mechanic
- When a user saves an opportunity, offer an inline micro-prompt: "نذكّرك قبل انتهاء التقديم بـ 3 أيام؟" with a simple toggle — opt-in notification, not automatic, respects notification fatigue.

### 1.5 Click-count
Homepage rail → detail page (1 click) OR Nav "المنح والفرص" → unified catalog pre-filtered to scholarships → detail page (2 clicks, filters count as refinement not a "step" since results update live without a page transition). Full audit across all catalog entry points → `02b-unified-catalog.md` §6.

---

## 2. Events & Seminars ("الفعاليات")

### 2.1 Positioning
Distinct in kind from Courses/Scholarships (per brief: "these are of a different type") — self-hosted, editorial, time-bound. Uses the wide-card/announcement visual grammar from `02-homepage-ux.md` §6, not the standard course/scholarship card.

### 2.2 Standalone Events Page
- Simple reverse-chronological (upcoming first) list of wide event cards, grouped by "قادمة" (upcoming) and "سابقة" (past, collapsed by default).
- Each card: event image, title, date/time, format badge (حضوري/عبر الإنترنت — in-person/online), one-line hook.

### 2.3 Event Detail Page
- Header: title, hero image, date/time (with "أضف للتقويم" calendar-file action), location or online-link info.
- Full description body.
- If registration is required: a simple RSVP action (name/email if not logged in, one-tap if logged in) — "سجّل حضورك."
- If it's a past event with recap content (photos/recording): shown here as a "ملخص الفعالية" section.
- Social share action, since events are explicitly a followers/engagement-growth tool per the brief.

### 2.4 Click-count
Homepage strip → detail page (1 click). Nav → events page → detail page (2 clicks).

---

## 3. Competitions cross-reference

Competitions share the same "announcement/notification" visual family as Events (large, prominent cards) per the brief's explicit instruction that they follow "the same format as events." Full competition mechanics (registration, arena, leaderboard) live in `04-quiz-exam-system-ux.md` §4 — this file just confirms the visual-family relationship: Events and Competitions are siblings in presentation style, while Courses and Scholarships are siblings in a different (card-grid) presentation style. Four content types, two visual grammars, by design.

---

## 4. Instagram Downloads ("تنزيلات إنستغرام")

### 4.1 Positioning
A lightweight utility tool, explicitly lower-priority than the four content pillars above. Likely purpose: letting students/followers download Khawarizm's own Instagram Reels/posts for offline viewing or resharing (exact legal/product scope of "whose content can be downloaded" is a product decision outside this UX pass — flagging that this tool should only be used for Khawarizm's own published content or content it has rights to redistribute, not as a general-purpose IG downloader, to avoid copyright exposure).

### 4.2 Page anatomy
- Single-purpose utility page: a text input for an Instagram post/reel URL + "تنزيل" button.
- Result: a preview thumbnail + resolution/format options + download button.
- Minimal chrome, `navy-800` flat cards, no gradients/glows — utility tools shouldn't visually compete with learning/opportunity content per design system restraint principles.

### 4.3 Click-count
Homepage teaser → utility page (1 click) → paste link → download (2 additional actions, not "clicks" in the navigation sense).
