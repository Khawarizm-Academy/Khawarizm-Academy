# Phase 1 — CI Pipeline, Lint & Quality Gates (result)

Branch: `Chore/BackendCI` → PR into `Refactor/BackendSkills`. Date: 2026-10-28.

## What landed

| Artifact | Notes |
| :--- | :--- |
| `backend/pyproject.toml` | ruff (line 120, py314; `E,F,I,B,SIM,UP,RUF`). Project disables: `RUF012` (Django config-by-class-attr is idiomatic), `RUF001` (Arabic confusables are intentional typography). Migrations fully excluded. `*.md` excluded from **format** — ruff ≥0.13 formats markdown code blocks, and doc examples should stay hand-shaped. |
| `.pre-commit-config.yaml` | ruff + ruff-format (pinned to `requirements-dev.txt`'s version), hygiene hooks. Hygiene scoped to backend + repo tooling: `frontend/`, `.agents/` (skills library; placeholder `- ` lines are whitespace-significant), `Designs/` are excluded so this phase doesn't carry their churn. tsconfigs excluded from `check-json` (JSONC). |
| `.github/workflows/backend.yml` | One job: cached pip → ruff check/format → `check` → `makemigrations --check` → `migrate` → `test -v2 --parallel` → `pip-audit -r requirements.txt` → gitleaks (whole history) → `check --deploy` with a production-shaped env. Runs on push/PR to `main` and `Refactor/*`. |
| `backend/requirements-dev.txt` | ruff 0.17.3, pip-audit 2.10.1, pre-commit 4.3.0 — runtime `requirements.txt` untouched. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Gate checklist + refactor-parity reminder. |
| `backend/README.md` | "Verification (the gates)" + "Refactor parity" sections replace the manual-only list; dev-tool install via `requirements-dev.txt` + `pre-commit install`. |
| `backend/scripts/parity_capture.sh` + `parity_diff.py` | The Phase-0 parity tooling, versioned. `PARITY_DIR` env selects the snapshot root. |

## Lint onboarding (one-time format pass)

- 41 files reformatted by `ruff format`, 64 autofixes (import order, unused imports, deprecated typing imports, quoted annotations, unused noqa).
- Hand fixes: removed a dead `client_name` local (ingest), ternary for status (ingest), `contextlib.suppress` for the best-effort Drive revoke, `next()` over slice (test), `IntegrityError` instead of blind `assertRaises(Exception)`, `_unused` renames, one TYPE_CHECKING import (`ProgressTracker` in the Telegram provider — py314's lazy annotations (PEP 649) made the undefined name silent at import; now typed properly), long Arabic strings wrapped, dict-value iterations over `.items()` where the key was unused (seed), URL helper shares the token var (telegram).
- Restored, with `# noqa: F401`, the `urllib.request` import in `videohosting/diagnostics.py`: deep-run tests patch `urlopen` through that namespace (ruff's F401 fix broke 2 tests — the import's why-comment existed for exactly this).

## Dependency audit finding → fixed

`pip-audit` flagged **pyjwt 2.10.1** (13 advisories, PYSEC-2026-176/178/414x…). Upgraded to **2.15.0**; full suite green; audit now reports `No known vulnerabilities found`.

## Gates (recorded)

- `ruff check .` → clean · `ruff format --check .` → 142 files clean
- `python manage.py check` → no issues · `makemigrations --check --dry-run` → no changes
- `test -v2 --parallel` → **370 tests OK (6 s)**
- `pip-audit -r requirements.txt` → clean
- `check --deploy` (prod env) → **4 accepted warnings**: `W004 HSTS`, `W008 SSL redirect`, `W012 session cookie secure`, `W016 CSRF cookie secure` — exactly the Phase 3 (Server/Hardening) backlog; documented, not silenced.

## Parity proof

23/23 GET snapshots identical before → after the whole lint/format/refactor sweep (`plan/phase-0-baseline.md` method; volatile keys normalized). Zero behavior change.

## Workflow wiring

- CI green on the PR into `Refactor/BackendSkills` (first run of the pipeline).
- `main` branch protection (required check: `backend-ci / lint · checks · tests · audit`) set after this PR's merge — the check run must exist before protection can name it.

## Notes for later phases

- Pre-commit hygiene hooks are scoped on purpose; widen only with a plan update.
- `catalog?type=course` (singular) 500s with `KeyError` in the original code — caught during Phase 0 parity capture (baseline fact; Phase 5 replaces silent/unknown-value handling with 400).
