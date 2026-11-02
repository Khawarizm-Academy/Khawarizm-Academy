"""Tests for the canonical access catalog, role policy, and account bridge."""

from __future__ import annotations

import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from types import SimpleNamespace

from django.core.exceptions import ValidationError
from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase, override_settings, skipUnlessDBFeature

from features.access.models import AccessRole, AuditEvent, RoleAssignment
from features.access.permissions import perm, perm_any
from features.access.registry import (
    INSTRUCTOR_PERMISSIONS,
    OWN_KINDS,
    PERMISSION_KEYS,
    PERMISSIONS,
    ROLE_TEMPLATES,
    STUDENT_PERMISSIONS,
    expand_permission_keys,
    permission_catalog,
    registry_errors,
)
from features.access.services import (
    assign_roles,
    bootstrap_system_roles,
    can_grant,
    can_manage_role,
    create_role_from_template,
    delete_role,
    effective_permissions,
    effective_roles,
    has_object_perm,
    has_perm,
    highest_position,
    record_audit,
    reorder_roles,
    revoke_role,
    sync_primary_role,
    update_role,
)
from features.auth.models import InstructorProfile, StudentProfile, User
from features.common.choices import AuditAction, Role
from features.common.errors import InvalidParameter, PermissionDenied, RoleHasMembers
from features.common.testing import make_admin, make_user


def role_row(slug: str, permissions: list[str], *, position: int = 100, **overrides) -> AccessRole:
    fields = {
        "slug": slug,
        "name": slug.replace("-", " ").title(),
        "description": "Test role.",
        "color": "cyan",
        "position": position,
        "permissions": permissions,
    }
    fields.update(overrides)
    return AccessRole.objects.create(**fields)


def assign(user: User, role: AccessRole, assigned_by: User | None = None) -> RoleAssignment:
    return RoleAssignment.objects.create(user=user, role=role, assigned_by=assigned_by)


class PermissionRegistryTests(TestCase):
    def test_registry_keys_implications_ownership_and_templates_are_valid(self):
        self.assertEqual(registry_errors(), [])
        self.assertEqual(len(PERMISSION_KEYS), 68)
        self.assertEqual(len(PERMISSION_KEYS), len(set(PERMISSION_KEYS)))
        self.assertTrue(all(key in PERMISSIONS for key in OWN_KINDS))
        self.assertTrue(
            all(key in PERMISSIONS for template in ROLE_TEMPLATES.values() for key in template["permissions"])
        )
        self.assertFalse(any(PERMISSIONS[key].elevated for key in STUDENT_PERMISSIONS))

    def test_any_permissions_imply_their_own_variants_and_administrator_is_full(self):
        self.assertIn("courses.edit_own", expand_permission_keys(["courses.edit_any"]))
        self.assertEqual(expand_permission_keys(["administrator"]), frozenset(PERMISSION_KEYS))

    def test_frontend_catalog_is_an_exact_generated_copy_of_the_backend_registry(self):
        repo_root = Path(__file__).resolve().parents[3]
        catalog_path = repo_root / "frontend" / "src" / "shared" / "json" / "permissionCatalog.json"
        with catalog_path.open(encoding="utf-8") as catalog_file:
            self.assertEqual(json.load(catalog_file), permission_catalog())


