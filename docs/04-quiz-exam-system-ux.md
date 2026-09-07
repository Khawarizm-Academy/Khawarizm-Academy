# Khawarizm Academy — Quiz, Exam & Coding Competition System

> This is the system the brief asked to be planned "very, very, very well." It covers four related-but-distinct assessment types that share one underlying engine with different configurations. References `01-design-system.md` and `03-course-system-ux.md`.

---

## 1. The four assessment types (one engine, four configurations)

| Type | Stakes | Attempts | Timer | Where it lives |
|---|---|---|---|---|
| **Lesson Problem Set** | Practice only | Unlimited | None | Inside course player, Tab 2 |
| **Comprehensive Exam** | Gatekeeps certificate | Limited (e.g. 2-3, configurable per course) | Yes, fixed duration | Inside course player, Tab 4 |
| **Standalone Quiz** | Engagement/leaderboard, not gatekeeping | Unlimited or limited per quiz config | Optional per quiz | Standalone "الاختبارات" hub, or linked from an announcement |
| **Coding Competition** | Competitive ranking, possible prizes | Single attempt per problem (typical for competitive formats) or best-of-N (configurable) | Yes, competition-wide window | "المسابقات" section, dedicated arena |

Building all four on one configurable engine (rather than four separate systems) is the key architectural recommendation here — it means one question-bank, one grading pipeline, one results UI, with stakes/timer/attempt-count as parameters. This directly simplifies the backend work in `07-backend-notes.md`.

---

## 2. Shared Question Engine

### 2.1 Supported question types (v1)
1. **Multiple choice** (single answer) — auto-graded.
2. **Multiple select** (choose all that apply) — auto-graded.
3. **True/False** — auto-graded.
4. **Short text/numeric answer** — auto-graded via exact-match or tolerance range (good for math-heavy content).
5. **Code submission** — for coding competitions and programming-course problem sets specifically; auto-graded via test-case runner (see §4).

*(Free-text/essay grading is explicitly out of v1 scope — it requires manual instructor review workflows not covered in this pass. Flag as a future phase if needed.)*

### 2.2 Taking a quiz/problem — screen anatomy
```
┌─────────────────────────────────────┐
│ السؤال 3 من 10          ⏱ 04:12     │  ← progress + timer (timer omitted for untimed types)
├─────────────────────────────────────┤
│  نص السؤال هنا...                    │
│                                       │
│  ◯ الخيار الأول                      │
│  ◯ الخيار الثاني                     │
│  ● الخيار الثالث  (selected)         │
│  ◯ الخيار الرابع                     │
│                                       │
│  [💡 تلميح]  (if hints enabled)      │
├─────────────────────────────────────┤
│  ← السابق              التالي →      │  (mirrored per RTL: "next" points left)
└─────────────────────────────────────┘
```
- One question per screen (not a long scrolling form) — keeps focus, matches the "solve, get feedback, move on" learning loop the brief describes.
- Progress dots or a slim progress bar at top, always visible.
- For **practice problem sets**: immediate feedback per question (correct/incorrect shown right after submission, with explanation text) — reinforces learning loop.
- For **comprehensive exams and competitions**: no immediate per-question feedback (all-at-once grading at submission) — preserves exam integrity; explicitly communicated to the student before they start ("لن تظهر النتائج إلا بعد إنهاء الاختبار كاملاً").
- **Flagging**: student can mark a question "للمراجعة" (for review) and jump back via a question-grid overview screen before final submission — standard exam-taking affordance, especially valued for timed comprehensive exams.

