# VISUAL REFERENCE INDEX — Khawarizm Academy (أكاديمية خوارزم)

> **Phase 01 — Screen Organization & Project Discovery**  
> Comprehensive Visual Reference Index connecting all 55 Figma screenshot exports to their page contexts, viewport configurations, visible sections, reusable component patterns, and UI states.

---

## 1. Duplicate & Near-Duplicate Analysis (Step 7)

Our pixel-level visual analysis identified several key relationships across the 55 exports:

### 1.1 True State Duplicates (Different States of the Same Screen)
1. **Authentication Desktop — Default vs Returning User:**
   * **Files:** `desktop-login.png` [S30] vs `desktop-welcome-back.png` [S31]
   * **Dimensions:** 5120x3200 (16:10 @2x)
   * **Finding:** Both screens share the exact identical background, layout, and right-column marketing art. The left-column authentication card reflects two distinct interaction states:
     * `desktop-login.png`: Generic/New user login (Google button, Facebook button, Email input field, "متابعة" button).
     * `desktop-welcome-back.png`: Recognized returning user ("Welcome Back" state) displaying student avatar, name ("أحمد الغامدي - طالب متميز"), quick OAuth re-login, and "استخدام بريد إلكتروني آخر" switch account link.

2. **Course Problem Set Mobile — Active Question vs Submitted Correct Feedback:**
   * **Files:** `problem-set-quiz.png` [S47] vs `problem-set-practice.png` [S46]
   * **Dimensions:** 1560x3376 (390x844 @4x)
   * **Finding:** Both represent the same problem set question screen ("ما هو الناتج الصحيح لتنفيذ الكود البرمجي التالي؟"):
     * `problem-set-quiz.png`: Pre-submission active state with option B highlighted, glowing "التالي" button, no feedback.
     * `problem-set-practice.png`: Post-submission feedback state displaying green explanation callout box ("إجابة صحيحة! أحسنت..."), checkmark badge, and "💡 تلميح للمسألة" link.

### 1.2 Near-Duplicates & Design Iterations
3. **Course Player Desktop — Navbar Hover / Highlight Variation:**
   * **Files:** `Course path desktop.png` [S03] vs `Course player desktop.png` [S04]
   * **Dimensions:** 5760x4096 (1440x1024 @4x)
   * **Finding:** 100% pixel-identical everywhere below y=252px. The only difference is in the top navbar links (y=0 to 252px), where one shows a subtle brightness/hover highlight on the header brand and navigation elements.

4. **Assessment Results Mobile — Iteration Variants:**
   * **Files:** `quiz-results.png` [S50] vs `exam-results-pass.png` [S37]
   * **Dimensions:** 1560x3376 (390x844 @4x)
   * **Finding:** Nearly identical layout (circular 87% score ring, pass banner, 3-question summary, primary CTA). The difference is icon styling:
     * `quiz-results.png`: Circular outline icons with checkmarks/crosses (`✓`/`✗`), ribbon icon on CTA.
     * `exam-results-pass.png`: Solid green/red dot status indicators, graduation cap icon (`🎓`) on CTA.

5. **Problem Set Desktop — Course-Tied vs Standalone Daily Challenge:**
   * **Files:** `Problem set desktop.png` [S09] vs `problem-set-practice-desktop.png` [S45]
   * **Dimensions:** S09 is 5760x4096; S45 is 5880x4156
   * **Finding:** Both present the same Python `range(1, 4)` code question. However:
     * S09 has a course-specific context ("أساسيات البرمجة بلغة بايثون - الدرس 5") and a right sidebar showing the course syllabus drawer.
     * S45 has a competition/practice context ("تحدي البرمجة اليومي - دورة بايثون المتقدمة") with a left sidebar showing a 5-problem challenge list and points counter (35/100).

---

## 2. Detected UI States Summary (Step 8)

| State Category | Visual Evidence in Screenshots | Associated Files / Screens |
| :--- | :--- | :--- |
| **Default / Resting** | Standard unhovered cards, inactive tabs, default form inputs | S05, S06, S11, S12, S13, S14, S24, S25 |
| **Active / In-Progress** | Timers actively counting down, question progress bars advancing, active code editor cursor | S02, S16, S34, S35, S47 |
| **Hover-like / Focus** | Blue glow on active input field borders, glowing CTA drop-glows | S08, S30, S47, S52, S54 |
| **Selected** | Blue-bordered radio options in quizzes, active segment pill highlights | S09, S11, S13, S34, S35, S47 |
| **Disabled / Locked** | Padlock icons on unreached lessons, muted button style with countdown restriction text | S07, S42, S43, S48, S54 |
| **Expanded** | Unfolded module list in syllabus drawer, open user profile menu dropdown | S08, S42 |
| **Collapsed** | Closed syllabus drawer in mobile player, collapsed user dropdown | S08, S17 |
| **Modal / Drawer / Sheet** | Darkened backdrop scrim with elevated card or slide-up bottom drawer | S38, S39, S42, S54 |
| **Error / Danger** | Red circular error badges (`✗`), urgent deadline chips (<24 hours) | S10, S28, S29, S50, S54 |
| **Empty State** | Spacious central motif, zero enrolled items, dual exploration CTAs | S20, S21, S54 |
| **Success / Passed Feedback** | Congratulatory banners, green checkmarks, completion certificates | S01, S10, S15, S36, S37, S45, S46 |

---

## 3. Repeated Visual Patterns & Shared Components (Step 9)

