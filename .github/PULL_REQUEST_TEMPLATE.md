<!-- One subject per PR; keep the scope in the title (e.g. `fix(routes): …`). -->

## What changed
<!-- A short paragraph: the problem and the shape of the fix. Links/refs welcome. -->

## Verification (backend gates — CI runs them; locally run what applies)
- [ ] `ruff check .` + `ruff format --check .`
- [ ] `python manage.py check`
- [ ] `python manage.py makemigrations --check --dry-run` (no missing migrations)
- [ ] `python manage.py migrate` (applies cleanly to a fresh DB)
- [ ] `python manage.py test` (full suite)
- [ ] pip-audit clean (`pip-audit -r backend/requirements.txt`)
- [ ] `python manage.py check --deploy` findings reviewed (prod profile)
- [ ] gitleaks clean (CI runs it; locally `pre-commit` covers key-regex basics)

## For behavior-visible changes only
- [ ] Endpoint smoke: status + payload shape vs. contract (`docs/07-backend-contract.md`)
- [ ] Refactor parity: `backend/scripts/parity_capture.sh` before/after diff = zero (volatile keys normalized)

## Rollback safety
<!-- If a migration is included: confirm it is additive/backward-compatible; note the revert plan. -->
