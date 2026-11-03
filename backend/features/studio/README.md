# Instructor Studio — استوديو المدرّب

The Studio app exposes authenticated course authoring/moderation and Phase 10
teaching tools over the `courses`, `access`, `auth`, `dashboard`, `quizzes`, and
`videohosting` models. It owns private `InstructorStudentNote` rows. The app is
mounted at `/api/`.

All Studio responses use `Cache-Control: private, no-store`. Every endpoint is
authenticated. Course and curriculum access is object-scoped through
`features.courses.services.can_edit`; lifecycle, staff, video, resource, and
reorder mutations delegate their business rules to `features.courses.services`.
Writes carry the `studio_write` scoped throttle.

## Routes

- `GET /studio/overview`
- `GET/PATCH /studio/profile` — instructor headline, sanitized bio, credential, expertise, and HTTPS avatar URL.
- `GET/POST /studio/courses`
- `POST /studio/courses/bulk-archive`
- `GET/PATCH/DELETE /studio/courses/<slug>`
- `POST /studio/courses/<slug>/duplicate` — copies the authoring graph and quiz structures; video assets are re-linked only when `keepVideos=true`.
- `POST /studio/courses/<slug>/{submit,publish,unpublish}`
- `GET /studio/courses/<slug>/checklist`
- `GET /studio/courses/<slug>/staff/candidates?q=...` — owner-scoped, server-filtered users with effective `studio.access`.
- `POST /studio/courses/<slug>/staff` and `DELETE /studio/courses/<slug>/staff/<uuid>` — add/remove non-owner team members.
- `GET /studio/students/courses`, `GET /studio/students?course=<slug>` — staff-scoped course selector and paginated roster with server-masked email.
- `GET /studio/students.csv?course=<slug>` — injection-safe CSV export with the same server-side email masking.
- `GET /studio/students/<user-id>?course=<slug>` — learner progress and quiz-attempt detail; `POST /studio/students/<user-id>/nudge` enforces a per-course 24-hour limit.
- `GET/POST /studio/students/<user-id>/notes?course=<slug>` — private staff-authored learner notes.
- `POST /studio/students/<user-id>/extra-attempt` — scoped quiz-attempt grant for an enrolled learner.
- `GET /studio/analytics/overview` and `/studio/analytics/courses/<slug>` — SQL-aggregated, no-store instructor analytics with 7/30/90-day ranges and an explicitly unavailable ratings distribution until Phase 11 supplies a source.
- `POST /studio/courses/<slug>/modules` and `/modules/reorder`
- `PATCH/DELETE /studio/modules/<uuid>`
- `POST /studio/modules/<uuid>/lessons` and `/lessons/reorder`
- `PATCH/DELETE /studio/lessons/<uuid>`
- `PUT/DELETE /studio/lessons/<uuid>/video`
- `GET/POST/PATCH/DELETE /studio/lessons/<uuid>/resources[/<uuid>]`
- `GET/POST /studio/videos` — private, permission-scoped video library and storage-asset creation; GET accepts `q`, `status`, `provider`, `sort`, `page`, and `scope=all` only for `videos.manage_any`.
- `GET /studio/video-providers` — provider availability, reason, and effective playback/packaging plan.
- `POST /studio/videos/link` — server-revalidated YouTube, Vimeo, or public HTTPS media link creation.
- `GET/PATCH/DELETE /studio/videos/<id>` — safe metadata/detail/delete actions; detail includes published usage, captions, progress, views, protection, and truncated diagnostics. Delete is blocked when published lessons still use the asset.
- `POST /studio/videos/<id>/upload`, `GET/DELETE /studio/uploads/<id>`, `PUT /studio/uploads/<id>/chunk`, and `POST /studio/uploads/<id>/complete` — authenticated resumable upload lifecycle. Provider URIs and credentials never enter responses; completion accepts a capped display-only `durationSeconds`.
- `GET /admin/review-queue`
- `POST /admin/review-queue/<slug>/{approve,request-changes}`

Editor payloads include draft and unpublished lessons, review notes, checklist
issues, and public-safe staff profiles. They never expose account email,
password, access token, refresh token, provider credential, or upload-session
fields. Resource URLs are HTTPS-only; pagination and search inputs are capped.
Roster emails remain masked in JSON and CSV unless the viewer has
`students.view_any`; learner notes, exports, analytics, and all other
user-specific responses use private no-store caching.