| Pattern / Component | Visual Description | Screen Occurrences |
| :--- | :--- | :--- |
| **Desktop Top Navbar** | Sticky navy-900 bar, brand logo (right/RTL), main links, search icon, notifications bell, user avatar / CTA | S01, S02, S03, S04, S05, S07, S08, S09, S10, S11, S13, S18, S20, S22, S24, S26, S28, S32, S34, S36, S38, S40, S45, S48, S52, S55 |
| **Mobile Bottom Tab Bar** | Fixed bottom 5-icon bar: الرئيسية، الدورات، المنح، لوحتي، حسابي with active tab glow | S06, S08, S12, S14, S15, S16, S17, S19, S21, S23, S25, S27, S29, S33, S35, S37, S41, S43, S44, S46, S47, S49, S50, S55 |
| **Smart Search Box** | Pill-shaped search bar with internal 3-segment toggle (الكل / دورة / منحة), text input, astrolabe compass icon | S05, S06, S11, S12, S13, S14, S52, S54 |
| **Adaptive Content Card** | 16:9 thumbnail, category badge, title, instructor/provider meta, price/deadline, blue/gold accent strip | S05, S06, S11, S12, S13, S14, S54 |
| **Primary Gold CTA Button** | Fully rounded pill or radius-md button with gold gradient fill (`#C88A32 → #E5B65C`) and dark navy text | Appears on almost every screen for the primary action |
| **Secondary Button** | Transparent background with 1px tech-blue border (`#29A9FF`) and electric blue text | S01, S02, S07, S09, S15, S16, S20, S21, S34, S36, S40, S45, S52 |
| **Circular Progress Ring** | Circular SVG/canvas ring with percentage indicator inside, color-coded to progress/grade | S10, S18, S22, S24, S25, S36, S37, S50, S54 |
| **Course Syllabus Drawer / Sidebar** | Module accordion list with lesson titles, durations, checkmarks, active play icon, and lock icons | S03, S04, S07, S09, S17, S42, S53 |
| **Question Multiple-Choice Option** | Full-width rounded card with Arabic letter prefix (أ، ب، ج، د), selectable blue glow border | S09, S34, S35, S45, S46, S47, S53 |
| **Review Grid Node Network** | 5x5 grid of numbered circular badges indicating question answer status (answered, current, flagged, pending) | S38, S39, S51, S53 |
| **Urgency / Deadline Badge** | Pill chip displaying remaining time; color scales from blue (weeks) to amber (days) to red (<24 hours) | S05, S06, S11, S12, S28, S29, S54 |
| **Competition Banner Strip** | High-contrast gold announcement banner with countdown timer and "سجّل الآن" CTA | S05, S06, S54 |

---

## 4. Comprehensive Visual Reference Index (All 55 Screenshots)

### S01 — Certificate completion desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Certificate completion desktop.png`
* **Page:** Course Completion / Certificate
* **Viewport / Device:** Desktop (5760x4096, 1440x1024 @4x)
* **Important Visible Sections:** Top navbar; Congratulatory header; Two stat blocks (24 completed lessons, 87% exam score); Action buttons ("تحميل الشهادة PDF", "مشاركة الشهادة"); Framed illuminated graduation certificate with Arabic calligraphy, student name, and seal.
* **Potential Shared Components:** Navbar, Primary Gold Button, Secondary Bordered Button, Stat Metric Card, Certificate Card.
* **Possible States:** Success / Celebration State.
* **Notes:** Full-page celebration layout matching `03-course-system-ux.md` §4.4.
* **Confidence Level:** High.

### S02 — Code-Write-Quiz-Desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Code-Write-Quiz-Desktop.png`
* **Page:** Coding Competition Arena
* **Viewport / Device:** Desktop / Tablet Landscape (5760x4932, 1.17:1 ratio)
* **Important Visible Sections:** Top competition header with live timer (01:23:45); Split layout; Left: problem statement, I/O examples, constraints, Monaco/VS Code-style dark code editor (Python 3.10), test case runner table; Right sidebar: problem index (problems 1 to 5), score widget (35/100), withdrawal button.
* **Potential Shared Components:** Navbar, Code Editor, Test Case Runner, Problem Navigation Sidebar, Primary Gold Button, Secondary Blue Button.
* **Possible States:** Active / In-Progress, Tests Passing State.
* **Notes:** High-fidelity coding environment specified in `04-quiz-exam-system-ux.md` §4.
* **Confidence Level:** High.

### S03 — Course path desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Course path desktop.png`
* **Page:** Course Player — Lesson View
* **Viewport / Device:** Desktop (5760x4096, 1440x1024 @4x)
* **Important Visible Sections:** Top navbar (hover/active state variation); Course header breadcrumb; Overall progress indicator (43%); 16:9 video player container; Horizontal lesson tabs (الدرس، حل المسائل، جلسة مباشرة، الاختبار الشامل); Right sidebar with course syllabus.
* **Potential Shared Components:** Navbar, Video Player, Tab Bar, Course Syllabus Sidebar, Circular Progress Ring.
* **Possible States:** Active Lesson View, Tab 1 Active, Navbar Highlighted.
* **Notes:** Near-duplicate of S04; differs only in top navbar element lighting/hover state.
* **Confidence Level:** High.

### S04 — Course player desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Course player desktop.png`
* **Page:** Course Player — Lesson View
* **Viewport / Device:** Desktop (5760x4096, 1440x1024 @4x)
* **Important Visible Sections:** Top navbar (default state); Course breadcrumb ("عودة إلى صفحة الدورة"); Progress badge (43%); 16:9 video player area; Tab navigation; Right syllabus sidebar.
* **Potential Shared Components:** Navbar, Video Player, Tab Navigation, Syllabus Sidebar.
* **Possible States:** Active Lesson View, Default Navbar.
* **Notes:** Baseline desktop player screen from `03-course-system-ux.md` §4.
* **Confidence Level:** High.

### S05 — Homepage - Desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Homepage - Desktop.png`
* **Page:** Homepage
* **Viewport / Device:** Desktop (5240x8076, 1310 wide @4x long page)
* **Important Visible Sections:** Top navbar; Hero section with cosmic astrolabe motif, headline, and Smart Search Box; Active Competition high-contrast gold banner; Twin Pillar Rails (Featured Courses on start-side, Available Scholarships on end-side); Events & Seminars editorial strip; 3-step "How Platform Works" section; Instagram Reels download utility teaser; Multi-column footer.
* **Potential Shared Components:** Navbar, Smart Search Box, Competition Banner Strip, Course Card, Scholarship Card, Event Strip Card, Section Header, Footer.
* **Possible States:** Default / Public Browse State.
* **Notes:** Complete desktop homepage implementing `02-homepage-ux.md` specs and the strict 50/50 twin-rail parity mandate.
* **Confidence Level:** High.

### S06 — Homepage - Mobile.png
* **File Path:** `Khawarizm Academy Platfrom Design/Homepage - Mobile.png`
* **Page:** Homepage
* **Viewport / Device:** Mobile (1720x6524, 430 wide @4x long page)
* **Important Visible Sections:** Mobile header with logo and drawer trigger; Mobile hero with embedded search box; Full-width gold competition announcement strip; Stacked twin rails (Courses rail followed by Scholarships rail); Events strip; How It Works steps; Instagram download teaser; Footer; 5-icon bottom navigation bar.
* **Potential Shared Components:** Mobile Header, Mobile Bottom Nav, Smart Search Box, Competition Banner, Adaptive Card, Footer.
* **Possible States:** Default / Public Mobile Browse State.
* **Notes:** Mobile counterpart to S05.
* **Confidence Level:** High.

