# Phase 7 — Services Layer & Thin Handlers (result)

Branch: `Refactor/Services` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

**Pure refactor — behavior parity is the definition of done.** Parity: **23/23**
GET snapshots identical; write paths proven by the untouched 422-test suite
(enroll/progress/favorite/apply/save persistence, admin user mutations, the
content editor, notification read — all pinned).

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/features/courses/services.py` (new) | `enroll(user, course)` — the Phase-6 atomic/F()/on_commit shape verbatim; `save_progress(user, course, data)`; `toggle_favorite(user, course) -> bool`; `related_for(course)`; `certificate_payload(course)`. Dashboard model imports stay **inside the functions** (courses ⇄ dashboard load-order comment preserved). |
| `backend/features/scholarships/services.py` (new) | `apply(user, scholarship)`; `toggle_save(user, scholarship) -> bool`. |
| `backend/features/adminconsole/services.py` (new) | Account lifecycle: `create_user_account` (email identity + uniqueness → `InvalidParameter`, role⇄`is_staff` sync, profile ensure), `update_user_account` (email immutable, **self-demote guard**), `delete_user_account` (**self-delete guard**), `set_role` (**self-role guard**, role validation after the self-check — the original order), `is_self` helper. Content editor: `require_content_type`, `values_for` (validation, clearable-kinds rule), `coerce` via the **`_COERCERS` dispatch dict** (number/decimal/bool/json + `str` default — the old if-chain is gone; clearable kinds are the `CLEARABLE_KINDS` frozenset), `create_content_row`/`save_content_row` (IntegrityError → `InvalidParameter` with the same Arabic detail). |
| `backend/features/dashboard/services.py` (new) | `summary(user)`, `notifications(user)`, `mark_notification_read(user, id)` — the read assemblies moved; enrolled/saved/competitions stay in views (2–4 lines of query + serialize each). |
| Views (all 4 features) | Handlers now resolve → validate → call service → serialize. `adminconsole/views.py` **379 → 263 lines**; every handler ≤ ~25 lines. A shared `_page()` builds the standard paged envelope for sessions/content lists. |
| Cleanup | The users view's leftover double `annotate` (Phase-6 leftover: base **and** slice both annotated) collapsed to the slice-only form. |

## The one semantic tool: guards as `InvalidParameter`

Admin guards used to return ad-hoc `Response({"detail": …}, 400)` from inside
the view. Moving them into services requires an error channel —
`InvalidParameter` (promoted in Phase 5) renders **exactly** the same 400
`{"detail": …}` envelope through the shared handler, so payloads are
byte-identical. Guard **order** preserved: self-checks fire before role-format
validation in `set_role`, and the PATCH self-demote guard still evaluates
after `values_for` (an invalid-values PATCH on yourself 400s with the field
error first, same as before).

## Parity notes

- `course_enroll_view`/`course_progress_view`/`course_favorite_view`,
  `scholarship_apply_view`/`scholarship_save_view`: response bodies unchanged
  (`enrolled/applied/saved/favorited` keys, visitor echoes, `requiresAuth`).
- Admin write endpoints: same bodies, same 201/400/404 statuses; the
  `IntegrityError → 400` mapping moved into the service unchanged (including
  the `ValueError` companion in the catch tuple).
- Content editor coercion table: `number→int`, `decimal→float`,
  `bool→(True,"true","1",1)`, `json→object-or-parsed-string`, everything else
  `str` — row for row what the if-chain did.

## Gates

- `ruff check` + `format --check` clean; `check` no issues; `makemigrations --check` no changes (**no schema change** — pure code move).
- `test -v1` → **422 tests OK** (no new tests needed: the suite *is* the parity proof for a pure refactor; the `assertNumQueries` guards also confirm query shapes didn't drift).
- gitleaks clean; pre-commit hooks pass on changed files.
- Parity: **23/23**.

## Notes for later phases

- Phase 8 (`Refactor/Envelope`) wraps bare-array payloads (`dashboard/enrolled|saved|competitions|notifications`) in `{"items": [...]}` — the dashboard views' two-liners are where those shapes live; the frontend fetcher/type edits ride the same phase.
- Phase 10 (`Docs/OpenAPI`) can point at `services.py` modules as the business-rule index.
