# Khawarizm Academy — Full React Frontend: Master Build Prompt

> **To Antigravity — read this entire file before writing any code.** This is the complete, single-file brief for building the production frontend of أكاديمية خوارزم (Khawarizm Academy) inside the `frontend/` folder.

---

## Part 0 — Your inputs, and which one wins on what

You have **live, direct access to the real Figma file** through the `plumb-mcp` MCP server, already connected and authenticated in this environment. This changes how you work: you are not being handed static exported code to interpret — you can query the actual design (real component structure, auto-layout, variables, exact colors/spacing/typography) on demand, per screen, whenever you need ground truth. Use this tool constantly. Never guess, approximate, or reconstruct a screen from memory of a PNG or from an MD file's prose description when you could instead call the tool and get the real answer.

You have **three kinds of input** in total. They are not equally authoritative — each governs a different concern, and mixing them up is the most common way this goes wrong:

1. **The live Figma file, via plumb-mcp.** This is the visual source of truth — pixel-for-pixel. Every exact spacing value, color, font size, border radius, shadow, icon, and layout position in the final app must match what the tool returns for that frame, not your own judgment, not a "close enough" recreation, and not the MD specs' prose descriptions of a screen. If the design and an MD spec seem to disagree, the design's *visuals* still win — only its *behavior* is open to correction from the MD files.
2. **The MD specification set** (`00-overview.md` through `08-dashboard-ux.md`). These govern **behavior, not appearance**: what happens on click, what data a screen needs, loading/error/empty states, click-count rules, business logic (unlock conditions, deadline logic, attempt limits), and flows between screens. Do not let these override what the Figma file actually shows.
3. **Original PNGs, if provided.** Use these only as a fallback cross-check if the live tool is temporarily unavailable or returns something that looks clearly broken (a common failure mode: an icon component the tool can't resolve, a variable it can't read). If the tool's output contradicts what's plainly visible in a source PNG, trust the PNG and flag the mismatch — don't silently "fix" it your own way.

**The single most important instruction in this document:** you are not being asked to design these screens or reinterpret them from the MD files. You are being asked to (a) pull the real design for each screen from Figma via the tool, (b) find and extract what's genuinely repeated across screens into a clean shared component library, and (c) wire in the correct behavior from the MD files. If you ever find yourself drawing a layout, color, or spacing value from imagination or from an MD file's prose rather than from a live tool call, stop — that's the failure mode that produced the mismatched result being corrected right now.

### Step 0.0 — How to use the plumb-mcp tool, per screen
For every screen you build, follow this exact sequence — do not skip the verification step, it exists specifically to catch drift before it ships:
1. **Import**: call the tool's import function against the specific frame/screen you're about to build (ask for the frame by name if you're unsure which one — list available frames first rather than guessing which one matches a route).
2. **Generate**: emit the screen as a React + TypeScript component styled with Tailwind, using logical properties for RTL, following Part 2's stack choices — but do not treat this generated output as final. Treat it the same way Step 0.1/0.2 below describe treating a pre-exported file: it needs ingestion, normalization, and component extraction before it belongs in the real codebase.
3. **Verify**: run the tool's verification function against what you just built. If it reports a mismatch, fix the mismatch and re-verify before moving on — don't proceed to the next screen with a known, unresolved mismatch.
4. **Log the result** in your phase report (Part 6): which frame you pulled, what the verification step reported, and anything it couldn't resolve automatically.

If at any point the tool is unavailable, disconnected, or a specific frame can't be found, stop and say so explicitly rather than falling back to guessing from an MD file or a PNG without flagging that you've had to do so.

### Step 0.1 — Ingestion pass (do this before any architecture work)
For every screen pulled from Figma via the tool:
- Read the tool's output fully. Note its exact colors (even if they look slightly off from `01-design-system.md` — see Step 0.2), spacing, component boundaries, text content, icons used, and responsive behavior if present.
- Identify which screen/route it corresponds to, per `00-overview.md`'s IA and the relevant feature MD file.
- Produce a short inventory before writing final code: per screen, list every distinct visual "piece" it contains (e.g., "primary CTA button," "course card," "bottom nav bar," "countdown chip") so repeated pieces across screens can be spotted before you start building, not discovered halfway through.

### Step 0.2 — Reconciling Figma output against the design tokens
The tool's output comes straight from Figma and may contain slightly drifted or inconsistent values across different screens (e.g., one screen's card radius is 11px, another's is 12px, because of manual Figma inconsistency rather than intentional design). When you find this kind of near-duplicate value:
- Treat it as **noise to normalize, not truth to preserve** — round it to the nearest real token in `01-design-system.md` (colors, spacing scale, radii, type scale) and use that token everywhere, so the shared component system stays clean.
- But if a screen shows something **structurally different** (a whole extra section, a different card layout, a different button placement) rather than a small numeric drift, that's a real design decision to preserve exactly — do not "correct" it toward what an MD file describes. Flag it in your phase report instead so a human can confirm which is right.

---

## Part 1 — Non-negotiable engineering principles

1. **No duplicated logic or markup.** The same visual pattern appearing across 2+ screens pulled from Figma becomes one shared component, extracted once, imported everywhere it appears — never copy-pasted per screen.
2. **No unnecessary re-renders, no full-page reloads on data change.** All server data goes through TanStack Query. All navigation goes through the router's client-side transitions, never `window.location`. Components subscribe only to the state slices they actually use.
3. **Feature-based structure, not type-based.** Each feature (courses, catalog, quiz, auth, dashboard) owns its own components/hooks/api/types. Only things shared across 3+ features live in the top-level `shared/` layer.
4. **Use mature libraries — don't hand-roll infrastructure.** Routing, data-fetching, forms, validation, animation, and dates all use the chosen library in Part 2. Custom code is reserved for things genuinely specific to this product (the adaptive card, the quiz engine).
5. **Design tokens, not magic values** — once normalized per Step 0.2, every color/spacing/radius/font-size comes from the Tailwind theme config, never a hardcoded value inline.
6. **RTL-first, not RTL-patched.** CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) from the first line of CSS. `dir="rtl"` set once at the document root.
7. **Backend-ready from day one.** Every data-fetching hook goes through one central API client with a swappable base URL and auth-token injection point, named/typed as if the real Django endpoint (per `07-backend-notes.md`) already exists.
8. **Type everything.** TypeScript strict mode, no `any` outside explicitly commented edge cases.
9. **Loading/error/empty states are mandatory**, not optional extras, for every data-driven component — several are explicitly described in the MD files (search-empty-state, dashboard first-time state) and must be built now, not deferred.

