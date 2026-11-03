# 10 · Studio

The instructor/back-office authoring surface. Arabic-first, RTL, permission
gated, and the only place a course's curriculum changes.

| Layer | Where | Count (read from code) |
| :--- | :--- | ---: |
| Frontend routes | `/studio` + 12 children, `frontend/src/app/routes.ts` | 13 |
| Nav sections (data-driven) | `features/studio/data/studioSections.json` | 9 |
| Page components | `features/studio/pages/` | 7 |
| Component categories | `features/studio/components/{layout,views,chrome,cards,overlays,states,controls}` | 16 files |
| Backend endpoints under `/api/studio/*` | classified in `config/route_access.py` | 66 |
| Admin endpoints under `/api/admin/*` | same manifest | 36 |

## 1. Design language

Studio is a *workspace*, not a marketing page. It reuses the platform's
"Observatory" tokens (`docs/01-design-system.md`) rather than inventing a second
palette, and the rules that make it feel different from the public site are:

- **Density over airiness.** Cards are `rounded-2xl` surfaces on
  `bg-navy-900/65` with `--shadow-elev-1`, `border-navy-600/80`. Information sits
  close: rows are `p-3`, gaps are `gap-3`.
- **One accent, one gold.** Blue (`--color-blue-400`) carries interaction and
  progress; gold is reserved for "published/complete" signals. Semantic colors
  come from the token ramps, never ad-hoc hex.
- **Right-aligned by construction.** Everything is written RTL-first:
  `text-right`, `end-0`, `border-s`, `ps-*`/`pe-*` logical properties. A drawer
  is `fixed inset-y-0 end-0` — the same class works in both directions because
  `dir` is set on the document, not per component.
- **Layers stay in one band.** Rail and drawer use `z-40`, dialogs `z-50`, inline
  chrome `z-10`/`z-20`. Note the honest gap: there is **no z-index token** in
  `styles/tokens.css` — 91 call sites use the Tailwind utilities directly, so
  "what sits above the drawer" is answered by grep, not by a scale. Promoting it
  to tokens is an open item (`plan/phase-14-result.md`).
- **States are components, not copy.** `components/states/` holds the empty,
  loading and denied treatments; every Studio view uses them instead of writing
  its own placeholder.

## 2. Motion spec

Motion here is feedback and orientation only — one strong effect per screen, and
everything is short enough to not feel like a wait.

| What | Value | Where |
| :--- | :--- | :--- |
| Drawer / detail panel entrance | `.2s ease-out` (`studio-drawer-in`) | `.studio-lesson-drawer`, `.studio-video-detail` |
| Card hover lift | `transform .2s, box-shadow .2s` | `.studio-course-card` |
| Sparkline bars | `transition-[height] duration-500` | `.studio-series span` |
| Progress / ring | `transition-[width]`, `stroke-dashoffset .5s var(--transition-page-ease)` | `.studio-progress span`, `.readiness-ring-progress` |
| Skeleton shimmer | `skeleton-celestial-shimmer 1.3s infinite` | `.studio-skeleton span` |
| Rail item | `transition-colors` only (no movement in a list you scan) | `.workspace-rail-item` |

The rules that keep this honest:

- Animate **`transform` and `opacity`** for anything that moves; height/width
  transitions are limited to data bars where the element is small and isolated.
- Durations cluster at `.2s` (feedback) and `.5s` (data change). Nothing slower
  than that except the skeleton loop.
- Reduced motion: the global `prefers-reduced-motion` block in the design-system
  stylesheet disables the shimmer and the drawer slide; a state change must still
  be readable without it (the save-state chip changes text, not just color).
- One hero effect per screen: a course list may animate card entry, a drawer may
  slide, but an editor tab switch animates nothing.

## 3. Shell and navigation

`/studio/*` is mounted as an **immersive sibling** of the public layout: its own
shell (`components/layout/`), its own rail, no public header. Navigation is a
data table, not JSX:

```json
{ "key": "videos", "label": "مكتبة الفيديو", "icon": "Clapperboard",
  "permission": "studio.access", "route": "/studio/videos", "mobile": true }
```

- `permission` is a catalog key (`docs/09-access-control.md` §6). The rail filters
  `studioSections.json` through `useCan(...)`; a section an instructor cannot use
  is not rendered at all, so the sidebar is a truthful map of their powers.
- `mobile: true` decides whether the section also appears in the bottom bar; the
  rest live behind "المزيد".
- Adding a Studio screen = one JSON row + one route entry. No navigation
  component is edited.

