# Studio — الاستوديو

Phase 7 owns the permission-gated Studio shell, home overview, course list, and new-course flow. The shell is mounted as an immersive sibling at `/studio/*`; it reuses shared Workspace primitives and Observatory tokens.

Navigation is data-driven through `data/studioSections.json` and filtered by the current user's effective permissions. Home and course-list reads use short-lived cache keys scoped by user id. Mutations explicitly invalidate the Studio cache namespace.

Course editor, video library, quiz editor, student management, analytics, and profile detail routes are registered as lazy placeholders for their later phases; they are not implemented here.