---

## Part 2 — Tech stack (and why)

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast dev server, first-class React 19 + TS, no framework lock-in — appropriate since Django owns the backend separately. |
| UI library | **React 19** | The React Compiler auto-memoizes components, directly preventing whole-page re-renders on small state changes. |
| Language | **TypeScript (strict mode)** | Per Part 1, rule 8. |
| Routing | **React Router v7** (data-router mode, loaders/actions) | Mature, prefetches data before rendering to avoid loading-spinner waterfalls; clean fit for a pure SPA against a separate Django API. |
| Server state | **TanStack Query v5** | Caching, background refetch, and mutations — this is what directly satisfies "no reload needed when data updates." One query-key factory per feature. |
| Client/UI state | **Zustand** | For non-server state (search-wizard step, active catalog type-switch, modal open/close). Subscribes components only to the slice they read. |
| Forms | **React Hook Form + Zod** | RHF avoids re-rendering the whole form per keystroke; Zod schemas double as validation and TS types, mapping cleanly to future Django serializers. |
| Styling | **Tailwind CSS v4** | Native CSS logical properties and `rtl:`/`ltr:` variants (v4.2+) — no extra RTL plugin needed. Theme extended with every normalized token from Step 0.2. |
| Component primitives | **Radix UI primitives** (unstyled), styled to match the Figma output | Accessible modal/dropdown/toggle/tabs/accordion behavior (focus trap, keyboard nav, ARIA) without hand-rolling it. |
| Icons | Exact icon assets/paths pulled from Figma via plumb-mcp; **Lucide React** only as a fallback for any icon a screen needs but the tool couldn't cleanly resolve. |
| Animation | **Motion** | For glow/elevation transitions and the certificate celebration moment; respects `prefers-reduced-motion`. |
| Code editor (competitions) | **CodeMirror 6** (`@uiw/react-codemirror`) | Lightweight, themeable to the dark navy palette. |
| Date/time & countdowns | **date-fns** + a small custom `useCountdown` hook | Tree-shakeable. |
| HTTP client | Native `fetch`, wrapped in one `apiClient` | Base URL, auth headers, and error normalization in one place; no axios needed. |
| Mocking (until Django exists) | **MSW (Mock Service Worker)** | Lets every feature be built and tested against realistic fake responses shaped exactly like `07-backend-notes.md`, before the real backend exists. |
| Testing | **Vitest + React Testing Library** | Vite-native, fast. |
| Linting/formatting | **ESLint + Prettier**, strict | Enforced from the first commit. |

---

## Part 3 — Folder structure