### S07 — Live session desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Live session desktop.png`
* **Page:** Course Player — Live Session Tab
* **Viewport / Device:** Desktop (5880x4172, 1470x1043 @4x)
* **Important Visible Sections:** Top navbar; Course breadcrumb & progress; Tab bar with Tab 3 ("جلسة مباشرة") selected; Left: "تحدي المطورين الأسبوعي" card with live pulsing dot and gold "انضم للجلسة الآن" CTA; "الجلسة القادمة المجدولة" card with calendar info and disabled countdown notice; Right: Course syllabus sidebar.
* **Potential Shared Components:** Navbar, Course Player Tab Bar, Live Session Card, Syllabus Sidebar, Primary Button, Secondary Button.
* **Possible States:** Live Now State + Scheduled State (simultaneously displayed).
* **Notes:** Launchpad for weekly Google Meet live sessions as specified in `03-course-system-ux.md` §4.3.
* **Confidence Level:** High.

### S08 — Navbar System — All States.png
* **File Path:** `Khawarizm Academy Platfrom Design/Navbar System — All States.png`
* **Page:** Design System — Navigation Component Specification
* **Viewport / Device:** Component Reference Board (8760x5628)
* **Important Visible Sections:** Desktop Guest Navbar; Desktop Member Navbar with open User Menu dropdown; Mobile Header Guest; Mobile Header Member; Mobile Navigation Drawer (Guest with Google/Facebook auth); Mobile Navigation Drawer (Member with profile); Mobile Bottom Tab Bar.
* **Potential Shared Components:** Desktop Navbar, Mobile Header, Mobile Drawer, User Dropdown Menu, Bottom Nav Bar.
* **Possible States:** Guest, Authenticated, Dropdown Open, Drawer Open, Active Tab.
* **Notes:** Master visual blueprint for all header and navigation states across the app.
* **Confidence Level:** High.

### S09 — Problem set desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Problem set desktop.png`
* **Page:** Course Player — Problem Set (Active Question)
* **Viewport / Device:** Desktop (5760x4096, 1440x1024 @4x)
* **Important Visible Sections:** Top navbar; Breadcrumb and course progress; Question card with code snippet; 4 multiple-choice options with option B selected; Right syllabus drawer sidebar; "السابق" and "التالي" action buttons.
* **Potential Shared Components:** Navbar, Question Card, Code Snippet Box, Radio Option Button, Syllabus Sidebar, Nav Buttons.
* **Possible States:** Active Question, Selected (Pre-Submission).
* **Notes:** Practice problem set within the course player context.
* **Confidence Level:** High.

### S10 — Quiz results desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/Quiz results desktop.png`
* **Page:** Lesson Quiz Results
* **Viewport / Device:** Desktop (5760x4096, 1440x1024 @4x)
* **Important Visible Sections:** Top navbar; Breadcrumbs; Left card: 87% circular score ring, pass badge, "احصل على شهادتك" gold CTA; Right card: Question-by-question review (questions 1-3 shown with green/red status tags), 7/8 score summary note.
* **Potential Shared Components:** Navbar, Circular Score Ring, Result Card, Question Review Row, Primary Gold Button.
* **Possible States:** Passed / Success Outcome.
* **Notes:** Desktop outcome screen for lesson-level assessments.
* **Confidence Level:** High.

### S11 — catalog-all-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/catalog-all-desktop.png`
* **Page:** Unified Catalog — Mixed ("الكل") Feed
* **Viewport / Device:** Desktop (5240x5212, 1310 wide @4x long page)
* **Important Visible Sections:** Top navbar; Page header ("دليل المعرفة والمنح الدولية"); Smart search box with 3-segment toggle ("الكل" active); Sorting dropdown; Right: Contextual filter sidebar (Field, Degree, Language, Price, Country, Status); Center: 2-column mixed grid interleaving Course and Scholarship cards; Pagination (1, 2, 3); Footer.
* **Potential Shared Components:** Navbar, Smart Search Box, Segment Toggle, Filter Panel, Adaptive Course Card, Adaptive Scholarship Card, Pagination, Footer.
* **Possible States:** Mixed Feed, Filter Active, Default Sort.
* **Notes:** Primary implementation of the unified catalog architecture (`02b-unified-catalog.md`).
* **Confidence Level:** High.

### S12 — catalog-all-mobile.png
* **File Path:** `Khawarizm Academy Platfrom Design/catalog-all-mobile.png`
* **Page:** Unified Catalog — Mixed ("الكل") Feed
* **Viewport / Device:** Mobile (1720x6988, 430 wide @4x long page)
* **Important Visible Sections:** Mobile header; Type-switch segmented control ("الكل" selected); Search input; Filter trigger button; Single-column feed of mixed Course and Scholarship cards; Pagination controls; Mobile bottom navigation bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Segment Toggle, Adaptive Cards, Pagination.
* **Possible States:** Mixed Feed Mobile View.
* **Notes:** Mobile counterpart to S11.
* **Confidence Level:** High.

### S13 — catalog-courses-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/catalog-courses-desktop.png`
* **Page:** Unified Catalog — Courses Pre-Filtered
* **Viewport / Device:** Desktop (5240x4308, 1310 wide @4x long page)
* **Important Visible Sections:** Top navbar; Header title; Search box with "الدورات" segment active; Course-specific filter sidebar (level: beginner/intermediate/advanced, category, language, pricing); 2-column grid of pure course cards; Pagination; Footer.
* **Potential Shared Components:** Navbar, Smart Search Box, Filter Sidebar, Course Card, Pagination, Footer.
* **Possible States:** Filtered by Type = Course.
* **Notes:** Desktop course discovery catalog.
* **Confidence Level:** High.

### S14 — catalog-courses-mobile.png
* **File Path:** `Khawarizm Academy Platfrom Design/catalog-courses-mobile.png`
* **Page:** Unified Catalog — Courses Pre-Filtered
* **Viewport / Device:** Mobile (1720x6824, 430 wide @4x long page)
* **Important Visible Sections:** Mobile header; Segment toggle ("الدورات" active); Search bar; Filter sheet trigger; 1-column list of course cards; Pagination; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Course Card, Segment Toggle.
* **Possible States:** Filtered by Type = Course on Mobile.
* **Notes:** Mobile counterpart to S13.
* **Confidence Level:** High.

### S15 — certificate-completion.png
* **File Path:** `Khawarizm Academy Platfrom Design/certificate-completion.png`
* **Page:** Course Completion / Certificate
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with back arrow; "شهادة التخرج والإنجاز"; Celebratory confetti/ribbon icon; Congratulatory headline; Centered landscape certificate card preview with student name, course name, issue date, and validation code; Primary "تحميل الشهادة PDF" button; Secondary "مشاركة مع الأصدقاء" button; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Certificate Card, Primary Gold Button, Secondary Button.
* **Possible States:** Celebratory / Success State.
* **Notes:** Mobile celebratory graduation screen.
* **Confidence Level:** High.

