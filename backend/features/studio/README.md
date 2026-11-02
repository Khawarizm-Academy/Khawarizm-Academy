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
- `GET/POST/DELETE /studio/courses/<slug>/staff[/<uuid>]`
- `POST /studio/courses/<slug>/modules` and `/modules/reorder`
- `PATCH/DELETE /studio/modules/<uuid>`
- `POST /studio/modules/<uuid>/lessons` and `/lessons/reorder`
- `PATCH/DELETE /studio/lessons/<uuid>`
- `PUT/DELETE /studio/lessons/<uuid>/video`
- `GET/POST/PATCH/DELETE /studio/lessons/<uuid>/resources[/<uuid>]`
- `GET /admin/review-queue`
- `POST /admin/review-queue/<slug>/{approve,request-changes}`

Editor payloads include draft and unpublished lessons, review notes, checklist
issues, and public-safe staff profiles. They never expose account email,
password, access token, refresh token, provider credential, or upload-session
fields. Resource URLs are HTTPS-only; pagination and search inputs are capped.
