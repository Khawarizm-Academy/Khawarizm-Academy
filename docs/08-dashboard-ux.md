# Khawarizm Academy — Dashboard UX Specification ("لوحتي")

> The dashboard is the **logged-in student's home base** — everything they've enrolled in, saved, registered for, or achieved, in one screen. It's the fastest path back into anything already started, which is what makes the 2-3 click rule achievable for returning users. References `01-design-system.md`, `02b-unified-catalog.md` (shared card component), `03-course-system-ux.md`, `04-quiz-exam-system-ux.md`, and `05-scholarships-events-ux.md`.

---

## 1. Role in the product

Two different "home" surfaces exist and must not be confused:

| Surface | Audience | Purpose |
|---|---|---|
| **الرئيسية (Homepage)** | Everyone, logged in or out | Discovery — surfaces what's new, popular, or matches search intent across both pillars |
| **لوحتي (Dashboard)** | Logged-in users only | Retrieval — surfaces what's *mine*: in-progress, saved, registered, completed |

A logged-in user still sees the homepage (with its own "تابع من حيث توقفت" mini-rail, per `02-homepage-ux.md` §9) — the dashboard isn't a replacement for the homepage, it's the **deeper, complete version** of "continue where you left off," reachable from the bottom nav / top nav at all times.

---

## 2. Information architecture of the dashboard

```
لوحتي
│
├── ملخص سريع (Quick Summary strip) — always visible at top
│
├── تابع الآن (Continue Now) — the single highest-priority in-progress item, full-width
│
├── دوراتي (My Courses) — all enrolled courses, list view
│
├── منحي المحفوظة (My Saved Scholarships) — all saved opportunities, deadline-sorted
│
├── جلساتي المباشرة (My Live Sessions) — upcoming Google Meet sessions across all enrolled courses
│
├── مسابقاتي (My Competitions) — registered/active/past competitions
│
├── شهاداتي (My Certificates) — earned certificates, downloadable
│
└── الإشعارات (Notifications) — accessible via bell icon in header, not a scrolling section
```

This is a **single scrolling page on mobile**, with each section collapsible/expandable if empty or long. On desktop, it can adopt a two-column layout (primary column: Continue Now + My Courses + My Live Sessions; secondary/sidebar column: Saved Scholarships + Competitions + Certificates) — see §8.

---

## 3. Quick Summary strip

A slim, always-visible header row directly below the page title, showing at-a-glance stat chips (not full cards — just numbers with icons):

```
[📚 3 دورات نشطة]   [🎓 منحتان قريبتا الانتهاء]   [🏆 مسابقة مسجّل بها]   [📜 شهادة واحدة]
```

- Purely informational, tappable to jump-scroll to the relevant section below (anchor links, not navigation — stays on the same page).
- Uses `caption`/`body-sm` text with `slate-400`, numerals in tabular Latin figures.
- If a stat is zero, that chip is omitted entirely rather than shown as "0" — avoids a discouraging, empty-feeling header for new users.

---

## 4. "تابع الآن" (Continue Now) — the priority slot

This is new relative to earlier drafts of this spec and is the dashboard's most important design decision: **one single item, elevated above everything else**, answering "what's the one thing I should do right now?"

### 4.1 Selection logic
Priority order (first match wins):
1. A live session starting within the next 30 minutes for an enrolled course → shown as a "🔴 جلستك المباشرة تبدأ قريبًا" card with a direct join CTA.
2. A comprehensive exam attempt in progress (started but not submitted) → "أكمل اختبارك" card.
3. The most recently watched course, at its exact last position → "استمر في [اسم الدورة]" card with a mini progress bar.
4. If no enrollments exist yet (brand new account) → this slot becomes a friendly onboarding prompt: "ابدأ رحلتك الأولى" with a CTA into the unified catalog.

### 4.2 Card treatment
- Full-width, larger than any other card on the dashboard (`elev-2` resting state, not `elev-1` — this card is meant to visually outrank everything below it).
- Uses whichever pillar's accent gradient matches its content (blue for a course/exam, gold if the priority item is a scholarship deadline in extreme edge cases, per §4.3).
- One primary CTA only, no secondary actions cluttering this card — it exists to be tapped immediately.