### S16 — code-write-quiz-mobile.png
* **File Path:** `Khawarizm Academy Platfrom Design/code-write-quiz-mobile.png`
* **Page:** Coding Competition Arena
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Competition header with live badge & countdown (01:23:45); Horizontal problem selector chips (مسألة 1, مسألة 2, etc.); Problem description and I/O; Segmented tabs (محرر الأكواد / حالات الاختبار); Dark monospace code editor with syntax highlighting; Score bar (35/100); Bottom action bar with "تشغيل الاختبارات" and "إرسال الحل والاعتماد"; Bottom nav bar.
* **Potential Shared Components:** Live Countdown Chip, Monospace Editor, Problem Selector Tabs, Primary Gold Button, Secondary Button, Bottom Nav.
* **Possible States:** In-Progress Competition Screen.
* **Notes:** Mobile responsive adaptation of the coding arena.
* **Confidence Level:** High.

### S17 — course-player-lesson.png
* **File Path:** `Khawarizm Academy Platfrom Design/course-player-lesson.png`
* **Page:** Course Player — Lesson Tab
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Pinned 16:9 video player at top with playback controls; 4 horizontal tabs (الدرس، حل المسائل، جلسة مباشرة، الاختبار); Lesson summary notes; Floating "المسار" button for syllabus drawer; Bottom nav bar.
* **Potential Shared Components:** Video Player, Course Player Tab Bar, Floating Action Button, Bottom Nav.
* **Possible States:** Tab 1 Active, Video Paused/Playing.
* **Notes:** Mobile core study session screen.
* **Confidence Level:** High.

### S18 — dashboard-competitions-certificates-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-competitions-certificates-desktop.png`
* **Page:** Dashboard — Competitions & Certificates Section
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Top search/nav; Left stats column; Center: "إنجازاتي وتحدياتي" section with enrolled competitions list ("مسابقاتي وتحدياتي") and certificate cards with download buttons ("شهاداتي المكتملة"); Right navigation sidebar.
* **Potential Shared Components:** Navbar, Dashboard Sidebar, Competition List Row, Certificate Download Card, Metric Widgets.
* **Possible States:** Active Competitions & Earned Certificates View.
* **Notes:** Retrieval surface for student achievements (`08-dashboard-ux.md` §8).
* **Confidence Level:** High.

### S19 — dashboard-competitions-certificates.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-competitions-certificates.png`
* **Page:** Dashboard — Competitions & Certificates Section
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with bell icon (badge 5); Title "إنجازاتي وتحدياتي"; "مسابقاتي" vertical list with status buttons ("ادخل الساحة", "أضف تذكيرًا", "عرض التفاصيل"); "شهاداتي المكتملة" 2x2 grid with "تحميل الشهادة" buttons; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Competition Row, Certificate Grid Card, Badge.
* **Possible States:** Enrolled/Active View on Mobile.
* **Notes:** Mobile counterpart to S18.
* **Confidence Level:** High.

### S20 — dashboard-empty-state-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-empty-state-desktop.png`
* **Page:** Dashboard — Empty / Onboarding State
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Right sidebar navigation; Center spacious onboarding card: astrolabe target icon, welcoming headline ("مرحبًا بك يا سارة، ابدئي رحلتك الأولى اليوم!"), explanatory text, and side-by-side twin discovery buttons ("استكشفي الدورات المميزة" & "استكشفي المنح والفرص").
* **Potential Shared Components:** Dashboard Sidebar, Empty State Module, Dual Discovery CTAs.
* **Possible States:** First-Time User / Zero Enrolled Items State.
* **Notes:** First-time user onboarding surface (`08-dashboard-ux.md` §4.1).
* **Confidence Level:** High.

### S21 — dashboard-empty-state.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-empty-state.png`
* **Page:** Dashboard — Empty / Onboarding State
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header ("مرحبًا، سارة"); Empty-state icon; Onboarding card ("ابدأ رحلتك الأولى"); Stacked discovery buttons ("استكشف الدورات المميزة" & "استكشف المنح والفرص"); Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Empty State Container, Primary Buttons.
* **Possible States:** Zero Enrolled Mobile State.
* **Notes:** Mobile counterpart to S20.
* **Confidence Level:** High.

### S22 — dashboard-live-session-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-live-session-desktop.png`
* **Page:** Dashboard — Live Session Priority State
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Right navigation sidebar; Top stat chips; Large "Continue Now" slot dynamically elevated for an imminent live session ("جلستك المباشرة تبدأ قريبًا") with 14:03 countdown timer and gold "انضم الآن للجلسة" CTA; Left stats and upcoming deadlines column; Bottom "بقية دوراتك لليوم" list.
* **Potential Shared Components:** Dashboard Sidebar, Priority Hero Card, Countdown Timer, Enrolled Course Row, Stat Widgets.
* **Possible States:** Imminent Live Session State (Highest Priority Urgency).
* **Notes:** Illustrates the priority slot override logic from `08-dashboard-ux.md` §4.1.
* **Confidence Level:** High.

### S23 — dashboard-live-session.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-live-session.png`
* **Page:** Dashboard — Live Session Priority State
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with bell badge; Elevated priority card showing live session countdown (14:03), course title ("برمجة بايثون للمبتدئين"), instructor name, and "انضم الآن للجلسة" gold CTA; Vertical list of other enrolled courses with progress rings; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Priority Slot Card, Enrolled Course Row.
* **Possible States:** Imminent Live Session Priority State on Mobile.
* **Notes:** Mobile counterpart to S22.
* **Confidence Level:** High.

### S24 — dashboard-main-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-main-desktop.png`
* **Page:** Dashboard — Main Enrolled State
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Right navigation sidebar; Header greeting ("مرحبًا، أحمد"); Stat chips strip; Large "Continue Now" priority card for current course ("أساسيات الذكاء الاصطناعي وتعلم الآلة", 40% complete) with "استمر في التعلم" CTA; Left column with attendance stats, GPA, and upcoming submission dates; Main area with "دوراتي الحالية" list (UI/UX 75%, Python 20%, AI 40%).
* **Potential Shared Components:** Dashboard Sidebar, Priority Hero Card, Enrolled Course Row, Stat Widgets.
* **Possible States:** Default Enrolled / Course Progress State.
* **Notes:** Standard desktop logged-in home base (`08-dashboard-ux.md`).
* **Confidence Level:** High.

### S25 — dashboard-main.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-main.png`
* **Page:** Dashboard — Main Enrolled State
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header greeting; Unread bell badge (5); Horizontal stat chips; Prominent "Continue Now" card (40% progress bar); "دوراتي الحالية" section with 3 enrolled course rows featuring circular progress indicators and "استمر" buttons; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Priority Card, Course Progress Row, Circular Ring.
* **Possible States:** Standard Enrolled Mobile State.
* **Notes:** Mobile counterpart to S24.
* **Confidence Level:** High.

