# Discussions — نقاشات الدروس

This isolated app owns lesson-scoped course Q&A. It defines `DiscussionThread` and `DiscussionPost`, sanitizes Markdown before storage and serialization, and never exposes author email addresses or attachment fields.

## Routes to mount from the parent

Include `features.discussions.urls` below `/api/` without changing this app:

- `GET/POST /courses/<slug>/discussions`
- `GET /courses/<slug>/discussions/<thread_id>`
- `POST /courses/<slug>/discussions/<thread_id>/posts`
- `POST /courses/<slug>/discussions/<thread_id>/accept`
- `POST /courses/<slug>/discussions/<thread_id>/moderate`
- `GET /studio/discussions`

The course player should render `frontend/src/features/discussions/components/DiscussionTab.tsx` with the active lesson id. The Studio shell can mount `StudioDiscussionInbox` on a future route. These are explicit hooks; this phase intentionally does not edit root settings/URLs, the shared permission catalog, or the existing course-player tab registry.

Learner reads and questions require enrollment in a published or archived course. Course staff must hold `discussions.reply_own` and an `OWN_KINDS` staff relationship; moderators with `discussions.moderate` can hide or pin across courses. Accepted answers are staff answers only. Hidden threads remain in the database and are omitted from learner reads. The service applies a bounded 10-post-per-user-per-hour cache counter. No email, attachments, or email notification side effects are implemented.

No migration is included by design; the parent integration phase should register the app, mount its URLs, and generate the additive migration after reviewing the model contract.