### 2.3 Pre-assessment briefing screen (always shown before starting anything timed/high-stakes)
Before entering a comprehensive exam or competition problem, show a briefing card:
- Number of questions, total time, passing threshold (for exams), number of attempts remaining.
- Explicit rules: "لا يمكن مغادرة الصفحة أثناء الاختبار" (can't leave mid-exam) type warnings if applicable.
- A single "ابدأ الاختبار" CTA — this is a deliberate extra click/screen (technically adds to click count) but is a justified exception: informed consent before a timed, limited-attempt, high-stakes action is worth one extra tap.

### 2.4 Results screen
- Score (%), pass/fail state (for exams), correct/incorrect breakdown by question (shown post-submission even for exams, once grading is complete — reviewing mistakes is part of learning, this isn't hidden forever, just deferred until after submission).
- For exams: clear next-step CTA — "احصل على شهادتك" (if passed) or "أعد المحاولة" with attempts-remaining count (if failed and attempts remain) or "تواصل مع الدعم" (if attempts exhausted).
- For competitions: score + current rank + link to live leaderboard.

---

## 3. Comprehensive Exam specifics

### 3.1 Unlock logic
Per `03-course-system-ux.md` §4.3, unlocks only when all module lessons + their problem sets are marked complete. This is enforced, not just suggested — the exam tab stays visually disabled (lock icon, `slate-600` text, no click target) until met.

### 3.2 Timer & integrity
- Fixed duration set per-course by the instructor/admin (config field, not hardcoded).
- Visible countdown timer, `warning-500` color once under 10% of time remains.
- Auto-submit on timer expiry (with a 60-second "الوقت أوشك على الانتهاء" warning toast beforehand).
- Basic integrity measures appropriate for a v1 self-hosted exam (not a proctoring product): disable copy-paste into short-answer fields (deters trivial searching, not a security guarantee), a visible "غادرت الصفحة X مرة" soft-flag logged for instructor visibility (not auto-penalized, just visible) if the student switches tabs — communicated transparently in the briefing screen so it's not a surprise "gotcha."

### 3.3 Passing & certificate trigger
- Instructor-configured pass threshold (e.g., 70%).
- On pass: triggers the Completion/Certificate screen described in `03-course-system-ux.md` §4.4.
- On fail with attempts remaining: encouraging (not punitive) messaging — "لم تصل للحد المطلوب هذه المرة، راجع نقاط الضعف وحاول مجددًا" + a breakdown of which lesson-topics correlated with missed questions, linking back to those specific lessons for review. This is a meaningful UX detail: turn exam failure into a targeted-review action, not a dead end.

### 3.4 Attempts exhausted
- Clear, non-hostile end state: explains attempts are used up, offers a "تواصل مع الدعم" contact path (manual override is a human/support decision, not automated) — never leave the student staring at a permanently-disabled screen with no path forward.

---

## 4. Coding Competitions

### 4.1 Structure
- A competition = one or more coding problems, a start/end window, a leaderboard, optional prizes/announcement text.
- Registration is a separate step from participation (per the brief: "everyone will be able to register") — registering adds the competition to the student's dashboard (see "مسابقاتي" in `08-dashboard-ux.md` §8) and sends a reminder notification as the start time approaches, but does not open the problems early.

### 4.2 Flow
```
Competitions Hub / Homepage banner
        │ (click 1)
        ▼
Competition Detail Page
   — description, rules, prizes, timeline, problem count, difficulty
        │ (click 2: "سجّل الآن")
        ▼
Registered state (button becomes "مسجّل ✓", countdown to start shown)
        │ (at start time, click 3: "ادخل الساحة")
        ▼
Competition Arena
   — problem list (sidebar) + code editor + test-case runner + submit
        │
        ▼
Live Leaderboard (accessible anytime during/after via tab)
```

### 4.3 The Arena screen
```
┌──────────────┬──────────────────────────────────┐
│ قائمة المسائل │  عنوان المسألة                    │
│ ✓ المسألة 1   │  وصف المسألة، أمثلة الإدخال/الإخراج │
│ ▶ المسألة 2   │  ┌────────────────────────────┐   │
│ ○ المسألة 3   │  │  محرر الأكواد (Code Editor)  │   │
│               │  │  (syntax highlighting)      │   │
│ ⏱ الوقت المتبقي│  └────────────────────────────┘   │
│               │  [تشغيل الاختبارات]  [إرسال الحل]  │
└──────────────┴──────────────────────────────────┘
```
- Code editor: monospace font (`IBM Plex Mono` per design system §3.1), line numbers stay LTR even in the RTL shell (universal code-editor convention, don't mirror this).
- Supports selecting a language per problem (if multi-language problems are in scope) via a simple dropdown.
- "تشغيل الاختبارات" (Run tests) — runs against *visible/sample* test cases only, unlimited uses, immediate pass/fail feedback per sample case — lets students debug before committing.
- "إرسال الحل" (Submit) — runs against the *full* hidden test suite, counts as an official attempt, updates the leaderboard. This is the one action gated by the single-attempt-or-best-of-N rule from §1's table.
- A **solution reveal**, per the brief ("the solution will be there") — after the competition window closes (or after a student's final submission for that problem, per your preferred config), a "عرض الحل" tab/button appears showing the reference solution + explanation. This should never be visible before a student has either submitted or the window has closed, to preserve competitive integrity.

### 4.4 Leaderboard
- Standalone tab/page, real-time or near-real-time updated: rank, student name/handle, score, problems-solved count, tiebreaker (e.g., time-to-solve).
- A student's own row is highlighted/sticky (pinned to top or bottom of viewport) so they don't have to scroll to find themselves — a small but high-value UX detail for competitive products.
- Privacy consideration: allow students to compete under a display handle rather than full legal name if desired (a simple profile setting), flagged here for product/privacy sign-off.

---

## 5. Standalone Quizzes Hub ("الاختبارات")

- For quizzes not tied to a specific course lesson — e.g., a general-knowledge quiz announced as its own event, or practice quizzes for exam prep across multiple courses.
- Simple catalog list (title, topic tag, question count, estimated time, attempts allowed), tapping straight into the pre-briefing screen (§2.3) then the question engine (§2.2).
- This hub is intentionally lightweight — it's a secondary/support surface, not a third pillar competing with Courses/Scholarships for homepage real estate. It's reachable via "الدورات" overflow or a footer link, and via direct links from announcements, not a top-level nav item on mobile (per `00-overview.md` §4 nav-shell decision).

---

## 6. Click-count audit for this file

| Path | Clicks |
|---|---|
| Course player → problem set (already inside course) | 0 extra (it's a tab) |
| Course player → comprehensive exam → briefing → start | 1 extra tap (briefing confirm) beyond the tab click — acceptable per §2.3 justification |
| Homepage competition banner → detail → register | 2 clicks |
| Registered competition → arena (on competition day) | 1 click from dashboard/notification — see `08-dashboard-ux.md` §8 and §13 |
| Nav/footer → quizzes hub → briefing → start | 3 clicks (within budget) |