### S26 — dashboard-notifications-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-notifications-desktop.png`
* **Page:** Dashboard — Notifications Center
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Right sidebar navigation; Top header with search and user avatar; Notifications hub card: "مركز الإشعارات", unread count ("لديك 3 تنبيهات جديدة غير مقروءة"), "تحديد الكل كمقروء" button; 6 notification rows (3 unread with blue indicator dots, 3 read) covering live sessions, matching scholarships, exams, competitions, and lessons.
* **Potential Shared Components:** Dashboard Sidebar, Notification Row, Unread Dot Indicator, Contextual Icon Badges.
* **Possible States:** Notifications Center View with Unread and Read Items.
* **Notes:** Full desktop notification management hub (`08-dashboard-ux.md` §2).
* **Confidence Level:** High.

### S27 — dashboard-notifications.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-notifications.png`
* **Page:** Dashboard — Notifications Center
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile top bar with back navigation arrow and title "الإشعارات"; 6 vertical notification cards with type icons (bell, ribbon, book, trophy), relative timestamps, and unread indicator dots; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Notification Card.
* **Possible States:** Notifications List on Mobile.
* **Notes:** Mobile counterpart to S26.
* **Confidence Level:** High.

### S28 — dashboard-saved-scholarships-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-saved-scholarships-desktop.png`
* **Page:** Dashboard — Saved Scholarships Section
* **Viewport / Device:** Desktop (5760x4600, 1440x1150 @4x)
* **Important Visible Sections:** Right sidebar navigation; Left stats column; Center: "لوحتي المحفوظة"; Sub-segment pill switch ("المنح المحفوظة" active, "الدورات المفضلة"); 4 saved scholarship rows with remove/unsave button and color-coded deadline badges ("باقي 18 ساعة" urgent red, "باقي 5 أيام" amber, "باقي 12 يوم", "باقي 24 يوم").
* **Potential Shared Components:** Dashboard Sidebar, Sub-Segment Switch, Saved Item Row, Deadline Urgency Badge, Metric Widgets.
* **Possible States:** Saved Scholarships View with Mixed Urgency States.
* **Notes:** Retrieval surface for saved opportunities (`08-dashboard-ux.md` §6).
* **Confidence Level:** High.

### S29 — dashboard-saved-scholarships.png
* **File Path:** `Khawarizm Academy Platfrom Design/dashboard-saved-scholarships.png`
* **Page:** Dashboard — Saved Scholarships Section
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with bell badge (5); Sub-tabs for Saved Scholarships vs Favorite Courses; 4 saved scholarship cards with delete/remove button and deadline chips; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Sub-Tabs, Saved Scholarship Card, Urgency Chip.
* **Possible States:** Saved Scholarships Mobile View.
* **Notes:** Mobile counterpart to S28.
* **Confidence Level:** High.

### S30 — desktop-login.png
* **File Path:** `Khawarizm Academy Platfrom Design/desktop-login.png`
* **Page:** Authentication — Login
* **Viewport / Device:** Desktop (5120x3200, 2560x1600 @2x, 16:10 ratio)
* **Important Visible Sections:** Split-screen layout; Left: Authentication card ("مرحبًا بك في خوارزم", Google OAuth button, Facebook OAuth button, divider, Email input field with icon, gold "متابعة" CTA, terms of service disclaimer); Right: Cosmic hero graphic with Khawarizm logo, astrolabe orbit, bold Arabic tagline, and SSL security trust badge.
* **Potential Shared Components:** OAuth Social Buttons, Form Input, Primary Gold CTA, Brand Astrolabe Graphic, Trust Badge.
* **Possible States:** Default / New User Login State.
* **Notes:** Desktop entry point for authentication.
* **Confidence Level:** High.

### S31 — desktop-welcome-back.png
* **File Path:** `Khawarizm Academy Platfrom Design/desktop-welcome-back.png`
* **Page:** Authentication — Login (Returning User)
* **Viewport / Device:** Desktop (5120x3200, 2560x1600 @2x, 16:10 ratio)
* **Important Visible Sections:** Split-screen layout identical to S30; Left: Authentication card personalized for returning user: circular illuminated student avatar, name ("أحمد الغامدي - طالب متميز"), single-tap "متابعة تسجيل الدخول مع Google", "متابعة تسجيل الدخول مع Facebook", and text link "استخدام بريد إلكتروني آخر"; Right: Brand hero graphics.
* **Potential Shared Components:** User Avatar Badge, OAuth Social Buttons, Text Link CTA, Hero Graphic.
* **Possible States:** Recognized Returning User ("Welcome Back") State.
* **Notes:** Alternate UI state of S30 for returning visitors.
* **Confidence Level:** High.

### S32 — exam-briefing-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-briefing-desktop.png`
* **Page:** Comprehensive Exam — Pre-Start Briefing
* **Viewport / Device:** Desktop (5880x4156, 1470x1039 @4x)
* **Important Visible Sections:** Top navbar; Central modal card: ribbon badge icon, title ("الاختبار النهائي — أساسيات البرمجة بلغة بايثون"), parameter grid (25 questions, 45 minutes, 70% passing threshold, 2 of 3 attempts remaining), integrity rules warning callout, gold "ابدأ الاختبار" primary CTA.
* **Potential Shared Components:** Navbar, Modal Card, Exam Parameter Pill Chips, Rules Warning Box, Primary Gold CTA.
* **Possible States:** Pre-Assessment Briefing / Consent State.
* **Notes:** Informed consent gate before timed high-stakes exam (`04-quiz-exam-system-ux.md` §2.3).
* **Confidence Level:** High.

### S33 — exam-briefing.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-briefing.png`
* **Page:** Comprehensive Exam — Pre-Start Briefing
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with back arrow; "الاختبار التقييمي"; Ribbon icon; Course title; Exam parameter rows (questions, duration, pass score, attempts remaining); Rules warning callout; Large "ابدأ الاختبار" CTA; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Parameter List, Warning Box, Primary Gold CTA.
* **Possible States:** Pre-Assessment Briefing on Mobile.
* **Notes:** Mobile counterpart to S32.
* **Confidence Level:** High.

### S34 — exam-in-progress-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-in-progress-desktop.png`
* **Page:** Comprehensive Exam — Question View
* **Viewport / Device:** Desktop (5880x4156, 1470x1039 @4x)
* **Important Visible Sections:** Top navbar; Countdown timer badge (04:32); Exam title; Progress indicator ("السؤال 7 من 25"); Question card with flag for review indicator ("تم وضع علامة للمراجعة"); 4 multiple-choice options (Tuple option selected with blue highlight); Actions: "السابق", "عرض خريطة الأسئلة" (opens review grid), and "التالي".
* **Potential Shared Components:** Navbar, Timer Badge, Progress Bar, Flag Indicator, Radio Option Card, Secondary Button, Primary Gold Button.
* **Possible States:** Active Question, Selected Option, Flagged for Review.
* **Notes:** Desktop exam taking interface (`04-quiz-exam-system-ux.md` §2.2).
* **Confidence Level:** High.

