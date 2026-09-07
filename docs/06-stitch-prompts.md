# Khawarizm Academy — Google Stitch Prompts

> **How Stitch works, and why this file is structured this way:** Stitch generates up to **6 screens per batch** and works best when you start broad (one foundational/style-setting prompt) then refine screen-by-screen or in small batches, rather than describing the entire app in one giant prompt. So: run **Prompt 0 (Foundation)** first to lock the visual language, then run each numbered batch below as a separate follow-up prompt in the *same* Stitch project so it inherits the established style. Don't paste all batches into one message.

---

## Prompt 0 — Foundation / Style-Setting (run this first, alone)

```
Design a mobile-first, RIGHT-TO-LEFT (RTL), Arabic-language UI for "أكاديمية خوارزم" (Khawarizm Academy), an online education platform. This is critical: the entire interface must be built for Arabic RTL reading order — mirror all navigation, icons, arrows, progress bars, and layout direction accordingly. Do not default to LTR.

VISUAL STYLE — avoid generic AI/SaaS design clichés. No purple or violet anywhere. No flat white cards on white background. Theme: "dark space observatory meets ancient scholarly knowledge meets modern technology." Deep navy space background with a subtle sense of stars/cosmos, warm gold accents like candlelight on old manuscripts, and clean modern tech-blue highlights for interactive elements.

COLOR PALETTE (use exactly these hex values):
- Page background: #040F24 (near-black navy)
- Primary surface / nav / hero background: #061A3A
- Card / secondary surface background: #092557
- Elevated / hover surface: #123168
- Borders/dividers on dark: #1B3F80
- Primary text on dark: #DCE5EE
- Secondary/muted text on dark: #8299B5
- Tech accent (links, focus states, "courses" pillar identity): #167BDB to #29A9FF (gradient)
- Primary accent / CTAs / "scholarships" pillar identity: #C88A32 to #E5B65C (gradient, gold)
- Success: #3FAE6B | Warning/deadline: #E0A23B | Danger: #D9534F

Primary buttons use the gold gradient with dark navy (#040F24) text for contrast. Secondary buttons are transparent with a 1px tech-blue border. Only use gold for ONE primary action per screen — it must feel precious and rare, not everywhere.

TYPOGRAPHY: Use "Cairo" or "IBM Plex Sans Arabic" for headings (bold, geometric, modern), and "Tajawal" for body text. Generous line-height for Arabic readability (1.5-1.6 for body text). Numbers, dates, prices, and countdown timers use Latin numerals (0-9), left-to-right, even inside RTL sentences — this is standard and correct for Arabic UI.

SHAPE LANGUAGE: Rounded corners throughout (12px cards, 20px modals, fully rounded pill buttons and search bars) — no sharp corners. Subtle glow-based elevation instead of standard drop shadows, since shadows barely show on dark backgrounds — use soft colored glows (blue glow for interactive/focused elements, gold glow for primary CTAs and achievement moments) instead of gray shadows.

ICONOGRAPHY: Clean line icons, 1.5-2px stroke weight, rounded caps, no filled/solid icon style except for special achievement/certificate moments. Two icon moods: geometric/circuit-line icons for technology and courses content, and classical/scholarly icons (open book, column, compass, star) for scholarships and heritage-related content.

MOTIF: Include a very subtle, low-opacity large-scale geometric line-art motif reminiscent of an astrolabe or a domed archway silhouette in hero/background areas — never inside dense functional UI like forms or tables, only in spacious background areas and empty states.

Generate a design system starter screen showing: color swatches, button states (primary/secondary/ghost/disabled), a sample content card, a sample input field, and typography scale — all using the above rules, in Arabic RTL, as a single reference screen.
```

---

## Batch 1 — Core Navigation + Homepage (up to 6 screens)

