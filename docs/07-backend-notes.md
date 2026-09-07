# Khawarizm Academy — Backend Notes (Entities & Endpoints Implied by the UX)

> This is not a full backend spec — it's a translation layer from the UX files into the data shapes and endpoints your flows require, so nothing gets lost between design and implementation. Treat table/field names as suggestions, not a locked schema.

---

## 1. Core entities

### User
`id, name, display_handle (for competition leaderboards), email, password_hash, avatar_url, level_preference, saved_filters (json), created_at`

### Course
`id, title, slug, description, outcomes (list), instructor_id, category, level (مبتدئ/متوسط/متقدم), language, price (nullable = free), thumbnail_url, has_live_sessions (bool), pass_threshold_pct, exam_max_attempts, status (draft/published/archived)`

### Module
`id, course_id, title, order_index`

### Lesson
`id, module_id, title, video_url, duration_seconds, summary_text, order_index, captions_url`

### LiveSession
`id, course_id (or module_id if per-module), scheduled_at, google_meet_link, status (upcoming/live/ended), recording_url (nullable)`

### Enrollment
`id, user_id, course_id, enrolled_at, progress_pct, status (active/completed), certificate_issued_at (nullable)`

### LessonProgress
`id, enrollment_id, lesson_id, watched_seconds, furthest_point_seconds, completed_bool`

### Question
`id, question_bank_id, type (mcq_single/mcq_multi/true_false/short_answer/code), prompt_text, options (json, for mcq types), correct_answer, explanation_text, hint_text (nullable), difficulty`

### QuestionBank
`id, owner_type (lesson_problem_set / comprehensive_exam / standalone_quiz / competition_problem), owner_id, time_limit_seconds (nullable), max_attempts (nullable = unlimited), pass_threshold_pct (nullable, exams only), shuffle_questions (bool)`

### Attempt
`id, user_id, question_bank_id, started_at, submitted_at, score_pct, passed_bool, answers (json: question_id → submitted_answer + correct_bool), tab_switch_count (integrity soft-flag), status (in_progress/submitted/auto_submitted)`

### CodeSubmission (for coding-competition problems specifically)
`id, attempt_id, question_id, language, source_code, test_results (json: per-test-case pass/fail + runtime), verdict (accepted/wrong_answer/runtime_error/time_limit_exceeded), submitted_at`

### Competition
`id, title, description, rules_text, prize_text, registration_opens_at, starts_at, ends_at, status`

### CompetitionRegistration
`id, user_id, competition_id, registered_at, reminder_opt_in`

### CompetitionProblem
`id, competition_id, question_bank_id (links to QuestionBank of type competition_problem), points, order_index`

### LeaderboardEntry
*(likely a materialized/cached view rather than a raw table, recomputed on each submission)*
`competition_id, user_id, total_score, problems_solved_count, last_submission_at (tiebreaker), rank`

### Scholarship
`id, title, provider_name, provider_logo_url, description, eligibility (json: countries[], degree_levels[], fields[], other_criteria_text), funding_type (full/partial), external_apply_url, deadline_at, status (open/closing_soon/closed — closing_soon is derived, not stored), source_notes (internal — where the team found/verified this posting)`

### SavedScholarship
`id, user_id, scholarship_id, saved_at, reminder_opt_in, reminder_days_before`

### Event
`id, title, description, image_url, format (in_person/online), location_or_link, starts_at, ends_at, requires_rsvp (bool), recap_content (json, nullable, populated after event ends)`

### EventRSVP
`id, user_id (nullable if guest), event_id, name, email, rsvp_at`

### Notification
`id, user_id, type (deadline_reminder/live_session_starting/exam_graded/new_matching_scholarship/competition_reminder), payload (json), read_bool, created_at`

---

## 2. Endpoint groups implied by the UX flows

*(REST-style paths shown for clarity; adapt to GraphQL/RPC as your stack requires.)*

