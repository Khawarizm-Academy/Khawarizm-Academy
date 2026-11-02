# Course Announcements

Phase 10.3 course announcements live in this feature app and are mounted below `/api/courses/<slug>/announcements`. `CourseAnnouncement` stores the course, author, title, sanitized Markdown body, pin state, and timestamps. Mutations require `announcements.post` plus course staff membership; learner reads require enrollment in a published or archived course.

Creation enforces a durable limit of three posts per course and server-local day. A separate quota row means deleting a post does not reset the limit. Course-level row locking serializes concurrent create/pin operations, and a conditional unique constraint permits at most one pinned announcement per course. Successful creation emits `on_announcement_created` after commit for Phase 11 notification consumers; this feature does not write notification rows itself.

The API sanitizes Markdown before storage and serialization: raw HTML and non-HTTPS Markdown links are removed. Author payloads contain only public id/name/avatar fields; learner list/detail responses never expose email or staff metadata. All announcement reads and mutation responses are `private, no-store`.

The Django app and URL module are registered. Schema migrations are intentionally generated with the Phase 10–12 verification batch, after the remaining teaching-tool models are complete.