class EffectivePermissionTests(TestCase):
    def test_student_gets_the_implicit_default_role_without_an_assignment_row(self):
        student = make_user(email="implicit.student@example.com")
        permissions = effective_permissions(student)

        self.assertEqual(permissions, frozenset(STUDENT_PERMISSIONS))
        self.assertNotIn("studio.access", permissions)
        self.assertFalse(student.role_assignments.exists())
        self.assertEqual([role.slug for role in effective_roles(student)], ["student"])

    def test_instructor_has_exact_template_and_default_permissions(self):
        instructor = make_user(email="exact.instructor@example.com", role=Role.INSTRUCTOR)
        expected = expand_permission_keys([*STUDENT_PERMISSIONS, *INSTRUCTOR_PERMISSIONS])

        self.assertEqual(effective_permissions(instructor), expected)
        self.assertEqual({role.slug for role in effective_roles(instructor)}, {"student", "instructor"})

    def test_assignments_are_unioned_and_implications_are_expanded(self):
        instructor = AccessRole.objects.get(slug="instructor")
        moderator = role_row("course-editor", ["courses.edit_any"], position=150)
        user = make_user(email="union@example.com")
        assign(user, instructor)
        assign(user, moderator)
        sync_primary_role(user)

        permissions = effective_permissions(user)
        self.assertIn("studio.access", permissions)
        self.assertIn("courses.edit_any", permissions)
        self.assertIn("courses.edit_own", permissions)
        self.assertEqual(user.role, Role.INSTRUCTOR)

    def test_administrator_short_circuits_to_the_entire_catalog(self):
        admin = make_admin(email="full.admin@example.com")
        self.assertEqual(effective_permissions(admin), frozenset(PERMISSION_KEYS))
        self.assertTrue(has_perm(admin, "system.maintenance"))

    def test_anonymous_users_have_no_permissions(self):
        from django.contrib.auth.models import AnonymousUser

        self.assertEqual(effective_permissions(AnonymousUser()), frozenset())

    def test_legacy_staff_flag_remains_an_administrator_bridge(self):
        legacy_staff = User.objects.create_user(
            email="legacy.staff@example.com",
            password="pass",
            role=Role.STUDENT,
            is_staff=True,
        )
        self.assertTrue(has_perm(legacy_staff, "administrator"))
        self.assertEqual(effective_permissions(legacy_staff), frozenset(PERMISSION_KEYS))

    def test_cold_permission_snapshot_uses_two_queries_and_warm_snapshot_uses_none(self):
        user = User.objects.create_user(email="query.pin@example.com", password="pass")

        with self.assertNumQueries(2):
            cold = effective_permissions(user)
        with self.assertNumQueries(0):
            warm = effective_permissions(user)

        self.assertEqual(cold, warm)

    @override_settings(DEBUG=True)
    def test_unknown_permission_key_fails_loudly_in_debug(self):
        user = make_user(email="unknown.key@example.com")
        with self.assertRaisesRegex(ValueError, "Unknown permission key"):
            has_perm(user, "course.edti")

    def test_object_permissions_use_the_registered_staff_kind_matrix(self):
        instructor = make_user(email="object.owner@example.com", role=Role.INSTRUCTOR)
        self.assertTrue(has_object_perm(instructor, "courses.edit_own", {"owner"}))
        self.assertTrue(has_object_perm(instructor, "courses.edit_own", {"co_instructor"}))
        self.assertFalse(has_object_perm(instructor, "courses.edit_own", {"assistant"}))
        self.assertTrue(has_object_perm(instructor, "announcements.post", {"assistant"}))
        self.assertFalse(has_object_perm(instructor, "announcements.post", {"observer"}))

    def test_any_object_permission_bypasses_ownership_kind(self):
        user = make_user(email="any.editor@example.com")
        elevated_editor = role_row("any-editor", ["courses.edit_any"], position=200)
        assign(user, elevated_editor)
        self.assertTrue(has_object_perm(user, "courses.edit_own", set()))

    def test_unmapped_own_checks_fail_closed_at_the_object_boundary(self):
        user = make_user(email="own-only@example.com", role=Role.INSTRUCTOR)
        self.assertFalse(has_object_perm(user, "videos.manage_own", {"owner"}))