```
Continuing in the same visual style and RTL Arabic layout established previously, generate the following screens for "أكاديمية خوارزم":

1. HOMEPAGE (mobile): Sticky header with logo on the right (RTL start) and a menu/account icon on the left. Below it, a hero section with a bold Arabic headline about learning skills and finding scholarships, and directly below the headline, a large pill-shaped smart search bar (rounded-full, dark navy fill, tech-blue border, glowing on focus) with a small 3-option toggle chip inside it for "الكل" / "دورة" / "منحة" (All / Course / Scholarship), with "الكل" shown as the default active state, a text input with placeholder "ماذا تبحث عنه؟", and a small compass/astrolabe icon as the search action on the far side. Below the hero, a full-width gold-gradient announcement banner for an active competition with a countdown timer and "سجّل الآن" button. Below that, two clearly-labeled section headers stacked vertically — "الدورات المميزة" (Featured Courses) and "المنح والفرص المتاحة" (Available Scholarships) — each followed by a horizontally-scrolling row of 3 content cards. Both sections must look EQUALLY important — same header style, same card size, same visual weight, do not make one bigger or more prominent than the other. Course cards use a blue-gradient accent bar under the thumbnail; scholarship cards use a gold-gradient accent bar. Below both rows, a wide-aspect-ratio "الفعاليات والندوات" (Events) card strip, visually distinct — larger single image with overlaid text, like an editorial announcement, not a small content card. Bottom navigation bar with 5 icons: الرئيسية، الدورات، المنح، لوحتي، حسابي.

2. HOMEPAGE (desktop): Same content and hierarchy as the mobile homepage, but in a wide desktop layout — full top navigation bar with all links visible (الرئيسية، الدورات، المنح والفرص، الفعاليات، المسابقات) plus the smart search bar centered in the hero, and the "Featured Courses" / "Available Scholarships" sections shown as two equal-width side-by-side columns rather than stacked.

3. UNIFIED CATALOG — COURSES VIEW (mobile): At the very top, a 3-segment pill toggle control reading "الكل" / "الدورات" / "المنح والفرص" with "الدورات" shown as the active/selected segment (filled with the tech-blue gradient). Below it, a compact search-within-results bar, then a horizontal scrollable filter-chip row (المستوى، المجال، اللغة، السعر). Below that, a filterable grid of course cards (2 columns). Each course card shows a thumbnail with a play-icon overlay and a thin blue-gradient accent bar under the thumbnail, a category badge, course title, instructor name, duration and lesson count, a level badge, and a price or "مجاني" tag.

4. UNIFIED CATALOG — MIXED "الكل" VIEW (mobile): The exact same screen structure as the previous one, but now the 3-segment toggle shows "الكل" as the active/selected segment, and the card grid below shows an interleaved mix of course cards (blue accent bar) and scholarship cards (gold accent bar) appearing together in the same grid — some cards should show a provider name, small flag icons for eligible countries, and a prominent gold/amber deadline countdown chip instead of a duration/lesson-count line (these are the scholarship cards), while still sharing the exact same card size, corner radius, and layout structure as the course cards next to them. Include a small, quiet line of text at the bottom of each scholarship card only: "إعلان فقط" (announcement only).

5. COURSE LANDING PAGE (mobile): Breadcrumb at top, course title and instructor mini-profile, a sticky bottom action bar with a large gold-gradient "التسجيل في الدورة" button and the price, a "ماذا ستتعلم" bullet list section with checkmark icons, and an expandable accordion list of course modules and lessons below — some lessons shown with a small lock icon (not yet unlocked) and some with a play icon.

6. SCHOLARSHIP DETAIL PAGE (mobile): Header with opportunity title, provider name, and a large, prominent deadline countdown. An eligibility-summary card with chip-style tags (country, degree level, field, funding type). A clearly bordered info callout box (blue-bordered, not red/warning-colored) stating that Khawarizm shares this opportunity but does not administer the application process, and that applicants should visit the official provider website. A large gold-gradient "التقديم عبر الموقع الرسمي" button with an external-link icon.
```

---

## Batch 2 — Course Player & Learning Experience (up to 6 screens)

