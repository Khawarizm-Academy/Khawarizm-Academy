# Khawarizm Academy — Course System UX Specification

> Covers: course landing page → enrollment → course player (lessons, problems, live sessions) → completion/certificate. References `01-design-system.md`. **Catalog browsing (filters, sorting, the course card itself) now lives in `02b-unified-catalog.md`, since Courses and Scholarships share one catalog engine** — this file picks up from the moment a student lands on a specific Course Landing Page.

---

## 1. Flow overview

```
Homepage / Nav "الدورات"
        │  (click 1 — nav routes into /catalog?type=course, see 02b-unified-catalog.md)
        ▼
Unified Catalog, pre-filtered to courses
        │  (click 2)
        ▼
Course Landing Page  ──[enroll]──►  Course Player
        │  (click 3 = first lesson OR "استمر" resumes exact spot)
        ▼
   Lesson View ⇄ Problem Set ⇄ Live Session Tab ⇄ Comprehensive Exam ⇄ Certificate
```

A returning enrolled user reaches their **exact last-watched second of video** in **1 click** from the homepage "تابع من حيث توقفت" rail, in **1 click** from the dashboard's "تابع الآن" priority slot (see `08-dashboard-ux.md` §4), or **2 clicks** via the dashboard's full "دوراتي" list if it isn't the top-priority item.

---

## 2. Reaching the Course Landing Page

Discovery, filtering, sorting, and the course-card component itself are specified once — shared with scholarships — in `02b-unified-catalog.md`:

- Catalog layout, type-switch, and contextual filters → `02b-unified-catalog.md` §2
- The course card's exact anatomy (mode 3.2 of the shared adaptive card) → `02b-unified-catalog.md` §3.2
- Sorting for courses: "الأكثر شيوعًا" (most popular) default for logged-out users, "موصى بها لك" (recommended) for logged-in users via simple category-tag matching against their enrolled courses — no ML required for v1. Full sort-control spec → `02b-unified-catalog.md` §2.4.
- Empty-filter-result handling → same friendly never-a-dead-end pattern used platform-wide (`02-homepage-ux.md` §2.4).

Everything from §3 onward covers what happens once a student has landed on one specific course's page.

---

## 3. Course Landing Page

This is the "convince me" page — it must answer, in one screen without scrolling much: *what will I learn, how long will it take, who teaches it, is it free, what do I get at the end.*

### 3.1 Anatomy (top to bottom)
1. **Breadcrumb**: الرئيسية / الدورات / [المجال] / [اسم الدورة] — RTL-correct arrow direction.
2. **Header block**: course title (`display-lg`), one-line value statement, instructor mini-profile (avatar, name, credential line), rating + enrolled-count stats, level + language + category badges.
3. **Primary action panel** (sticky on desktop, right-side/start-side column; inline card on mobile): price or "مجاني," **single primary CTA "التسجيل في الدورة"** (or "استمر" + progress % if already enrolled), secondary "أضف للمفضلة" icon button, and a compact syllabus stat line ("14 درسًا · 6 ساعات · شهادة عند الإتمام · اختبار شامل").
4. **"ماذا ستتعلم"** — 4-6 bullet outcomes, scannable, icon-prefixed.
5. **Full curriculum accordion**: expandable list of modules → lessons, each lesson row shows title, duration, and a lock/checkmark/play-icon state (locked if not enrolled, checkmark if completed, play if next-up). **Locked lessons are still visible (title + duration), never hidden** — transparency about full scope builds trust and mirrors Codecademy's syllabus-preview pattern.
6. **Weekly live session info card**: distinct visually (icon: video/calendar), states "جلسة مباشرة أسبوعية عبر Google Meet لمراجعة الدروس" with next session's date/time if enrolled, and clarifies it happens *regardless of enrollment timing* (recorded content is self-paced, live sessions are calendar-bound — this distinction is called out explicitly to avoid confusion).
7. **Comprehensive exam callout**: brief card noting an exam exists at course completion, what it unlocks (certificate), pass threshold — sets expectations early rather than surprising the student later.
8. **Instructor bio** (expanded).
9. **Reviews/ratings** (if applicable — v1 can ship without this and add later).
10. **Related courses** rail (same card grammar, filtered by same المجال tag).

### 3.2 Enrollment interaction
- Tapping primary CTA on a free course: instant enroll (no modal friction) → toast confirmation → CTA becomes "استمر" → auto-scrolls to curriculum section highlighting lesson 1.
- Tapping primary CTA on a paid course: opens payment sheet/modal (payment flow is out of scope for this design-system pass but the *entry point* is this single CTA — no separate "buy" vs "learn more" split-button confusion).
- **Click count from homepage: catalog (1) → landing page (2) → enroll+land on lesson 1 (3).** From a direct rail-card tap on the homepage, it's landing page (1) → enroll (2) → lesson (2, same screen transition). Within budget either way.

---

## 4. Course Player

This is the core "study session" screen — used far more than any other screen in the product, so it earns the most restrained, focused chrome.

