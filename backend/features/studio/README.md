# Instructor Studio — استوديو المدرّب

The model-less Studio app exposes the Phase 3 course authoring and moderation
API over the `courses`, `access`, `auth`, and `videohosting` models. It is
mounted at `/api/` and does not own migrations or database tables.

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