### 4.3 Edge case — scholarship deadline urgency
If a saved scholarship's deadline is within 24 hours, it can **outrank** a "continue watching" course-progress item (but not an imminent live session, which is time-locked and irreversible if missed) — surfaced here as "منحتك المحفوظة تُغلق خلال ساعات" with a direct outbound CTA. This is the one place urgency from the Scholarships pillar is allowed to take the single most prominent slot on the whole dashboard, which is an intentional, bounded exception to pillar-parity rules elsewhere: parity governs default layout weight, not real-time urgency ranking.

---

## 5. "دوراتي" (My Courses)

- **List layout, not a grid** — denser and more scannable than the catalog's card grid, appropriate for a personal utility view rather than a discovery/browse view (this deliberately breaks from the shared adaptive-card grid used in `02b-unified-catalog.md`, since this is a different job: quick retrieval of something already chosen, not evaluation of options).
- Each row: thumbnail (smaller than a catalog card's), title, circular progress ring (`radius-full`, design system §5.5), "استمر" CTA, and — if applicable — a small inline note for the next live session date ("الجلسة القادمة: الخميس 8:00 م").
- Sort control: "الأحدث نشاطًا" (most recently active, default) / "الأقرب اكتمالًا" (closest to completion) / "أبجديًا" (alphabetical).
- Filter chip row: "الكل" / "قيد التقدم" / "مكتملة" — completed courses stay visible here (not archived away) since they're the entry point to re-watching lessons or re-downloading a certificate.
- Tapping any row → **resumes exact last position in the Course Player, no landing page detour.** This is the dashboard's core promise: **1 click from لوحتي directly into content**, versus 2-3 clicks for a not-yet-enrolled course discovered via the catalog.

---

## 6. "منحي المحفوظة" (My Saved Scholarships)

- List layout (same rationale as §5 — retrieval, not discovery), sorted by soonest-deadline by default (matching the pillar's overall urgency-first convention from `02b-unified-catalog.md` §2.4).
- Each row: provider name, opportunity title, deadline countdown chip (color-escalating per design system §5.5), a small toggle/icon showing reminder-notification status (bell filled = reminder on), and a "التفاصيل" CTA.
- Expired/closed saved scholarships move to a collapsed "منتهية" sub-section at the bottom rather than disappearing — same reasoning as the catalog's closed-opportunity handling in `02b-unified-catalog.md` §1.2, preserved here so a student doesn't wonder "wait, didn't I save something here?"
- Swipe-to-remove (mobile) / hover-X (desktop) to unsave, with an undo toast — standard, low-friction list-management pattern.

---

## 7. "جلساتي المباشرة" (My Live Sessions)

- A unified, chronological list of upcoming Google Meet sessions **across every enrolled course** — this is genuinely useful only because it's centralized; a student enrolled in 3 courses shouldn't have to check 3 separate course players to know what's on this week.
- Each row: course name, date/time, a "أضف للتقويم" action, and a join CTA that follows the same activation-window rule as the in-player version (`03-course-system-ux.md` §4.3, Tab 3) — muted/disabled until ~10 minutes before start, then becomes the primary gold CTA.
- Empty state (no enrolled courses have live components, or none scheduled yet): a quiet placeholder, not an error — "لا توجد جلسات مجدولة حاليًا."

---

## 8. "مسابقاتي" (My Competitions)

- Three states shown as sub-groups: **مسجّل** (registered, upcoming) / **جارية الآن** (currently live — gets a pulsing badge) / **سابقة** (past, with final rank shown if the student participated).
- Each row: competition name, status badge, and a context-appropriate CTA — "أضف تذكيرًا" (registered/upcoming), "ادخل الساحة" (live now), or "عرض النتيجة" (past).
- Directly answers the click-count requirement flagged in `04-quiz-exam-system-ux.md` §6: **registered competition → arena, 1 click from dashboard** on competition day.

---

## 9. "شهاداتي" (My Certificates)

- Grid of certificate thumbnails (2-up mobile, 3-4 up desktop) — this is one of the only places besides achievement moments where a denser, more celebratory grid (rather than the list pattern used elsewhere on this page) is appropriate, since certificates are trophies to display, not tasks to action.
- Each certificate card: course name, completion date, a small gold-foil-style corner accent (subtle use of `elev-glow-gold`, consistent with the Completion/Certificate screen in `03-course-system-ux.md` §4.4), and two actions — "تحميل" (download PDF) and "مشاركة" (share).
- Empty state for students with no certificates yet: encouraging, not empty-feeling — "أكمل أول دورة لتحصل على شهادتك الأولى هنا" with a CTA back into "دوراتي."

---

## 10. Notifications (بell icon, not a dashboard section)

Kept explicitly **out** of the scrolling dashboard body and instead lives behind the header bell icon (top nav desktop / dashboard header mobile) as a dropdown (desktop) or full-screen list (mobile):

- Notification types (per `07-backend-notes.md` `Notification.type`): تذكير موعد نهائي (deadline reminder), جلسة مباشرة ستبدأ قريبًا (live session starting soon), تم تصحيح اختبارك (exam graded), فرصة جديدة تطابق اهتماماتك (new matching scholarship), تذكير مسابقة (competition reminder).
- Each notification is tappable and deep-links directly to the relevant item (exam result, scholarship detail, live session join screen) — notifications are a **navigation shortcut**, not just an inbox to read and dismiss.
- Unread count badge on the bell icon; read-state persists per-notification.

This separation matters for the click-count rule: a notification tap can legitimately be "click 1" of a 2-3 click journey straight to specific content, bypassing the dashboard body entirely — which is precisely why notifications shouldn't be nested inside a dashboard section a student would otherwise have to scroll to find.

---

## 11. Responsive layout

| Breakpoint | Layout |
|---|---|
| Mobile (<768px) | Single column, sections stacked in the §2 order, each collapsible. Quick Summary strip becomes a horizontally-scrollable chip row if it overflows. |
| Tablet (768-1279px) | Single column, same order, slightly wider list rows (more metadata visible per row, e.g. instructor name alongside course title). |
| Desktop (≥1280px) | Two-column layout: **primary column (start-side, ~65% width)** holds تابع الآن + دوراتي + جلساتي المباشرة; **secondary column (end-side, ~35% width)** holds منحي المحفوظة + مسابقاتي + شهاداتي as a stacked sidebar. Quick Summary strip spans the full width above both columns. |

The desktop split deliberately keeps **Courses-related content in the primary column and Scholarships/Competitions/Certificates in the secondary column** — this is the one place in the whole product where the two pillars are *not* shown with strictly equal column-width weight, because the dashboard's job is task-priority (what needs action now, biased toward the higher-frequency course-progress use case), not pillar-marketing (where parity matters because it shapes first impressions). This distinction is worth flagging explicitly to stakeholders since it's an intentional, scoped exception to the parity principle established in `00-overview.md` §5.

---

## 12. Empty/first-time state (brand new account, nothing enrolled/saved yet)

Rather than showing seven empty sections, a first-time dashboard collapses to:
- "تابع الآن" slot shows the onboarding prompt (§4.1, case 4).
- A single friendly module beneath it: "ابدأ من هنا" with two large tappable options mirroring the catalog's type-switch — "استكشف الدورات" / "استكشف المنح والفرص" — routing into `02b-unified-catalog.md`'s catalog pre-filtered accordingly.
- All other sections (My Courses, Saved Scholarships, Live Sessions, Competitions, Certificates) are hidden entirely until they have at least one item, rather than shown empty — reduces first-session clutter and cognitive load.

---

## 13. Click-count audit

| Path | Clicks |
|---|---|
| Bottom nav "لوحتي" → tap "تابع الآن" card | **1 click** to resume the single most relevant thing in the entire product |
| Bottom nav "لوحتي" → "دوراتي" row tap → resumes exact lesson position | **2 clicks**, no landing-page detour |
| Bottom nav "لوحتي" → "منحي المحفوظة" row → scholarship detail | **2 clicks** |
| Notification tap (from anywhere in the app) → specific content (exam result, live session, scholarship) | **1 click**, bypasses dashboard body entirely |
| Bottom nav "لوحتي" → "مسابقاتي" → "ادخل الساحة" (competition day) | **2 clicks** |

Every path through the dashboard stays at or under the 2-3 click budget from `00-overview.md` §3 — by design, since the dashboard exists specifically to shortcut the discovery-oriented catalog flow for things a user has already committed to.