### 4.1 Layout (desktop)
```
┌─────────────────────────────────────────────────────────┐
│  ← عودة للدورة        اسم الدورة        [التقدم: 43%]     │
├───────────────────────────────────┬───────────────────────┤
│                                     │  مسار الدورة (list)   │
│         مشغل الفيديو                │  ✓ الدرس 1            │
│         (16:9, controls)           │  ▶ الدرس 2 (نشط)      │
│                                     │  🔒 الدرس 3           │
├─────────────────────────────────────┤  ...                 │
│ [الدرس] [حلّ المسائل] [الجلسة المباشرة] [الاختبار الشامل]  │  الحية) │
│                                     │                       │
│  محتوى التبويب النشط هنا             │                       │
└───────────────────────────────────┴───────────────────────┘
```
- **Left column (start-side, right in RTL)**: video player + tab bar for that lesson's related content.
- **Right column (end-side, left in RTL) — wait, correct for RTL**: actually, per §8 mirroring rules, the **lesson list/sidebar sits on the visual right, video sits center-left**, since RTL reading order means the "main content" still reads start-to-end but navigational lists conventionally anchor to the starting edge. *(Flag for dev: mirror Codecademy's LTR pattern exactly, i.e. sidebar-right/content-left in RTL, which is the natural RTL mirror of their sidebar-left/content-right LTR layout.)*
- Mobile: video pinned top (sticky while scrolling tab content below it, shrinks to a small persistent mini-player if user scrolls deep into a written problem/tab), tabs below as a horizontal scroll, lesson list becomes a slide-up drawer accessed by a "المسار" button.

### 4.2 Video lesson behavior
- Supports rewatching freely — no "watched" lock, progress bar shows a subtle secondary marker for "furthest point reached" vs. current scrub position, since the brief explicitly calls out rewatching as a designed behavior, not an edge case.
- Playback speed control (0.75x–2x), captions toggle (Arabic captions expected as standard, not an accessibility afterthought given full-Arabic platform).
- Auto-advances to "حل المسائل" tab prompt (non-blocking toast: "أنهيت الدرس! جاهز لحل المسائل؟") when video completes — encourages the intended recorded→practice loop without forcing it.

### 4.3 Tabs within a lesson

**Tab 1 — الدرس (Lesson):** the video + a short text summary/key-points list beneath it (useful for rewatch-free review before problems).

**Tab 2 — حل المسائل (Solve Problems):** the per-lesson problem set. See `04-quiz-exam-system-ux.md` §2 for the quiz-engine mechanics shared by this and comprehensive exams. Problems here are lower-stakes, unlimited attempts, immediate feedback, explicitly framed as practice not evaluation.

**Tab 3 — الجلسة المباشرة (Live Session):** shows the current module's weekly Google Meet session:
- If upcoming: date/time (localized, with a "أضف للتقويم" calendar-file download/link), a prominent "join" button that activates (changes from disabled/muted style to `gradient-gold` primary CTA with `elev-glow-gold`) only within a window (e.g., 10 minutes before start) to avoid dead early clicks.
- If in progress: "🔴 مباشر الآن" live badge, CTA reads "انضم الآن" and is always active.
- If past: shows a note "انتهت الجلسة" plus — if the instructor uploads a recording link — a "شاهد التسجيل" secondary action. (If recordings aren't part of v1 scope, simply state the session occurred and point to next week's session.)
- This tab is intentionally *not* an embedded video call (Google Meet is external per the brief) — it's a well-designed **launchpad**, not a re-implementation of Meet.

**Tab 4 — الاختبار الشامل (Comprehensive Exam):** locked (visually present, disabled state) until all module lessons + their problem sets are completed; unlocks with a small celebratory state change (icon transitions from lock to unlocked, `elev-glow-gold` pulse once). Full mechanics in `04-quiz-exam-system-ux.md` §3.

### 4.4 Progress & completion
- Course-level progress % is a weighted combination of (lessons watched + problem sets attempted + exam passed) — exact weighting is a product decision, but the UI always shows a single unified percentage to avoid cognitive overload from multiple progress bars.
- On 100% completion + exam pass: a **Completion/Certificate screen** — full-screen celebratory moment (this is where the "precious gold" motion/color rules get to shine: confetti-adjacent but tasteful, `gradient-gold` burst, certificate preview with student name + course name + date, download-as-PDF and share-to-social actions.

---

## 5. Dashboard integration ("لوحتي")

Full dashboard spec — including the "دوراتي" (My Courses) list, the "تابع الآن" priority slot, and how it decides what's most relevant to resume — now lives in `08-dashboard-ux.md`. The one point worth repeating here: from the dashboard, a row tap on any enrolled course **resumes its exact last-watched position directly in the Course Player, no landing page detour** (landing pages exist for pre-enrollment discovery only). See `08-dashboard-ux.md` §5 for the full list layout, sort/filter controls, and §13 for the click-count audit.

---

## 6. Edge cases & states to design for

| Case | Handling |
|---|---|
| User's device/connection can't handle video | Provide a "جودة الفيديو" quality selector (auto/360p/720p/1080p) directly in player controls |
| Live session Google Meet link not yet added by instructor | Tab shows "سيتم إضافة رابط الجلسة قريبًا" placeholder, never a broken/empty tab |
| Course has no live session component (self-paced-only course type) | Tab 3 is simply omitted from that course's tab bar — don't show a permanently-disabled tab, that's confusing dead weight |
| Student fails comprehensive exam | See `04-quiz-exam-system-ux.md` §3.4 for retry logic; player tab shows attempt count + best score, not a hard block |
| Free-to-paid course tier changes mid-enrollment | Out of scope for this pass — flag for product/business-logic discussion, not a pure UX decision |
