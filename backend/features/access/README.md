# Access control — التحكم في الصلاحيات

The `access` feature owns the canonical permission catalog and the database-backed roles and assignments used across the academy. It is deliberately independent of course models: resource owners pass the relevant ownership-kind set to `has_object_perm`; `access` never imports `courses`.

## Data

- `AccessRole` stores an immutable slug, Arabic/English display text, a palette color token, hierarchy position, validated permission keys, and system/default/template metadata.
- `RoleAssignment` links a user to an explicit role. The `student` default role is implicit for every account and must not be assigned explicitly.
- `AuditEvent` is the append-only trail for role and assignment changes and future high-impact mutations. Its detail must contain safe before/after diffs only; never put passwords, tokens, secrets, or credentials in it. Access audit rows are retained for 365 days by default (`AUDIT_RETENTION_DAYS`).
- The code-defined registry in `registry.py` defines permission metadata, implication closure, role templates, and the `OWN_KINDS` course-staff matrix.

## Rules and integration

`services.py` is the sole home for effective-permission calculation, object checks, hierarchy/grant policy, role mutations, synchronization of the legacy `User.role`/`is_staff` fields, bootstrap, and audit writes. Effective permissions include the default role, all explicit roles, legacy `is_staff`/superuser compatibility mapped to `administrator`, and catalog implications. They are cached only on the current user object, so a permission mutation becomes visible on the next request and never depends on process-local cache coherence.

The adminconsole exposes the completed role manager under `/api/admin`: permission catalog, role list/detail CRUD, reorder, paged and bulk membership, user role replacement, and the `/api/admin/audit` access-mutation audit trail. Admin API authorization is per method and, for managed content, per content type through these permissions rather than one staff-only gate. `0001_initial` creates schema only. `0002_seed_system_roles` idempotently installs the student/admin roles, materializes the instructor template once, and backfills admin/staff/instructor assignments. Reverse seeding is intentionally a no-op.

## Adding a permission

1. Add its key, Arabic label, one-sentence description, group, elevated flag, and implications to `registry.py`; update role templates and `OWN_KINDS` only where the product rule requires it.
2. Regenerate `frontend/src/shared/json/permissionCatalog.json` from `permission_catalog()` and add the key to the frontend literal union. Backend registry tests and frontend catalog-drift tests must pass together.
3. Add focused service/object-permission tests. Never authorize from a UI flag alone, import resource models into this feature, or add an elevated key to the implicit default role.
