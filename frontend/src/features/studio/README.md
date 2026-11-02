# Studio — الاستوديو

Phase 7 owns the permission-gated Studio shell, home overview, course list, and new-course flow. The shell is mounted as an immersive sibling at `/studio/*`; it reuses shared Workspace primitives and Observatory tokens.

Navigation is data-driven through `data/studioSections.json` and filtered by the current user's effective permissions. Home and course-list reads use short-lived cache keys scoped by user id. Mutations explicitly invalidate the Studio cache namespace.

## Phase 8 course editor

The lazy `/studio/courses/:slug/edit` route now mounts the course editor with URL tab/lesson state, basics/about Markdown editing, checklist/publish actions, curriculum tree, lesson drawer, conflict-aware field saves, and the server-backed category taxonomy. Article Markdown and course/about previews use the shared Markdown editor/renderer; learner article content remains on its separately authorized, private no-store endpoint.

Curriculum interactions include optimistic module/lesson reorder, complete ordered-list calls for same-module moves, UUID mutation routes with `moduleId`/`lessonId` business identifiers in reorder payloads, RTL-aware `Alt+Arrow` movement across modules, keyboard announcements, and an explicit touch “نقل إلى…” selector. The lesson drawer supports HTTPS resource add/delete through the existing Studio resource endpoints. About and article Markdown edits autosave after the shared debounce, while stale-write conflicts continue through the existing conflict dialog.

Related-course selection is intentionally limited to rows returned by the published catalog endpoint; the Studio setter still enforces the published-only and not-self rules server-side. The Phase 9 video surface now owns `/studio/videos`: URL-backed library filters, provider/effective-plan explanations, a keyboard-accessible add drawer, a framework-independent two-concurrent-file resumable queue, visibility-aware readiness polling, detail/caption/usage management, and safe delete guards. The lesson picker defaults to ready assets, exposes playability hints, searches by status, and links instructors back to the same add flow.

Client URL checks in `data/videoUrl.ts` are UX-only and intentionally mirror the backend YouTube, Vimeo, and public HTTPS media rules; the server remains authoritative. Upload files are preflight-checked before queue admission, one chunk is in flight per file, and the queue never logs file names or credentials.

The video detail drawer mints a short-lived, `no-store` Phase-5 grant for a real staff preview and edits title/poster through the existing metadata endpoint. Poster URLs are HTTPS-only in both the client and server validators. Same-asset source replacement is deliberately unavailable: the current provider completion contracts do not guarantee that the existing provider object remains untouched through every failed upload/packaging path (Telegram background ingest is especially non-atomic), so the UI does not expose a misleading replacement action that could break linked lessons.