```
frontend/
├── src/
│   ├── app/                        # router.tsx, providers.tsx, App.tsx
│   ├── shared/
│   │   ├── components/              # Extracted from Figma via plumb-mcp: Button, Badge, Modal,
│   │   │                            #   AdaptiveCard, NavBar, BottomBar, SearchBox,
│   │   │                            #   CountdownChip, ProgressRing, Skeletons...
│   │   ├── hooks/                   # useCountdown, useMediaQuery, useRTLDirection...
│   │   ├── lib/                     # apiClient.ts, queryKeys.ts, cn.ts
│   │   ├── types/                   # Entity types mirroring 07-backend-notes.md
│   │   └── constants/                # Route paths, breakpoints, token re-exports
│   ├── features/
│   │   ├── auth/            { components/ hooks/ api/ store/ types.ts }
│   │   ├── catalog/         { components/ hooks/ api/ types.ts }        # 02b-unified-catalog.md
│   │   ├── courses/         { components/ hooks/ api/ types.ts }        # 03-course-system-ux.md
│   │   ├── quiz-exam/       { components/ hooks/ api/ types.ts }        # 04-quiz-exam-system-ux.md
│   │   ├── scholarships/    { components/ hooks/ api/ types.ts }        # shell only — see Phase 5
│   │   ├── dashboard/       { components/ hooks/ api/ types.ts }        # 08-dashboard-ux.md
│   │   └── home/            { components/ hooks/ api/ }                 # 02-homepage-ux.md
│   ├── styles/                      # tokens.css (normalized per Step 0.2), globals.css
│   └── main.tsx
├── .eslintrc.cjs / tailwind.config.ts / tsconfig.json / vite.config.ts / .env.example
```

Rule: a feature never imports another feature's internals directly — shared reuse goes through `shared/`.

---

## Part 4 — Phased build plan (stop for review after each phase)

### Phase 0 — Ingestion & Foundation
Confirm the plumb-mcp tool is connected before doing anything else — list available Figma frames to sanity-check access. Run the full Step 0.0/0.1/0.2 sequence (import → generate → verify → ingest → normalize) across every screen needed for this phase's foundation work. Produce the per-screen inventory. Scaffold Vite + React 19 + TS strict + ESLint/Prettier + Vitest. Build `styles/tokens.css` from the **normalized** values found during ingestion. Root layout sets `dir="rtl"`, `lang="ar"`. Router skeleton with lazy-loaded placeholder routes for every path in `00-overview.md` §4. `apiClient.ts` typed against `07-backend-notes.md`, with MSW mock handlers stubbed per endpoint.

### Phase 1 — Shared component extraction
Using the Phase 0 inventory, build every component that repeats across 2+ screens as one real shared component in `shared/components/`, matching the Figma output's exact visuals (re-pulling via the tool for any screen where you need to double-check a detail) and covering resting/hover/focus/disabled/loading/error/empty states via Vitest.

### Phase 2 — Auth + App Shell
Login/Signup pulled fresh via plumb-mcp from their Figma frames. `authStore` (Zustand), `AuthGuard` route wrapper, persisted session. Root NavBar (desktop) / BottomBar (mobile) wired to real routes.

### Phase 3 — Home + Unified Catalog
Rebuild `02-homepage-ux.md`'s screens and `02b-unified-catalog.md`'s screens exactly from their live Figma frames (import → generate → verify per Step 0.0), wiring in TanStack Query for real data flow (query keys, cache invalidation, the type-switch, contextual filters, mixed feed).

### Phase 4 — Courses + Quiz/Exam System
Course Landing, Course Player (tabs), lesson progress via optimistic TanStack Query mutations. Quiz/exam shared engine components (QuestionCard variants, TimerChip, BriefingCard, ResultsScreen, QuestionGrid) composed into Problem Set, Exam flow, Coding Arena (CodeMirror), Leaderboard, Quiz Hub — all pulled from their Figma frames via the tool, verified before moving to the next screen.

### Phase 5 — Dashboard
Full `08-dashboard-ux.md` build from its Figma frames via plumb-mcp: Quick Summary strip, "تابع الآن" priority slot, list sections, Notifications, first-time empty state. **Scholarships:** since no Figma frames exist for those pages yet, build only the `features/scholarships/` shell (types + API hook signatures matching `07-backend-notes.md`) so Catalog/Dashboard can render scholarship-type cards against mock data. Leave the actual detail page as a clearly marked placeholder route — don't design it yourself, and don't call the tool for a frame that doesn't exist.

### Phase 6 — Polish
Motion pass per `01-design-system.md` §7. Full responsive audit. Accessibility audit on all Radix-based components. Confirm route-based code splitting is working.

---

## Part 5 — Backend-readiness checklist

- Every `api/*.api.ts` function is named/shaped exactly like its `07-backend-notes.md` endpoint.
- Every `shared/types/` entity mirrors a backend entity field-for-field.
- Auth is generic token-based (fits Django REST Framework / SimpleJWT).
- No component calls `fetch`/`apiClient` directly — always through a feature's `hooks/` layer.

## Part 6 — What to hand back after each phase

A short summary: what was built, which Figma frames were pulled via plumb-mcp and what each `plumb_verify` check reported (clean match, or what was fixed), which MD sections informed behavior, any structural (not numeric) mismatches found between the design and MD specs, which components were promoted to `shared/` and why, and any explicit gaps deferred to a later phase. Never silently skip or silently "fix" a mismatch — always flag it. If the tool was unavailable for any screen in this phase, say so explicitly and note what you did instead.