```
Continuing in the same established visual style, generate these screens:

1. COURSE PLAYER — LESSON TAB (mobile): A video player pinned at the top (16:9, with standard playback controls plus a playback-speed selector and captions toggle), a horizontal tab bar just below it with 4 tabs — "الدرس"، "حل المسائل"، "الجلسة المباشرة"، "الاختبار الشامل" — with the first tab active. Below the tabs, a short text summary of key lesson points. A slim progress bar for "the course" sits in the header area. Include a floating or slide-up button labeled "المسار" (path) to reveal the full lesson list.

2. COURSE PLAYER — LESSON LIST DRAWER (mobile): A bottom sheet / slide-up drawer showing a vertical list of all lessons in the course, grouped by module, each row showing a lesson title, duration, and a status icon (checkmark for completed, filled play icon for current, lock icon for locked future lessons), with the current lesson row highlighted with a subtle blue glow.

3. PROBLEM SET / QUIZ QUESTION SCREEN (mobile): A single multiple-choice question shown full-screen, with a slim progress indicator at top ("السؤال 3 من 10"), the question text, four rounded selectable answer options (one shown in a selected/highlighted state with a blue glow border), and a bottom navigation row with "→ السابق" and "التالي ←" buttons (arrows mirrored for RTL, so "next" points left).

4. QUIZ RESULTS SCREEN (mobile): A celebratory results screen showing a large percentage score in a circular gold-gradient progress ring, a pass/fail status badge, a scrollable breakdown list below showing each question with a small correct (green) or incorrect (red) icon, and a primary CTA button appropriate to the outcome (e.g. "احصل على شهادتك" in gold gradient for a pass state).

5. LIVE SESSION TAB (mobile): Shown within the course player's tab area — a calendar-style card showing the next weekly live session's date and time, a "أضف للتقويم" secondary button, and a large CTA button for joining that is shown in a muted/disabled style with text "ستفتح قبل الجلسة بـ 10 دقائق" (opens 10 minutes before), plus a small "🔴 مباشر الآن" live badge variant of the same card shown as an alternate state.

6. CERTIFICATE / COURSE COMPLETION SCREEN (mobile): A full-screen celebratory moment — a decorative gold-gradient burst or glow background, a certificate preview card in the center showing a placeholder student name, course title, and date, with two buttons below: a primary gold "تحميل الشهادة" (download) and a secondary "مشاركة" (share) button.
```

---

## Batch 3 — Competitions & Events (up to 6 screens)

```
Continuing in the same established visual style, generate these screens:

1. COMPETITION DETAIL PAGE (mobile): Similar wide-hero editorial treatment to an event page — large banner image/graphic at top with an overlaid countdown timer, competition title, a short rules/prize description section, a timeline showing registration/start/end dates, and a large gold-gradient "سجّل الآن" button.

2. CODING COMPETITION ARENA (desktop/tablet): A split-screen layout — left/start sidebar showing a numbered list of problems with status icons (solved/in-progress/not started) and a countdown timer for the overall competition, and the main content area showing a problem description at top and a dark-themed monospace code editor below it with syntax highlighting, plus two buttons: "تشغيل الاختبارات" (secondary, blue-bordered) and "إرسال الحل" (primary, gold-gradient).

3. LEADERBOARD SCREEN (mobile): A ranked list of competitors, each row showing rank number, avatar, display name, score, and problems-solved count, with the current user's own row visually pinned/highlighted at the bottom of the screen in a distinct gold-bordered card even if their rank is far down the list.

4. EVENTS PAGE (mobile): A vertical list of wide, editorial-style event cards (each with a large image, date badge overlay, title, and short hook text), grouped under "قادمة" (upcoming) and a collapsed "سابقة" (past) section below.

5. SEARCH RESULTS / GUIDED SEARCH WIZARD (mobile): A full-screen step-by-step guided search flow shown as large tappable chip options — a question at top ("ماذا تريد أن تحقق؟") and 3 large rounded selectable chip buttons stacked vertically below it, styled consistently with the rest of the design system, with a progress indicator (e.g. "1 من 3") at the very top showing this is a short multi-step flow.
```

---

## Batch 4 — Dashboard "لوحتي" (up to 6 screens)

> Based on `08-dashboard-ux.md`. This dashboard is dense enough to deserve its own batch rather than a single screen — generate all of these together so the priority slot, list sections, and secondary surfaces (certificates, notifications) stay visually consistent with each other.

