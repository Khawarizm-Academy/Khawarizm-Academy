# Studio — الاستوديو

Phase 7 owns the permission-gated Studio shell, home overview, course list, and new-course flow. The shell is mounted as an immersive sibling at `/studio/*`; it reuses shared Workspace primitives and Observatory tokens.

Navigation is data-driven through `data/studioSections.json` and filtered by the current user's effective permissions. Home and course-list reads use short-lived cache keys scoped by user id. Mutations explicitly invalidate the Studio cache namespace.

## Phase 8 course editor

The lazy `/studio/courses/:slug/edit` route now mounts the course editor with URL tab/lesson state, basics/about Markdown editing, checklist/publish actions, curriculum tree, lesson drawer, conflict-aware field saves, and the server-backed category taxonomy. Article Markdown and course/about previews use the shared Markdown editor/renderer; learner article content remains on its separately authorized, private no-store endpoint.

Curriculum interactions include optimistic module/lesson reorder, complete ordered-list calls for same-module moves, UUID mutation routes with `moduleId`/`lessonId` business identifiers in reorder payloads, RTL-aware `Alt+Arrow` movement across modules, keyboard announcements, and an explicit touch “نقل إلى…” selector. The lesson drawer supports HTTPS resource add/delete through the existing Studio resource endpoints. About and article Markdown edits autosave after the shared debounce, while stale-write conflicts continue through the existing conflict dialog.

Related-course selection is intentionally limited to rows returned by the published catalog endpoint; the Studio setter still enforces the published-only and not-self rules server-side. Video selection/linking uses the Phase 8 picker contract only. Uploading, library management, and uploader UI remain Phase 9 scope.