class RolePolicyTests(TestCase):
    def setUp(self):
        self.admin = make_admin(email="policy.admin@example.com")

    def test_highest_position_and_strict_hierarchy(self):
        manager = make_user(email="role.manager@example.com")
        manager_role = role_row("role-manager", ["roles.manage", "users.assign_roles"], position=400)
        assign(manager, manager_role)
        lower = role_row("lower-role", ["courses.create"], position=200)
        same = role_row("same-role", ["courses.create"], position=400)
        higher = role_row("higher-role", ["courses.create"], position=600)

        self.assertEqual(highest_position(manager), 400)
        self.assertTrue(can_manage_role(manager, lower))
        self.assertFalse(can_manage_role(manager, same))
        self.assertFalse(can_manage_role(manager, higher))
        self.assertTrue(can_manage_role(self.admin, higher))

    def test_system_admin_role_is_manageable_only_by_administrators(self):
        student = make_user(email="not.admin@example.com")
        admin_role = AccessRole.objects.get(slug="admin")
        self.assertFalse(can_manage_role(student, admin_role))
        self.assertTrue(can_manage_role(self.admin, admin_role))
        with self.assertRaises(PermissionDenied):
            delete_role(self.admin, admin_role)
        with self.assertRaises(PermissionDenied):
            delete_role(self.admin, AccessRole.objects.get(slug="student"))

    def test_grant_policy_requires_every_permission_and_blocks_unheld_elevated_keys(self):
        instructor = make_user(email="grant.instructor@example.com", role=Role.INSTRUCTOR)
        self.assertTrue(can_grant(instructor, ["courses.edit_own", "studio.access"]))
        self.assertFalse(can_grant(instructor, ["courses.edit_any"]))
        self.assertFalse(can_grant(instructor, ["system.maintenance"]))
        self.assertTrue(can_grant(self.admin, ["administrator", "system.maintenance"]))

    def test_default_role_rejects_elevated_permissions_and_explicit_assignment(self):
        student_role = AccessRole.objects.get(slug="student")
        student_role.permissions = [*student_role.permissions, "users.delete"]
        with self.assertRaises(ValidationError):
            student_role.save()

        student = make_user(email="no-explicit-default@example.com")
        with self.assertRaises(ValidationError):
            assign(student, student_role)

    def test_admin_role_permissions_are_locked(self):
        admin_role = AccessRole.objects.get(slug="admin")
        admin_role.permissions = ["admin.access"]
        with self.assertRaises(ValidationError):
            admin_role.save()

    def test_create_from_template_copies_registry_permissions_and_audits(self):
        role = create_role_from_template(self.admin, "teaching_assistant", {"name": "مساعد"})

        self.assertEqual(role.permissions, ROLE_TEMPLATES["teaching_assistant"]["permissions"])
        self.assertEqual(role.template_key, "teaching_assistant")
        event = AuditEvent.objects.get(action=AuditAction.ROLE_CREATED, target_id=str(role.pk))
        self.assertEqual(event.detail["after"]["permissionsAdded"], role.permissions)
        self.assertNotIn("permissions", event.detail["after"]["role"])

    def test_role_update_audit_captures_metadata_and_permission_diffs_only(self):
        role = role_row("audited-edit", ["courses.create"])

        update_role(
            self.admin,
            role,
            {
                "name": "Updated",
                "description": "A new description",
                "color": "gold",
                "permissions": ["courses.create", "courses.edit_own"],
            },
        )

        event = AuditEvent.objects.get(action=AuditAction.ROLE_UPDATED, target_id=str(role.pk))
        self.assertEqual(event.detail["before"]["color"], "cyan")
        self.assertEqual(event.detail["after"]["color"], "gold")
        self.assertEqual(event.detail["after"]["permissionsAdded"], ["courses.edit_own"])
        self.assertNotIn("permissions", event.detail["before"])
        self.assertNotIn("permissions", event.detail["after"])

    def test_role_permission_changes_resynchronize_primary_role(self):
        target = make_user(email="role-sync-target@example.com")
        role = role_row("studio-editor", ["courses.enroll"])
        assign(target, role)
        sync_primary_role(target)
        self.assertEqual(target.role, Role.STUDENT)

        update_role(self.admin, role, {"permissions": ["courses.enroll", "studio.access"]})
        target.refresh_from_db()
        self.assertEqual(target.role, Role.INSTRUCTOR)
        self.assertTrue(InstructorProfile.objects.filter(user=target).exists())

        update_role(self.admin, role, {"permissions": ["courses.enroll"]})
        target.refresh_from_db()
        self.assertEqual(target.role, Role.STUDENT)
        self.assertFalse(target.is_staff)

    def test_role_edit_cannot_remove_the_last_administrator(self):
        RoleAssignment.objects.filter(user=self.admin).delete()
        self.admin.role = Role.STUDENT
        self.admin.is_staff = False
        self.admin.save(update_fields=["role", "is_staff"])

        target = make_user(email="only-custom-admin@example.com")
        custom_admin = role_row("only-custom-admin", ["administrator"], position=100)
        assign(target, custom_admin)
        sync_primary_role(target)
        manager = make_user(email="last-admin-role-manager@example.com")
        manager_role = role_row("last-admin-manager", ["roles.manage"], position=500)
        assign(manager, manager_role)
        sync_primary_role(manager)

        with self.assertRaises(PermissionDenied):
            update_role(manager, custom_admin, {"permissions": []})

        custom_admin.refresh_from_db()
        target.refresh_from_db()
        self.assertEqual(custom_admin.permissions, ["administrator"])
        self.assertTrue(target.is_admin)

    def test_update_role_rejects_unheld_new_permissions(self):
        manager = make_user(email="limited.manager@example.com")
        manager_role = role_row(
            "limited-role-manager", ["roles.manage", "users.assign_roles", "courses.create"], position=500
        )
        assign(manager, manager_role)
        target_role = role_row("editable-role", ["courses.create"], position=100)

        with self.assertRaises(PermissionDenied):
            update_role(manager, target_role, {"permissions": ["courses.create", "users.delete"]})

    def test_admin_role_is_read_only_even_for_an_administrator(self):
        with self.assertRaises(PermissionDenied):
            update_role(self.admin, AccessRole.objects.get(slug="admin"), {"name": "Changed"})

    def test_reordering_roles_keeps_system_roles_pinned_and_audits_changes(self):
        first = role_row("first-custom", ["courses.create"], position=100)
        second = role_row("second-custom", ["courses.create"], position=200)

        reordered = reorder_roles(self.admin, [first.pk, second.pk])

        self.assertEqual(AccessRole.objects.get(slug="admin").position, 1000)
        self.assertEqual(AccessRole.objects.get(slug="student").position, 0)
        self.assertGreater(AccessRole.objects.get(pk=first.pk).position, AccessRole.objects.get(pk=second.pk).position)
        self.assertEqual(len(reordered), AccessRole.objects.count())
        self.assertTrue(AuditEvent.objects.filter(action=AuditAction.ROLE_REORDERED).exists())

    def test_delete_requires_reassignment_when_a_role_has_members(self):
        custom = role_row("delete-me", ["courses.create"], position=100)
        member = make_user(email="delete.member@example.com")
        assign(member, custom)

        with self.assertRaises(RoleHasMembers) as blocked:
            delete_role(self.admin, custom)
        self.assertEqual(blocked.exception.count, 1)

        result = delete_role(self.admin, custom, reassign_to=AccessRole.objects.get(slug="student"))
        member.refresh_from_db()
        self.assertTrue(result["deleted"])
        self.assertFalse(member.role_assignments.exists())
        self.assertEqual(member.role, Role.STUDENT)
        self.assertTrue(AuditEvent.objects.filter(action=AuditAction.ROLE_DELETED).exists())

    def test_bootstrap_is_idempotent_and_backfills_admin_staff_and_instructor(self):
        legacy_admin = User.objects.create_user(email="old.admin@example.com", password="pass", role=Role.ADMIN)
        legacy_staff = User.objects.create_user(email="old.staff@example.com", password="pass", is_staff=True)
        legacy_instructor = User.objects.create_user(
            email="old.instructor@example.com", password="pass", role=Role.INSTRUCTOR
        )
        ordinary_student = User.objects.create_user(email="old.student@example.com", password="pass")

        first = bootstrap_system_roles()
        role_count = AccessRole.objects.count()
        assignment_count = RoleAssignment.objects.count()
        second = bootstrap_system_roles()

        self.assertEqual(AccessRole.objects.count(), role_count)
        self.assertEqual(RoleAssignment.objects.count(), assignment_count)
        self.assertEqual(set(first), {"student", "admin", "instructor"})
        self.assertEqual(set(second), {"student", "admin", "instructor"})
        self.assertTrue(legacy_admin.role_assignments.filter(role__slug="admin").exists())
        self.assertTrue(legacy_staff.role_assignments.filter(role__slug="admin").exists())
        self.assertTrue(legacy_instructor.role_assignments.filter(role__slug="instructor").exists())
        self.assertFalse(ordinary_student.role_assignments.exists())

    def test_assigning_instructor_updates_primary_role_profiles_and_audit(self):
        target = make_user(email="assigned.instructor@example.com")
        instructor_role = AccessRole.objects.get(slug="instructor")

        updated = assign_roles(self.admin, target, [instructor_role.pk])

        self.assertEqual(updated.role, Role.INSTRUCTOR)
        self.assertTrue(StudentProfile.objects.filter(user=updated).exists())
        self.assertTrue(InstructorProfile.objects.filter(user=updated).exists())
        self.assertTrue(AuditEvent.objects.filter(action=AuditAction.ROLE_ASSIGNED, target_id=str(updated.pk)).exists())

    def test_default_role_in_role_id_payload_remains_implicit(self):
        target = make_user(email="implicit.payload@example.com")
        student_role = AccessRole.objects.get(slug="student")

        assign_roles(self.admin, target, [student_role.pk])

        self.assertFalse(RoleAssignment.objects.filter(user=target, role=student_role).exists())
        self.assertEqual(target.role, Role.STUDENT)

    def test_unknown_role_id_is_rejected_as_a_bad_parameter(self):
        target = make_user(email="unknown-role-target@example.com")

        with self.assertRaises(InvalidParameter):
            assign_roles(self.admin, target, [uuid.uuid4()])

    def test_revoke_role_uses_assignment_guards_and_records_an_audit(self):
        target = make_user(email="revoke.target@example.com", role=Role.INSTRUCTOR)
        instructor_role = AccessRole.objects.get(slug="instructor")

        updated = revoke_role(self.admin, target, instructor_role.pk)

        self.assertEqual(updated.role, Role.STUDENT)
        self.assertFalse(updated.role_assignments.exists())
        self.assertTrue(AuditEvent.objects.filter(action=AuditAction.ROLE_REVOKED, target_id=str(updated.pk)).exists())

    def test_self_demotion_and_last_administrator_removal_are_rejected(self):
        with self.assertRaises(PermissionDenied):
            assign_roles(self.admin, self.admin, [])

        # The shared setup admin would otherwise remain as a valid replacement.
        RoleAssignment.objects.filter(user=self.admin).delete()
        self.admin.role = Role.STUDENT
        self.admin.is_staff = False
        self.admin.save(update_fields=["role", "is_staff"])
        sole_admin = make_user(email="sole.custom.admin@example.com")
        custom_admin = role_row("custom-admin", ["administrator"], position=100)
        assign(sole_admin, custom_admin)
        manager = make_user(email="nonadmin.manager@example.com")
        manager_role = role_row(
            "nonadmin-role-manager",
            ["roles.manage", "users.assign_roles"],
            position=500,
        )
        assign(manager, manager_role)
        with self.assertRaises(PermissionDenied):
            assign_roles(manager, sole_admin, [])

    def test_sync_primary_role_never_changes_superuser(self):
        superuser = User.objects.create_user(
            email="superuser-flag@example.com",
            password="pass",
            role=Role.STUDENT,
            is_staff=False,
            is_superuser=True,
        )

        sync_primary_role(superuser)

        superuser.refresh_from_db()
        self.assertTrue(superuser.is_superuser)
        self.assertEqual(superuser.role, Role.STUDENT)

    def test_record_audit_accepts_a_bare_request_and_redacts_secret_keys(self):
        event = record_audit(
            AuditAction.SETTINGS_CHANGED,
            actor=self.admin,
            target_type="settings",
            target_id="global",
            detail={
                "before": {"safe": "x", "password": "secret"},
                "after": {
                    "token": "hidden",
                    "refreshToken": "hidden",
                    "apiKey": "hidden",
                    "clientSecret": "hidden",
                    "nested": {"privateKey": "hidden", "httpOnlyCookie": "hidden"},
                },
            },
        )

        self.assertIsNone(event.ip_address)
        self.assertEqual(event.detail, {"before": {"safe": "x"}, "after": {"nested": {}}})

    def test_drf_permission_factory_uses_the_shared_denial_envelope(self):
        student = make_user(email="permission.factory@example.com")
        permission = perm("courses.create")()
        with self.assertRaises(PermissionDenied) as denied:
            permission.has_permission(SimpleNamespace(user=student), None)
        self.assertEqual(denied.exception.default_code, "permission_denied")

        admin_permission = perm("courses.create")()
        self.assertTrue(admin_permission.has_permission(SimpleNamespace(user=self.admin), None))
        any_permission = perm_any("courses.create", "admin.access")()
        self.assertTrue(any_permission.has_permission(SimpleNamespace(user=self.admin), None))