```
Continuing in the same established visual style, generate these screens for the "لوحتي" (My Dashboard) section — this is the LOGGED-IN student's personal home base, distinct from the public homepage:

1. DASHBOARD — MAIN VIEW (mobile): A personalized greeting header ("مرحبًا، [الاسم]") with a notification bell icon (showing a small unread-count badge) in the top corner. Directly below, a horizontally-scrollable row of small stat chips with icons (e.g. "📚 3 دورات نشطة", "🎓 منحتان قريبتا الانتهاء", "🏆 مسابقة مسجّل بها") — compact, text-and-icon only, no large cards. Below that, ONE large, visually elevated priority card that stands out more than anything else on the screen — a soft glow border, larger than all other cards — labeled with a "استمر في [اسم الدورة]" headline, a thumbnail, and a mini progress bar, representing the single most relevant thing for the student to do right now. Below that priority card, a section header "دوراتي" followed by a vertical (not grid) list of 3-4 enrolled course rows, each with a small thumbnail, title, a circular progress ring, and a compact "استمر" button.

2. DASHBOARD — MAIN VIEW, ALTERNATE PRIORITY STATE (mobile): The same screen structure as the previous one, but this time the large priority card shows a live-session-starting-soon state instead — a red "🔴 جلستك المباشرة تبدأ قريبًا" badge, the course name, a countdown to start time, and a prominent "انضم الآن" button in the gold gradient.

3. DASHBOARD — SAVED SCHOLARSHIPS SECTION (mobile): A section of the dashboard (shown as if scrolled further down the same page) with a header "منحي المحفوظة", followed by a vertical list of saved scholarship rows, each showing the provider name, opportunity title, a small bell icon indicating a reminder is set, and a prominent gold/amber deadline countdown chip, with one row showing a red/urgent countdown state for a scholarship closing within 24 hours.

4. DASHBOARD — COMPETITIONS & CERTIFICATES SECTIONS (mobile): Two stacked sections shown together — first "مسابقاتي" with 2-3 rows grouped under small sub-labels "جارية الآن" (with a pulsing live badge) and "مسجّل" (upcoming, with a calendar icon), each row showing the competition name and a context-appropriate button ("ادخل الساحة" or "أضف تذكيرًا"). Below that, a "شهاداتي" section shown as a 2-column grid (breaking from the list pattern used elsewhere) of certificate cards, each with a small gold-foil corner accent, course name, completion date, and a small download icon button.

5. NOTIFICATIONS SCREEN (mobile): A full-screen list accessed via the bell icon — a header "الإشعارات", then a vertical list of notification rows, each with a small icon indicating its type (a calendar icon for a live-session reminder, a graduation-cap icon for an exam-graded notification, a star icon for a new matching scholarship), a one-line message, a relative timestamp ("منذ ساعتين"), and unread notifications shown with a subtle highlighted background and a small blue dot, while read notifications appear more muted.

6. DASHBOARD — FIRST-TIME / EMPTY STATE (mobile): A friendly onboarding version of the dashboard for a brand-new account with nothing enrolled or saved yet — the greeting header remains, but instead of the priority card and course list, show a single centered, spacious module with a welcoming illustration-style icon (in the line-art style established earlier), a headline like "ابدأ رحلتك الأولى", and two large side-by-side buttons: "استكشف الدورات" (blue-gradient bordered) and "استكشف المنح والفرص" (gold-gradient bordered).
```

---

## Tips for using these prompts

1. **Run Prompt 0 alone first.** Let Stitch fully generate and let you review the style before moving to Batch 1 — if the palette or type doesn't land right, correct it here before it propagates into the 24 screens across all four batches.
2. **Screens 3 and 4 in Batch 1 are two states of the same page**, not two different pages — see `02b-unified-catalog.md` for the full unified-catalog spec these screens are based on. If you want additional filter states (e.g., the scholarships-only view) as their own explicit Stitch screen, just re-run a variant of prompt 3 with "الدورات" swapped for "المنح والفرص" as the active segment and the course-specific filter chips swapped for scholarship ones (البلد/الجنسية، المرحلة الدراسية، الجهة المانحة، حالة التقديم).
3. **Run Batch 4 (Dashboard) last, only after Batches 1-3 are generated and approved** — it reuses course cards, scholarship rows, and competition rows whose exact appearance was established earlier, so feeding Stitch that prior context keeps a returning student's dashboard visually identical to how the same items appear in the catalog and detail pages, not a re-invented style.
4. **Stay in the same Stitch project/thread** across all batches so later screens inherit the established style rather than starting fresh each time.
5. If Stitch drifts on RTL mirroring (a common failure point per its defaults), send a short correction prompt like: *"This screen is not correctly mirrored for RTL — the [element] should be on the [side]. Please fix the layout direction, not just the text alignment."*
6. After all batches are generated, do a final consistency pass prompt: *"Review all generated screens for consistent use of the #C88A32-#E5B65C gold gradient (used only once per screen for the single primary action) and the #167BDB-#29A9FF blue gradient (used for tech/course-related accents). Flag and fix any screen where gold is overused."*
7. Treat Stitch's output as **high-fidelity wireframes to hand to a designer/developer**, not final production assets — use `01-design-system.md` as the source of truth for exact values when implementing in code, since Stitch may approximate hex values slightly.