### S35 — exam-in-progress.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-in-progress.png`
* **Page:** Comprehensive Exam — Question View
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Top bar with countdown timer (04:12), "الاختبار التقييمي", flag icon, progress bar (Q7 of 25); Question text; 4 answer options (option C selected); "السابق" and "التالي" bottom buttons; Floating action button (grid icon) to toggle review sheet; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Timer Badge, Progress Bar, Answer Options, Floating Grid Button, Bottom Nav.
* **Possible States:** Active Question In Progress on Mobile.
* **Notes:** Mobile counterpart to S34.
* **Confidence Level:** High.

### S36 — exam-results-pass-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-results-pass-desktop.png`
* **Page:** Comprehensive Exam — Results (Pass State)
* **Viewport / Device:** Desktop (5880x4664, 1470x1166 @4x)
* **Important Visible Sections:** Top navbar; Central card: circular 87% score ring, pass badge ("مكتمل بنجاح"), congratulatory text ("أحسنت! لقد اجتزت الاختبار بنجاح - لقد تجاوزت النسبة المطلوبة (75%)"); Detailed question breakdown (questions 1-5 shown with green/red status tags, 22/25 total score); Dual CTAs: "مراجعة تفصيلية للإجابات" and "احصل على شهادتك".
* **Potential Shared Components:** Navbar, Circular Score Ring, Result Card, Question Breakdown Row, Primary Gold CTA, Secondary Button.
* **Possible States:** Passed Exam State (Score ≥ Pass Threshold).
* **Notes:** Triggers certificate unlock flow (`04-quiz-exam-system-ux.md` §2.4, 3.3).
* **Confidence Level:** High.

### S37 — exam-results-pass.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-results-pass.png`
* **Page:** Comprehensive Exam — Results (Pass State)
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header; Circular 87% score ring; Pass badge; Congratulatory message; 3 question breakdown rows with solid dot status indicators; 7/8 score summary note; Gold "احصل على شهادتك" CTA with graduation cap icon; "مراجعة تفصيلية للإجابات" link; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Score Ring, Result Card, Primary Gold CTA.
* **Possible States:** Passed Mobile Exam Outcome.
* **Notes:** Mobile counterpart to S36. Design iteration of S50.
* **Confidence Level:** High.

### S38 — exam-review-grid-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-review-grid-desktop.png`
* **Page:** Comprehensive Exam — Question Review Grid Modal
* **Viewport / Device:** Desktop (5880x4156, 1470x1039 @4x)
* **Important Visible Sections:** Top navbar; Dimmed background; Centered review card ("مراجعة الأسئلة وتدقيق الأجوبة"); 5x5 network of 25 numbered circles showing multi-state color coding (answered gold, current blue, flagged red dot, unanswered navy); State legend; Stats summary (2 flagged, 6 answered of 25); Primary gold CTA "متابعة الاختبار".
* **Potential Shared Components:** Navbar, Modal Card, Question Node Matrix, State Legend, Primary Button.
* **Possible States:** Modal Open / Question Review State.
* **Notes:** Standard exam affordance allowing jump-navigation before final submission (`04-quiz-exam-system-ux.md` §2.2).
* **Confidence Level:** High.

### S39 — exam-review-grid.png
* **File Path:** `Khawarizm Academy Platfrom Design/exam-review-grid.png`
* **Page:** Comprehensive Exam — Question Review Grid Drawer
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile drawer / bottom sheet over dimmed question view; Drawer handle; Title "مراجعة الأسئلة"; Timer badge (04:12); 25 numbered circles with state indicators; Legend; Summary stats ("2 معلّم للمراجعة - تمت الإجابة على 6 من 25 سؤال"); Gold "متابعة الاختبار" button.
* **Potential Shared Components:** Bottom Sheet Drawer, Question Node Matrix, Legend, Primary Button.
* **Possible States:** Drawer Open Overlay State.
* **Notes:** Mobile counterpart to S38.
* **Confidence Level:** High.

### S40 — leaderboard-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/leaderboard-desktop.png`
* **Page:** Coding Competition — Leaderboard
* **Viewport / Device:** Desktop (5880x4432, 1470x1108 @4x)
* **Important Visible Sections:** Top navbar; Page header ("لوحة المتصدرين - تحدي الخوارزميات السنوي"); Left card: competition stats (time remaining 14d 6h, 1420 participants, 64.5 avg score, qualification note); Center: Top 3 podium with avatars and medals (1st Sara Ahmed 98 pts, 2nd Omar Khaled 92 pts, 3rd Yasser Fahd 89 pts); Ranked competitor list (ranks 4-7); Gold-bordered pinned current user row at bottom ("أحمد محمد العلي - المركز 12 - 35 نقطة").
* **Potential Shared Components:** Navbar, Competition Stats Card, Top 3 Podium, Ranked Competitor Row, Pinned User Card.
* **Possible States:** Active Competition Leaderboard View.
* **Notes:** Competitive ranking screen specified in `04-quiz-exam-system-ux.md` §4.
* **Confidence Level:** High.

### S41 — leaderboard-mobile.png
* **File Path:** `Khawarizm Academy Platfrom Design/leaderboard-mobile.png`
* **Page:** Coding Competition — Leaderboard
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with back button; Title "لوحة المتصدرين"; Sub-tabs ("المتصدرين" active vs "الإحصائيات"); Crown icon; Top 3 podium with avatars and score tags; Ranked list cards with rank number, name, points, and problems-solved count; Pinned current user card at bottom with gold border; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Podium Widget, Ranked Competitor Row, Pinned User Card.
* **Possible States:** Mobile Leaderboard View.
* **Notes:** Mobile counterpart to S40.
* **Confidence Level:** High.

### S42 — lesson-list-drawer.png
* **File Path:** `Khawarizm Academy Platfrom Design/lesson-list-drawer.png`
* **Page:** Course Player — Lesson Syllabus Drawer
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Dark scrim backdrop over video player; Slide-up bottom sheet with grab handle; Close icon (x); Header "منهج الدورة التدريبية"; Module 1 with completed checkmarks (Lesson 1 08:15, Lesson 2 12:40); Module 2 with active lesson highlighted with blue glow border and play icon (Lesson 5 10:00) and locked future lesson (Lesson 6 15:20 with lock icon).
* **Potential Shared Components:** Bottom Sheet Drawer, Module Accordion Header, Lesson Row with State Icons (Checkmark, Play, Lock).
* **Possible States:** Drawer Open, Mixed Lesson States (Completed, Active, Locked).
* **Notes:** Mobile slide-up drawer accessed via floating "المسار" button (`03-course-system-ux.md` §4.1).
* **Confidence Level:** High.

