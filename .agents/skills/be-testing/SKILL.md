---
name: be-testing
description: Backend testing strategy - what to test per feature (models, serializers, routes, services, permissions), a shared test kit with factories and an authenticated client, in-memory databases, query-count assertions, offline tests for third-party providers, contract tests, and CI. Use when adding or changing backend code, writing a feature's tests, or setting up a test suite.
---

# Backend Testing

Every feature ships tests for **models, serializers, and routes**. Fast, offline, deterministic.

## 1. What to test (per feature)

| Layer | Assert |
| --- | --- |
| Models | `__str__`, defaults, ordering, unique/check constraints, computed properties |
| Serializers | exact contract keys, casing, `compact` drops empties, numbers not decimals |
| Services | business rules, edge cases, idempotency, transaction behavior |
| Routes | status codes, payload shape, 404 for missing, 400/422 for bad input, auth required (401/403), pagination caps |
| Permissions | a user cannot read/modify another user's object (object-level) |
| Performance guards | **query count** is constant (`assertNumQueries` or equivalent), one commit per write ([`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md)) |

## 2. A shared test kit (write once, use everywhere)

Put it in the common module (`common/testing`) and never hand-roll in feature tests:

- `ApiTestCase` / base fixture whose client already passes origin/CORS middleware.
- `api_client()` and a fake request with a realistic user-agent + IP.
- `authenticate(client, user)` that opens a real session/token.
- Factories: `make_user()`, `make_admin()`, `make_course()` ... each fills **every required field** so tests do not break when a column is added.

## 3. Rules

- **In-memory/ephemeral database** for tests; never touch the dev database.
- **No network.** Third-party providers (storage, payments, email, identity) are mocked at the client boundary, and the code under test must work with cached/seeded data. Design providers so they can be offline-tested ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)).
- **No sleeps, no order dependence, no shared mutable state.** Freeze time for expiry logic.
- Test behavior and contracts, not private implementation.
- One reason to fail per test; a descriptive name (`test_missing_slug_returns_404_with_message`).
- Cover the unhappy paths as much as the happy ones: invalid input, expired token, duplicate, conflict, permission denied.

## 4. Query-count and N+1 guard

```python
def test_list_uses_constant_queries(self):
    make_courses(30)
    with self.assertNumQueries(4):          # list + category + lessons + count, not 1 + 30 + 30
        self.client.get("/api/courses")
```

## 5. Contract tests

Compare the serializer output to the declared contract (types or JSON schema the frontend also consumes). A failing contract test beats a broken UI.

## 6. Configuration tests

Mock `settings.<KEY>` to cover the missing-keys path of every provider accessor: it must raise a clear error naming the keys ([`be-config-and-secrets`](../be-config-and-secrets/SKILL.md)).

## 7. CI

Run lint, typecheck, migrations check, and the full suite on every push; fail on warnings you care about; cache dependencies; publish coverage as a trend, not a target to game. See [`ops-deployment-and-ci`](../ops-deployment-and-ci/SKILL.md).

## 8. Checklist

- [ ] Models, serializers, routes covered; unhappy paths included.
- [ ] Uses the shared kit and factories; in-memory DB; no network.
- [ ] Object-level permission test exists for every user-owned resource.
- [ ] Query-count assertions on list endpoints; commit count on write endpoints.
- [ ] Missing-config paths tested; time frozen where needed.
