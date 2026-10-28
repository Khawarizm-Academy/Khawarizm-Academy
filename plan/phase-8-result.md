# Phase 8 — Error Envelope & `{items}` Contract Wrap (result)

Branch: `Refactor/Envelope` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

**Coordinated frontend edits** (user-approved): the fetchers/types that read the
changed payloads ride this same PR, so no intermediate state ever has a
frontend/backend mismatch. Backend: **433 tests OK** (was 422 — +11 contract
tests). Frontend: **76/76 vitest**, `npm run build` green. Parity: **18/23 OK,
5 documented shape diffs** — every diff verified to be exactly the intended
shape change with byte-identical content (below).

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/common/messages.py` (new) | Every hand-rolled user-facing string in one module: the not-found lines for all features, video playback (`NOT_READY_BY_STATUS` became a plain string map), auth (`MISSING_ID_TOKEN`, `login_locked(wait)`, the clock-drift story, `REASON_MESSAGES` moved here from `authentication.py`), and the video-console strings. DRF's own defaults need nothing — `LANGUAGE_CODE = "ar"` + DRF's `ar` locale already translate `NotAuthenticated`/`Throttled`/`NotFound` defaults. Feature-owned business-rule messages (admin services) stay in their `services.py`. |
| `backend/features/common/errors.py` (rewritten) | The one envelope: `{"detail", "code", "fields"?}`. `api_exception_handler` re-binds Django `Http404`/`PermissionDenied` (DRF only rebinds its own local reference), renders `ValidationError` as `code: "validation_error"` + `fields` (the bare-array body DRF otherwise emits is gone), and prefers `exc.code` → `ErrorDetail.code` → `default_code` → a status map. New exceptions: `NotFound` (404, i18n default), `Conflict` (409), `PayloadTooLarge` (413), `UpstreamUnavailable` (502). `error_payload(detail, code)` for the hand-built body that needs custom headers (the login lockout's `Retry-After`). |
| Feature views (courses, scholarships, catalog, auth, adminconsole, videohosting, console) | Every hand-rolled 400/404/409/413/502 now **raises** a typed exception; same statuses, same Arabic detail, plus `code`. `_grant` in videohosting raises `PlaybackTokenInvalid` (403, `code: "token_invalid"`) instead of returning an error tuple; console's `_resolve_provider` raises instead of returning `(None, Response)`. The refresh endpoint reuses `SessionAuthError` — its `REASON_MESSAGES` lookups reproduce the exact previous bodies (`session_invalid` / `expired` keep their keys). |
| Bare arrays → `{"items": [...]}` | `/api/dashboard/enrolled`, `/api/problems`, `/api/courses/:slug/problems`, `/api/courses/:slug/related`, and `/api/auth/sessions` (was `{"sessions": [...]}` — normalized to the one contract). `saved`/`competitions`/`notifications` already answer named objects — left as is. |
| Frontend | `authFetchers.fetchSessions` (`{items}`), `dashboardFetchers.fetchEnrolledCourses` (`.items`), `courseFetchers.fetchRelatedCourses`/`fetchCourseProblems` (`.items`) — components untouched (fetcher signatures unchanged). `docs/07-backend-contract.md`: the envelope documented in "Response shapes", `{items}` noted on the five endpoint rows. |
| Tests (+11 → **433**) | `ItemsContractTests` (one per wrapped endpoint: exact `{"items"}` key set + content); `ErrorEnvelopeContractTests` (400 `invalid_parameter`, 404 `not_found`, 401 `session_invalid`, 403 `permission_denied`, 401 `not_authenticated` — exact key set + code each); `ExceptionHandlerTests` rewritten for the envelope (`ValidationError` string + field-dict forms). Updated shape assertions: auth sessions ×3, courses problems ×2 + related + 404 body, dashboard enrolled ×3, catalog + scholarships 404 bodies, throttle-429 asserts `code: "throttled"`. |

## Parity diffs — all 5 documented, content-identical

| Snapshot | Change |
| :--- | :--- |
| `dashboard-enrolled.json` | bare array → `{"items": [...]}` (items identical) |
| `course-problems.json` | bare array → `{"items": [...]}` (items identical) |
| `course-related.json` | bare array → `{"items": [...]}` (items identical) |
| `auth-sessions.json` | `{"sessions": [...]}` → `{"items": [...]}` (rows identical modulo volatile keys) |
| `videos-providers.json` | 401 body `{"detail"}` → `{"detail", "code": "not_authenticated"}` (detail identical) |

## Notable decisions

- **The SPA's `code` contract now actually works everywhere.** `apiClient.ts`
  reads top-level `payload.code`, but only `SessionAuthError` produced it
  before — hand-rolled 400/404 bodies had no code. Every error now carries
  one; the lost-session flow (`AuthProvider`'s `SESSION_LOST_MESSAGES`) is
  unchanged.
- **Throttled 429 gains `code: "throttled"`.** The old test pinned "no code on
  the scope 429" — the distinction from the lockout is now the code value
  (`throttled` vs `login_locked`), test updated. DRF's ar locale already
  renders the detail in Arabic; no custom string was added.
- **`login_locked` keeps its key** (additive-only rule): the lockout stays a
  hand-built `Response` because it needs the `Retry-After` header.
- **Pre-existing frontend test failure fixed.** `routes.test.ts` expected
  `admin.meta.activeTab === 'overview'` — `'overview'` was never a valid
  `NavTabKey` (checked at the commit that introduced the test), so it could
  only ever fail; CI doesn't run vitest, which is why it survived. Updated to
  assert the real contract (`hideShell` routes have no nav tab). That plus the
  fetcher unwrap changes are the only frontend edits.
- **`fields` renders only for `ValidationError`.** No view currently raises
  one (guards raise `InvalidParameter`), so no payload regressed; the shape is
  there for Phase 10's schema work.

## Gates

- Backend: ruff + format clean, `check` no issues, `makemigrations --check`
  no changes (**no schema change**), **433 tests OK** (serial + `--parallel`).
- Frontend: **vitest 76/76**, `npm run build` exit 0.
- gitleaks clean; pre-commit hooks pass on changed files.
- Parity: 18/23 OK + the 5 documented diffs above.
- Live smoke: 404/400/401/429 all answer `{"detail", "code"}` with the exact
  expected messages (`not_found`, `invalid_parameter`, `session_invalid`,
  `login_locked` + `Retry-After`); smoke lockout events cleared afterwards.

## Notes for later phases

- Phase 10 (`Docs/OpenAPI`) should emit this envelope as the components'
  error schema; `fields` is the hook for per-input validation UI.
- Phase 9's 202 endpoint can reuse `error_payload`-style envelopes for its
  status body.
- The frontend fetchers unwrap `{items}` inside the fetcher module — if a
  later phase adds paging metadata (`nextCursor`), only the fetchers change.