Reads are cached with short-lived keys scoped by user id, and **every mutation
invalidates the Studio namespace explicitly** — see `docs/04-loading-caching-and-motion.md`.
Studio responses are `private, no-store` or ETag'd per user where they carry
other people's data (roster, analytics, announcements).

## 4. Editor architecture

`/studio/courses/:slug` (lazy route) is the whole curriculum editor. The
structure that keeps it out of trouble:

- **URL is the source of truth for view state.** The active tab and the open
  lesson are query params, so a refresh, a back button, and a shared link all
  land on the same screen. No `useState` mirror of the URL.
- **One hook per editable surface.** `basics`, `about` and the lesson `article`
  each own an independent `useAutosave` instance with its own `updatedAt`
  expectation, so typing in the article cannot poison a title save.
- **Business keys in payloads.** Curriculum calls send `moduleId` / `lessonId`
  strings, not database PKs; routes are keyed by `slug` (course) and UUID
  (module/lesson).
- **Curriculum tree interactions.** Optimistic reorder; a same-module move
  collapses into one ordered-list call; `Alt+Arrow` moves a lesson across modules
  in the reading direction (so in RTL the arrow meaning flips with `dir`); each
  move announces itself for screen readers; touch devices get an explicit
  "نقل إلى…" selector instead of a gesture with no alternative.
- **Server-side truth survives the client.** Related-course picks are limited to
  rows the published-catalog endpoint returns, *and* the setter re-enforces
  published-only / not-self on the server. The list is a UX convenience, not a
  permission model.
- Lesson drawer: resource add/delete over the Studio resource endpoints (HTTPS
  only), video picker defaulting to ready assets with playability hints.

## 5. Autosave model

`features/studio/hooks/useAutosave.ts` is the single implementation; the editor
never writes its own debounce.

```
edit → 700 ms debounce → run()
         ├─ a save is in flight        → mark pending, send after it lands (no overlap)
         ├─ navigator.onLine === false → queue payload, state 'offline', flush on 'online'
         ├─ 2xx                        → state 'saved', adopt the returned updatedAt
         └─ 409                        → state 'error' + conflict dialog
```

- **State machine:** `idle | saving | saved | error | offline`, surfaced in a chip
  so the writer always knows where their work is.
- **Never two writes at once.** `inFlightRef` serialises; a trailing change
  re-runs after the current call resolves, so the last edit always wins locally.
- **Stale-write detection is server-side.** Each payload carries
  `expectedUpdatedAt`; when the row moved on, the API answers **409** with
  `fields.current` = the server's values. The client does *not* lose the draft:
  the dialog shows local vs server and resolves per field with `mine` / `theirs`,
  then clears the conflict lock and resumes autosaving.
- **A conflict blocks new autosaves by design** — silently overwriting another
  instructor's curriculum is worse than pausing.
- `offline` keeps a queue rather than dropping edits, and flushes on the `online`
  event; if the queue's first write conflicts, the same dialog takes over.
- Article and about Markdown use the shared Markdown editor/renderer, and learner
  article content is fetched from its own private `no-store` endpoint (it is
  lesson content, not editor chrome).

## 6. What Studio is not

- **Not an admin.** Role management, user management, the review queue, audit and
  system configuration live in `/admin` against `/api/admin/*`. Studio can *submit*
  a course for review; it cannot approve its own publication — `courses.publish`
  and `courses.review` are different keys on purpose.
- **Not the progress engine.** Lesson completion is derived on the server from
  heartbeats (`docs/11-video-platform.md` §6); Studio reads the result.
- **Not a video host.** `/studio/videos` manages assets, captions and upload
  sessions against Telegram/Drive; bytes never live in Django.

## 7. Where to look

| Need | File |
| :--- | :--- |
| Nav table / section metadata | `frontend/src/features/studio/data/studioSections.json` |
| Autosave + conflict resolution | `frontend/src/features/studio/hooks/useAutosave.ts` |
| Editor page (tabs, curriculum, drawers) | `frontend/src/features/studio/pages/StudioCourseEditorPage.tsx` |
| Studio CSS (motion, surfaces, RTL) | `frontend/src/features/studio/studio.css` |
| Authoring API (66 endpoints) | `backend/features/studio/{views,urls,students_views,serializers}.py` |
| Business rules behind it | `backend/features/courses/services.py`, `features/quizzes/services.py` |
| Feature README (phase-by-phase history) | `frontend/src/features/studio/README.md`, `backend/features/studio/README.md` |
| Smoke journey | `plan/PLAN.md` §P14.4, `plan/phase-14-result.md` |