@skipUnlessDBFeature("has_select_for_update")
class ConcurrentAdministratorGuardTests(TransactionTestCase):
    """Two concurrent demotions must serialize on the stable admin-role row."""

    reset_sequences = True

    def setUp(self):
        self.first = User.objects.create_superuser(email="concurrent.first@example.com", password="pass")
        self.second = User.objects.create_superuser(email="concurrent.second@example.com", password="pass")

    @staticmethod
    def _demote(actor_id, target_id, barrier):
        close_old_connections()
        try:
            actor = User.objects.get(pk=actor_id)
            target = User.objects.get(pk=target_id)
            barrier.wait(timeout=10)
            try:
                assign_roles(actor, target, [])
            except PermissionDenied:
                return "denied"
            return "demoted"
        finally:
            close_old_connections()

    def test_simultaneous_cross_demotions_leave_one_administrator(self):
        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [
                pool.submit(self._demote, self.first.pk, self.second.pk, barrier),
                pool.submit(self._demote, self.second.pk, self.first.pk, barrier),
            ]
            results = [future.result(timeout=30) for future in futures]

        self.assertCountEqual(results, ["demoted", "denied"])
        self.assertEqual(User.objects.filter(is_staff=True).count(), 1)
        self.assertEqual(RoleAssignment.objects.filter(role__slug="admin").count(), 1)