### S43 — live-session-tab.png
* **File Path:** `Khawarizm Academy Platfrom Design/live-session-tab.png`
* **Page:** Course Player — Live Session Tab
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Video archive placeholder icon at top; Horizontal tab bar with Tab 3 ("جلسة مباشرة") selected; "تحدي المطورين الأسبوعي" card with pulsing live dot, instructor name, and gold "انضم للجلسة الآن" CTA; "الجلسة القادمة المجدولة" card with date, time, secondary "أضف للتقويم" button, and disabled countdown notice; Bottom nav bar.
* **Potential Shared Components:** Course Player Tab Bar, Live Session Card, Primary Button, Secondary Button, Bottom Nav.
* **Possible States:** Live Now State + Scheduled State on Mobile.
* **Notes:** Mobile counterpart to S07.
* **Confidence Level:** High.

### S44 — mobile-login.png
* **File Path:** `Khawarizm Academy Platfrom Design/mobile-login.png`
* **Page:** Authentication — Login
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Top centered Khawarizm brand seal/logo; Tagline "تعلّم مهارة، أو اعثر على منحتك القادمة"; Centered card container: "مرحبًا بك - سجّل دخولك للمتابعة والوصول للدروس"; Google OAuth button; Facebook OAuth button; Divider ("أو"); Email input field with icon; Gold "متابعة" primary button; Bottom terms and privacy agreement notice.
* **Potential Shared Components:** Brand Seal, Social Login Buttons, Form Input, Primary Gold CTA.
* **Possible States:** Default Mobile Login View.
* **Notes:** Mobile counterpart to S30.
* **Confidence Level:** High.

### S45 — problem-set-practice-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/problem-set-practice-desktop.png`
* **Page:** Coding Practice / Daily Challenge (Feedback State)
* **Viewport / Device:** Desktop (5880x4156, 1470x1039 @4x)
* **Important Visible Sections:** Top navbar; Header "تحدي البرمجة اليومي - دورة بايثون المتقدمة - حل المسائل والتمارين"; Left sidebar: challenge problem list (5 problems with difficulty badges and solved checkmarks), score widget (35/100); Center: question statement, Python code snippet, 4 radio options with option B marked correct with checkmark, green feedback banner with detailed code explanation, "💡 تلميح للمسألة" button, "السابق" and "التالي" action buttons.
* **Potential Shared Components:** Navbar, Problem List Sidebar, Question Card, Code Snippet Box, Success Feedback Banner, Nav Buttons.
* **Possible States:** Submitted Correct / Feedback State.
* **Notes:** Daily challenge practice mode with immediate auto-graded explanation (`04-quiz-exam-system-ux.md` §2.2).
* **Confidence Level:** High.

### S46 — problem-set-practice.png
* **File Path:** `Khawarizm Academy Platfrom Design/problem-set-practice.png`
* **Page:** Course Player — Problem Set (Submitted Feedback)
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with back button; "حل المسائل والتمارين"; Progress ("السؤال 3 من 10"); Question text; Python code snippet; 4 answer options with option B marked correct; "💡 تلميح للمسألة" link; Green explanation feedback box; "السابق" and "التالي" buttons; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Question Card, Feedback Box, Nav Buttons.
* **Possible States:** Submitted / Correct Feedback State.
* **Notes:** Mobile practice feedback state. Alternate state of S47.
* **Confidence Level:** High.

### S47 — problem-set-quiz.png
* **File Path:** `Khawarizm Academy Platfrom Design/problem-set-quiz.png`
* **Page:** Course Player — Problem Set (Active Question)
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header; "حل المسائل والتمارين"; Progress indicator; Question text; Python code snippet; 4 answer options with option B selected with blue highlight/radio check; Glowing gold "التالي" CTA; "السابق" button; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Question Card, Answer Options, Primary Gold Button.
* **Possible States:** Active Question / Selected State (Pre-Submission).
* **Notes:** Mobile practice pre-submission state. Alternate state of S46.
* **Confidence Level:** High.

### S48 — quiz-hub-desktop.png
* **File Path:** `Khawarizm Academy Platfrom Design/quiz-hub-desktop.png`
* **Page:** Quizzes & Challenges Hub
* **Viewport / Device:** Desktop (5880x4156, 1470x1039 @4x)
* **Important Visible Sections:** Top navbar; Page header ("الاختبارات والتحديات - قيّم مستواك البرمجي واجمع النقاط لتأمين منح وشهادات"); Category filter chips (الكل، برمجة بايثون، رياضيات، علوم البيانات، هندسة البرمجيات); Sort dropdown; 3x2 grid of quiz cards (Python basics, Data structures, Matrix analysis, Full-stack web, Linear algebra, SQL intro) with duration, question count, attempt limits, and "ابدأ الآن" / "مكتمل" buttons.
* **Potential Shared Components:** Navbar, Category Filter Chips, Sort Dropdown, Quiz Card, Primary Button, Status Badge.
* **Possible States:** Hub Browse View, Mixed Quiz States (Available, In-Progress, Completed).
* **Notes:** Standalone entry point for open assessments (`04-quiz-exam-system-ux.md` §1).
* **Confidence Level:** High.

### S49 — quiz-hub.png
* **File Path:** `Khawarizm Academy Platfrom Design/quiz-hub.png`
* **Page:** Quizzes & Challenges Hub
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header with logo and back arrow; "الاختبارات والتحديات"; Subheading "اختبارات متاحة"; Horizontal category filter chips; Vertical list of quiz cards with category badges, duration, question count, attempt limits, and status badges; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Category Filter Chips, Quiz List Card.
* **Possible States:** Mobile Hub Browse View.
* **Notes:** Mobile counterpart to S48.
* **Confidence Level:** High.

### S50 — quiz-results.png
* **File Path:** `Khawarizm Academy Platfrom Design/quiz-results.png`
* **Page:** Lesson Quiz Results
* **Viewport / Device:** Mobile (1560x3376, 390x844 @4x)
* **Important Visible Sections:** Mobile header; "نتيجة الاختبار التقييمي"; Circular score ring (87%); Pass badge ("مكتمل بنجاح"); Congratulatory headline; 3 question breakdown rows with circular check/cross status icons; 7/8 score summary note; Gold "احصل على شهادتك" CTA with ribbon icon; "مراجعة تفصيلية للإجابات" link; Bottom nav bar.
* **Potential Shared Components:** Mobile Header, Bottom Nav, Score Ring, Result Card, Primary Gold Button.
* **Possible States:** Passed Lesson Quiz Outcome.
* **Notes:** Mobile counterpart to S10. Design iteration of S37.
* **Confidence Level:** High.