### Unified Catalog (powers both pillars — see `02b-unified-catalog.md`)
- `GET /catalog?type=all|course|scholarship&q=&filters=&sort=` — **the single endpoint behind both the Courses nav entry, the Scholarships nav entry, and the homepage smart search results.** `type=all` returns an interleaved mixed feed (see the ranking note below); `type=course` / `type=scholarship` return single-pillar results. This replaces what would otherwise be two separate `GET /courses` and `GET /scholarships` listing endpoints — both pillars are rows in one underlying queryable set (conceptually a `CatalogItem` view/union over the `Course` and `Scholarship` tables — see the "Data modeling note" below), not two APIs glued together client-side.
- `GET /catalog/filters?type=` — returns which filter dimensions and options to render for the current type segment (§2.2 of `02b-unified-catalog.md`'s contextual filter table can be served from a static config keyed by type, no need for a heavy dynamic-schema system).
- `GET /search/wizard-options` — returns the branching chip options for the homepage guided search wizard (can be a static config response, no need for real-time computation). Note the whole search/catalog layer is **keyword/tag matching, not an LLM endpoint**, per the confirmed scope.

**Data modeling note:** `Course` and `Scholarship` remain fully separate tables (their fields genuinely differ — see §1 below) — unification happens at the **query/serialization layer**, not the data layer. A practical implementation is a lightweight `CatalogItem` read-model (a SQL view, or an application-layer merge of two paginated queries) exposing only the fields the shared adaptive card needs (`id, type, title, thumbnail_url, category_tag, secondary_badge, meta_fields (type-specific), cta_label, cta_target_url`), while `GET /courses/:slug` and `GET /scholarships/:id` (below) still hit the full, type-specific tables for detail-page rendering. This keeps the "one catalog, two full detail templates" split from `02b-unified-catalog.md` §7 clean on the backend too.

**Mixed-feed ranking** (`type=all`): compute a per-item "freshness/urgency score" (courses: recency/trending; scholarships: deadline proximity) and merge-sort across both tables by that score server-side, rather than having the client interleave two separately-fetched lists — this keeps the ranking logic (and any future tuning of it) in one place. See `02b-unified-catalog.md` §4.

### Courses
- `GET /courses/:slug` (landing page data: modules, lessons w/ lock status per current user, instructor, live session info) — note listing/browsing now goes through `GET /catalog?type=course`, not a dedicated courses-listing endpoint.
- `POST /courses/:id/enroll`
- `GET /courses/:id/player-state` (returns current lesson, progress, tab-availability flags — e.g., is the exam tab unlocked)
- `POST /lessons/:id/progress` (heartbeat/update watched_seconds)
- `GET /courses/:id/live-sessions/next`

### Assessments (shared engine per `04-quiz-exam-system-ux.md` §1)
- `GET /question-banks/:id/briefing` (rules, time limit, attempts remaining — powers the pre-assessment briefing screen)
- `POST /question-banks/:id/attempts` (start an attempt)
- `PATCH /attempts/:id` (submit an answer / flag for review / heartbeat for tab-switch tracking)
- `POST /attempts/:id/submit` (final submission → triggers grading)
- `GET /attempts/:id/results` (score breakdown, topic-correlated review links for failed exams per §3.3)

### Coding Competitions
- `GET /competitions` / `GET /competitions/:id`
- `POST /competitions/:id/register`
- `GET /competitions/:id/problems` (only returns full problem content once `starts_at` has passed)
- `POST /code-submissions` (run against sample tests — no attempt consumed)
- `POST /code-submissions/:id/submit` (run against full hidden suite — consumes an attempt, updates leaderboard)
- `GET /competitions/:id/leaderboard` (should support polling or a websocket/SSE channel for near-real-time updates)
- `GET /competitions/:id/solutions/:problem_id` (gated: only after window closes or user's own final submission, per §4.3)

### Scholarships
- `GET /scholarships/:id` (detail page: eligibility, disclaimer content, provider info) — note listing/browsing now goes through `GET /catalog?type=scholarship`, not a dedicated scholarships-listing endpoint.
- `POST /scholarships/:id/save` (+ `reminder_opt_in`)
- Background job: deadline-reminder dispatcher (checks `SavedScholarship.reminder_days_before` against `Scholarship.deadline_at` daily, enqueues `Notification`)

### Events
- `GET /events` (upcoming/past)
- `GET /events/:id`
- `POST /events/:id/rsvp`

### Instagram Downloads
- `POST /ig-downloader/resolve` (accepts a URL, returns preview + available formats) — **flagging again per `05-scholarships-events-ux.md` §4.1: scope this to Khawarizm's own content or content you have redistribution rights to; this is a legal/product decision, not a pure engineering one.**

### Dashboard (full spec: `08-dashboard-ux.md`)
- `GET /me/dashboard/summary` — powers the Quick Summary strip (`08-dashboard-ux.md` §3): cheap counts only (active courses, scholarships closing soon, registered competitions, certificates earned), not full objects — keep this fast since it loads on every dashboard visit.
- `GET /me/dashboard/continue-now` — resolves the single "تابع الآن" priority item per the selection logic in `08-dashboard-ux.md` §4.1 (imminent live session > in-progress exam attempt > most-recently-watched course > urgent scholarship deadline > onboarding prompt if empty). This priority resolution should live server-side, not be recomputed ad-hoc on the client, since the same logic also needs to inform which notifications get sent.
- `GET /me/courses` (enrolled courses with progress, sortable by recency/completion — powers "دوراتي," `08-dashboard-ux.md` §5)
- `GET /me/scholarships/saved` (powers "منحي المحفوظة," §6 — reuses `SavedScholarship` from §1 above)
- `GET /me/live-sessions/upcoming` (aggregates `LiveSession` rows across all of a user's enrollments — powers §7)
- `GET /me/competitions` (registered/live/past, powers "مسابقاتي," §8)
- `GET /me/certificates` (powers "شهاداتي," §9)
- `GET /me/notifications` (powers the bell-icon dropdown/list, §10 — kept as its own endpoint, deliberately not folded into the dashboard aggregate above, since notifications are polled/refreshed far more frequently than the rest of the dashboard)
- `PATCH /me/notifications/:id` (mark read)

Note the shift from a single `GET /me/dashboard` mega-aggregate (an earlier draft's simpler approach) to several smaller endpoints: the dashboard UI now has distinct sections with different refresh cadences (notifications poll often; certificates rarely change), so splitting the endpoints avoids over-fetching and makes each section independently cacheable.

---

## 3. Cross-cutting concerns worth deciding early

- **Recommendation logic** (`02b-unified-catalog.md` §2.4, `03-course-system-ux.md` §2): start with simple tag-overlap matching against enrolled courses; this needs no ML infrastructure for v1 and can be swapped later without changing the UX contract (`GET /catalog?type=course&sort=recommended` stays the same endpoint regardless of what powers it internally).
- **Grading pipeline for code submissions** (§4.3 of the quiz/exam file): requires a sandboxed code execution service (e.g., an isolated container runner) — this is the single largest new piece of infrastructure implied by the brief, distinct from the rest of the (fairly standard CRUD) system.
- **Soft-flag integrity tracking** (tab-switch counts during exams) should be visible to instructors/admins but is explicitly **not** designed to auto-penalize per `04-quiz-exam-system-ux.md` §3.2 — keep this as a reporting field, not a grading input, unless a future product decision changes that.
- **Scholarship data freshness**: since Khawarizm curates rather than owns these listings, plan for an internal admin/CMS flow (not covered in the student-facing UX above) for staff to add/update/archive scholarship postings, including marking them closed even before their stated deadline if the provider pulls the opportunity early.
