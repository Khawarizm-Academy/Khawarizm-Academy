# CONVENTIONS — how every phase adds files (governs all phases)

> One page, stated once. If a phase contradicts this, fix the phase.

## Where new code goes

| Category | Home |
| :--- | :--- |
| Feature business rules used by views *and* management commands | `features/<f>/services.py` (new file, one per feature, only when rules exist) |
| Cross-cutting project wiring (middleware, logging config, health) | `backend/config/` |
| Cross-cutting feature code (cache helper, throttle classes, envelope, messages) | `features/common/` |
| User-facing strings | single source: `features/common/messages.py` (phases import constants from it) |
| Tests for a change | the owning feature's `tests.py` |
| Docs of durable facts | `PROJECT_PROFILE.md`, `backend/README.md`, the owning feature's `README.md` |

## Rules

1. **No new file categories.** The feature folder contract stays: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`, `migrations/`, `README.md`, `services.py` (added by Phase 7), plus `providers/`, `filters.py`, `tokens.py`, `choices paths` where a feature already has them. Anything else needs a plan update first.
2. **Serializers never hit the DB.** Query only in views/services/commands; serializers transform.
3. **Views stay thin:** resolve caller → validate → call service → serialize → return (~≤25 lines). Business rules move to `services.py`.
4. **Handlers and helpers must not read the environment.** Only `config/settings.py` does; features read settings attributes.
5. **camelCase only at the serializer/fetcher boundary.** Python-side everything snake_case; the SPA reads camelCase.
6. **Every user-facing string is a named constant in `features/common/messages.py`.** Feature NOT_FOUND constants import from there.
7. **Data over branches:** kind/type dispatch uses dicts/tables (see `catalog/filters.py`), not growing `if` chains.
8. **One-line why-comments** explain decisions, not what the code does; no banner comments.
9. **All migrations additive/backward-compatible.** No phase may require a data migration or a destructive step.
10. **Refactor phases prove parity:** re-run the Phase-0 capture (`/tmp/opencode/parity/capture.sh`), diff with `/tmp/opencode/parity/diff.py` — zero or every diff explained in the phase notes.

## Workflow per phase

- One branch per phase off `Refactor/BackendSkills` (master plan §3); commit messages `feat|fix|refactor|docs|chore|test(<scope>): <imperative summary>` in the repo's existing style.
- Every phase commits its result notes like `plan/phase-<n>-result.md` (summary of what changed, gates, evidence) — the trail lives with the plan.
- Gates before every merge: ruff (Phase 1 and on), `check`, `makemigrations --check --dry-run`, `migrate`, `test` — recorded in the phase result file.