### S51 — صفحات الاختبارات و المسابقات.png
* **File Path:** `Khawarizm Academy Platfrom Design/صفحات الاختبارات و المسابقات.png`
* **Page:** Assessment & Competition Flow Board
* **Viewport / Device:** Figma Canvas Panoramic Strip (18696x1339, 13.96:1 ratio)
* **Important Visible Sections:** Continuous horizontal Figma artboard strip lining up the complete assessment journey side-by-side: Quiz Hub → Briefing Screen → In-Progress Question Screen → Review Grid Sheet → Results Screen → Coding Arena → Leaderboard.
* **Potential Shared Components:** Canvas Overview of all assessment components.
* **Possible States:** Multi-screen Journey Mapping.
* **Notes:** Figma overview board; not a single standalone runtime UI screen.
* **Confidence Level:** High.

### S52 — مرجع النظام التصميمي — الأساسيات.png
* **File Path:** `Khawarizm Academy Platfrom Design/مرجع النظام التصميمي — الأساسيات.png`
* **Page:** Design System — Foundations Specification
* **Viewport / Device:** Figma Canvas Master Spec Sheet (7200x17196)
* **Important Visible Sections:**
  * 01 Colors & Palette: Core Navy (navy-600 to navy-950), Accents & Semantics (danger, warning, success, gold-400/600, blue-400/500), Typography & UI text colors, Gradient Strips.
  * 02 Shadows & Elevations: elev-0 (flat), elev-1 (card resting), elev-2 (active/hover), Gold glow, Blue glow.
  * 03 Typography Scale: Tajawal and IBM Plex Sans Arabic type scale from display-xl down to caption with Arabic sample copy.
  * 04 Button Components: Primary gold, Secondary blue-bordered, Ghost, Icon buttons.
  * 05 Input & Search Components: Standard text inputs (default, focused, error), Smart Search Box anatomy.
  * 06 Navigation Elements: Desktop top navbar, Mobile bottom tab bar.
  * 07 Radii & Spacing: Corner radii scale (radius-sm 4px, radius-md 12px, radius-lg 20px, radius-full), Spacing scale (XXS 4px to XXXL 64px).
* **Potential Shared Components:** Foundation Design Tokens Source of Truth.
* **Possible States:** Token & Component States Matrix.
* **Notes:** Master design tokens and foundations reference sheet exported from Figma.
* **Confidence Level:** High.

### S53 — مرجع النظام التصميمي — الأنماط والشاشات.png
* **File Path:** `Khawarizm Academy Platfrom Design/مرجع النظام التصميمي — الأنماط والشاشات.png`
* **Page:** Design System — Patterns & Screen Templates
* **Viewport / Device:** Figma Canvas Master Spec Sheet (7200x23200)
* **Important Visible Sections:**
  * 01 Iconography Style & States: Line icon rules (1.5-2px stroke), tech vs scholarly icon themes, interaction states.
  * 02 Course Player Interface: Scrubber player controls, lesson tab bar, syllabus drawer list.
  * 03 Assessment & Quiz Engine: Question taker layout, countdown timer, briefing card, circular score ring.
  * 04 Programming Competition Arena: Split layout, Monaco code editor, test case results, live leaderboard snippet.
  * 05 Dashboard Hub Assemblies: Priority slot variations, enrolled course rows, live session card, saved scholarships.
  * 06 Adaptive & Responsive Layouts: Desktop (1280px+) vs Mobile (<768px) breakpoint layout mapping.
  * 07 RTL & Mirroring Mechanics: Progress bar direction, directional arrow flipping, breadcrumb flows, Bidi text handling.
* **Potential Shared Components:** Composite Screen Templates & Structural Layout Rules.
* **Possible States:** Template Assemblies.
* **Notes:** Comprehensive screen pattern guidelines exported from Figma.
* **Confidence Level:** High.

### S54 — مرجع النظام التصميمي — المكونات.png
* **File Path:** `Khawarizm Academy Platfrom Design/مرجع النظام التصميمي — المكونات.png`
* **Page:** Design System — Component Library
* **Viewport / Device:** Figma Canvas Master Spec Sheet (7600x20400)
* **Important Visible Sections:**
  * 01 Course Cards: Resting state, Hover state, Enrolled progress (40%) state.
  * 02 Scholarship Cards: Normal gold state, Warning (<7 days) state, Critical (<24h) red urgent state.
  * 03 Editorial Event Cards: Upcoming event, Past event.
  * 04 Competition Announcement Banners: Live now active banner, Registration countdown banner.
  * 05 Badges & Tags: Category, Level, Status, Price, and Pillar badges.
  * 06 Progress Indicators: Circular progress rings (0% to 100%), Linear tracks.
  * 07 Empty States & Skeletons: Empty state illustration, Loading skeleton placeholders.
  * 08 Notifications & Toasts: Bell badge counts, Notification listing rows, System toasts (success, error).
  * 09 Modals & Bottom Sheets: Level test briefing modal, Quick filter sheet.
* **Potential Shared Components:** Production Component Reference.
* **Possible States:** Complete Multi-State Component Matrix.
* **Notes:** Master component specification sheet exported from Figma.
* **Confidence Level:** High.

### S55 — مرجع مكونات التنقل والمصادقة.png
* **File Path:** `Khawarizm Academy Platfrom Design/مرجع مكونات التنقل والمصادقة.png`
* **Page:** Navigation & Auth Component Specification
* **Viewport / Device:** Figma Canvas Spec Sheet (7000x11540)
* **Important Visible Sections:**
  * 01 Desktop Navbar States: NAV-01 Default Guest, NAV-02 Logged-In, NAV-03 User Profile Dropdown Open.
  * 02 Mobile Navigation System: MOB-01 Header Guest, MOB-02 Header Logged-In, MOB-03 Drawer Guest, MOB-04 Drawer Member, MOB-05 Bottom Tab Bar.
  * 03 Buttons & Authentication: Interactive button states, Google & Facebook OAuth buttons.
  * 04 Badges & Status Labels: Categories, Levels, Application status, Price pills.
  * 05 Authentication Screens Preview: AUTH-DSK-01 Desktop Login, AUTH-MOB-01 Mobile Login, AUTH-DSK-02 Welcome Back.
* **Potential Shared Components:** Header, Drawer, Bottom Nav, OAuth Buttons, Auth Cards.
* **Possible States:** Navigation and Authentication State Matrix.
* **Notes:** Specific reference sheet dedicated to navigation architecture and login flows.
* **Confidence Level:** High.
