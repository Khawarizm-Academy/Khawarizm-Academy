# Access Upgrade — Phase 6: Server-graded quizzes and exams (result)

**Branch:** `Feature/Quizzes` → `Feature/AccessStudio`
**Date:** 2026-11-02
**Scope:** server-authoritative quiz/exam lifecycle and grading, learner exam/practice panels, retained legacy problem APIs, Studio quiz APIs, migration and documentation.

## What landed

| Area | Result |
| :--- | :--- |
| Quiz domain and evaluation | Added the `quizzes` Django app and models for quizzes, questions, options, attempts, answers, and extra-attempt grants. Attempt start/resume, server-side autosave, deadline/grace enforcement, expiry grading, idempotent submission, partial credit, reveal policies, enrollment/progress checks, and practice checks are implemented in services. |
| Historical integrity and privacy | Active-attempt payloads omit answer keys and feedback. Attempts snapshot grading threshold and reveal policy; answers snapshot correct option IDs. Historical relations are protected from deletion, and authoring locks evaluation-sensitive settings after attempts exist. Private Studio responses are `no-store`; quiz summary cache keys are user-scoped and the learner-only endpoint is not requested for guests or users without `quizzes.attempt`. |
| Legacy compatibility | Existing `CourseProblem` data and problem routes remain. Learner payloads redact correctness, explanation, and hints; published quiz practice content takes precedence where applicable, while the legacy practice check remains server-graded. The course's old exam configuration remains a display fallback when there is no interactive exam or the viewer cannot take one. |
| Learner experience | Replaced client-side answer checking with server checks and implemented an exam lifecycle with resume, server-synchronized timer, serialized latest-answer saves before submission, deadline auto-submit, result/reveal handling, and attempt availability. |
| Studio API and operations | Added permission-checked quiz CRUD, publish validation, question management, CSV/JSON import with dry-run reporting, attempt roster/stats/export, extra-attempt grants, and throttling. Cleanup expires overdue attempts. Exam-pass and quiz-submitted signals are emitted for later certificate/notification integrations. |
| Documentation and schema | Updated the project profile, feature documentation, API and architecture docs, permission registry, cleanup/throttle contracts, and generated migrations for the quiz app and audit action choices. |

## Verification

| Gate | Result |
| :--- | :--- |
| Backend static/system/schema checks | Ruff format/check passed; Django system check passed; `makemigrations --check --dry-run` found no drift; migrations applied successfully; OpenAPI schema validation passed. |
| Focused backend tests | **98 tests passed** across quizzes, common maintenance, and courses. Tests include grading/reveal behavior, deadline and expiry handling, redaction, attempt access, authoring permissions, safe CSV export/import, policy snapshots, and private response headers. |
| Full backend suite | **676 tests passed; 1 skipped** on a unique temporary SQLite test database (`380.920s`). |
| Frontend `npm test` | **153 tests passed in 22 files.** |
| Frontend `npm run lint` | Pass; no errors or warnings. |
| Frontend `npm run build` | Pass. The main `index` bundle is 91.71 kB gzip. Vite retains its non-blocking advisory for the separately emitted HLS chunk (575.28 kB minified); this is a known lazy playback-engine chunk, not the initial main bundle. |
| `git diff --check` | Pass after adding the closeout note. |

## Scope and limitations

The Phase 6 authoring surface is the API; the dedicated Studio quiz-editor frontend remains in Phase 10 as planned. The backend emits `on_exam_passed` and `on_quiz_submitted` signals, but downstream certificate and notification consumers remain later-phase work. Tests use isolated databases and mocked frontend API seams; no production learner account, production database, or live deployment was used for end-to-end validation.

## Integration closeout

- Feature commit: pending.
- PR and squash-merge commit into `Feature/AccessStudio`: pending.
- Integration-branch merge into `main`: pending.
- GitHub release: pending after the main-branch merge.
