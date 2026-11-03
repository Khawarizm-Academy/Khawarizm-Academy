# Discussions — نقاشات الدروس

This feature is intentionally unregistered. The parent can mount `DiscussionTab` inside the existing course-player tab surface with `courseSlug`, the active lesson `lessonId`, permission-derived `canPost`/`canReply`/`canModerate`, and an `onJumpToTimestamp(seconds)` callback that seeks the existing player. It can mount `StudioDiscussionInbox` inside a Studio page or drawer without importing the Studio feature from this module.

`DiscussionComposer` and `DiscussionReplyComposer` are standalone hooks for custom shells. Markdown rendering uses the existing shared sanitizer; images, raw HTML, unsafe links, attachments, and email-address fields are not accepted or rendered. API calls remain private and go through the feature fetcher.

This phase does not edit the shared course-player tab registry, route table, auth permission mirror, root settings, or root URL configuration. The parent integration should register the backend app and include `features.discussions.urls` under `/api/`, then generate the additive migration in its authorized integration phase.
