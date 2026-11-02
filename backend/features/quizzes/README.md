# Quizzes — الاختبارات

The `quizzes` app owns server-graded practice, lesson quizzes, exams, attempts, answers, and extra-attempt grants. It also owns the retained legacy problem-list/check routes so answer-key redaction and grading have one API boundary.

## Models and service boundary

`Quiz`, `Question`, `Option`, `Attempt`, `Answer`, and `AttemptGrant` are the app's durable records. `services.py` owns publication validation, author checks, enrolled learner access, attempt start/resume, selection validation, deadline/grace enforcement, grading, result reveal, attempt grants, aggregate statistics, and overdue expiry. Views resolve requests and call these services; serializers are the only learner answer/result boundary.

Attempt creation checks `quizzes.attempt`, enrollment in a published/archived course, the quiz publication state, unlock progress, and remaining attempts. Question and option UUID order is stored per attempt so reloads preserve the original draw and shuffle. Active payloads include only question/option labels and the learner's `answers`; correctness, explanations, and hints are absent. Finished feedback is emitted only by `result_view` according to `never`, `after_submit`, `after_pass`, or `after_close`.

`save_answers` accepts `{questionId, optionIds}` rows and validates every selected option against its question. The server, not the browser timer, decides when a deadline plus the ten-second grace period has passed. Submission is transactional and idempotent. Multiple-answer partial credit is available only when explicitly enabled on a multiple-choice question.

## Routes

Learner routes are mounted under `/api/` and require an authenticated access token for attempts and checks:

- `GET /courses/<slug>/quizzes` returns published quiz summaries and the caller's attempts-used/remaining, best score, pass state, and lock reason.
- `POST /quizzes/<id>/attempts` starts or resumes one in-progress attempt; `GET /attempts/<id>` reloads it or returns the finished result.
- `PUT /attempts/<id>/answers` saves selections; `POST /attempts/<id>/submit` grades and returns the policy-limited result.
- `POST /questions/<id>/check` and `POST /problems/<problem_id>/check` provide explicit server-side practice feedback.
- `GET /courses/<slug>/problems` and `GET /problems` retain the legacy paths and `{items}` envelope, but never include correct IDs, explanations, or hints. A published course practice quiz takes precedence over the legacy shared problem set.

Authoring routes live under `/api/studio/` and require authentication plus `studio_write` throttling for mutations. Course staff authorization is evaluated by `can_author` and granular `quizzes.*` permissions; result/stat/roster/export reads use `quizzes.results_own` or `quizzes.results_any` with course ownership scope. The API supports course quiz list/create, quiz read/update/delete and publish/unpublish, question create/update/delete/reorder, dry-run/commit import, stats, paged attempt rosters, streamed CSV export, and audited extra-attempt grants. Responses are private/no-store. CSV cells beginning with spreadsheet formula prefixes are escaped.

Deleting a quiz with attempts is rejected; authors should unpublish it instead. Question correctness changes are not copied into historical snapshots: they affect grading of future submissions only, consistent with stored option-id answers.

## Maintenance and verification

`expire_overdue()` grades timed-out attempts with their saved selections after the ten-second grace period. It runs lazily when attempts are accessed and from the existing `cleanup_expired` maintenance job, whose result reports `quizAttemptsExpired`.

Run the domain, learner API, and authoring API tests with:

```bash
cd backend
python manage.py test features.quizzes
```

The backend-wide verification includes Ruff, Django system/migration checks, zero-warning OpenAPI generation, and the complete test suite.
