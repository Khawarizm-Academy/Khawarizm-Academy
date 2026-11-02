"""Focused contract tests for the Phase 2 role manager endpoints."""

from __future__ import annotations

import uuid

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status

from features.access.models import AccessRole, RoleAssignment
from features.access.services import assign_roles, list_roles, record_audit, role_members_page
from features.common.choices import AuditAction
from features.common.testing import ApiTestCase, authenticate, make_admin, make_user


class RoleManagerApiTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin(email="role-api-admin@example.com")
        authenticate(self.client, self.admin)

    def role(self, slug="api-editor", permissions=None, position=100):
        return AccessRole.objects.create(
            slug=slug,
            name=slug.replace("-", " ").title(),
            description="API test role",
            color="cyan",
            position=position,
            permissions=permissions or ["courses.create"],
        )

    def test_route_reversal_is_static_first_and_exact(self):
        role_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        user_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
        self.assertEqual(reverse("admin-role-catalog"), "/api/admin/roles/catalog")
        self.assertEqual(reverse("admin-roles"), "/api/admin/roles")
        self.assertEqual(reverse("admin-role-reorder"), "/api/admin/roles/reorder")
        self.assertEqual(reverse("admin-role-detail", args=[role_id]), f"/api/admin/roles/{role_id}")
        self.assertEqual(reverse("admin-role-members", args=[role_id]), f"/api/admin/roles/{role_id}/members")
        self.assertEqual(
            reverse("admin-role-member-detail", args=[role_id, user_id]),
            f"/api/admin/roles/{role_id}/members/{user_id}",
        )
        self.assertEqual(reverse("admin-user-roles", args=[user_id]), f"/api/admin/users/{user_id}/roles")
        self.assertEqual(reverse("admin-audit"), "/api/admin/audit")

    def test_role_list_member_counts_use_one_query_independent_of_role_count(self):
        for index in range(15):
            self.role(slug=f"query-budget-{index}")
        with self.assertNumQueries(1):
            rows = list_roles()
        self.assertGreaterEqual(len(rows), 18)
        self.assertEqual(rows[-1].slug, "student")

    def test_catalog_requires_auth_and_uses_private_etag_revalidation(self):
        anonymous = self.client
        anonymous.credentials()
        denied = anonymous.get(reverse("admin-role-catalog"))
        self.assertEqual(denied.status_code, status.HTTP_401_UNAUTHORIZED)

        authenticate(self.client, self.admin)
        response = self.client.get(reverse("admin-role-catalog"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("groups", response.data)
        self.assertIn("templates", response.data)
        self.assertIn("colors", response.data)
        self.assertIn("ETag", response)
        self.assertTrue(response["Cache-Control"].startswith("private"))

        cached = self.client.get(reverse("admin-role-catalog"), HTTP_IF_NONE_MATCH=response["ETag"])
        self.assertEqual(cached.status_code, status.HTTP_304_NOT_MODIFIED)

    def test_student_cannot_read_role_manager(self):
        student = make_user(email="role-api-student@example.com")
        authenticate(self.client, student)
        response = self.client.get(reverse("admin-roles"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "permission_denied")

    def test_lower_rank_manager_cannot_edit_higher_roles_or_grant_missing_permissions(self):
        manager_role = self.role(
            slug="limited-role-manager",
            permissions=["roles.view", "roles.manage", "users.assign_roles"],
            position=50,
        )
        manager = make_user(email="limited-role-manager@example.com")
        assign_roles(self.admin, manager, [manager_role.pk])
        protected = self.role(slug="higher-role", permissions=["courses.create"], position=80)
        authenticate(self.client, manager)

        current = self.client.get(reverse("admin-role-detail", args=[protected.pk]))
        self.assertEqual(current.status_code, status.HTTP_200_OK)
        blocked_edit = self.client.patch(
            reverse("admin-role-detail", args=[protected.pk]),
            {"name": "Escalated", "expectedUpdatedAt": current.data["updatedAt"]},
            format="json",
        )
        self.assertEqual(blocked_edit.status_code, status.HTTP_403_FORBIDDEN)

        blocked_grant = self.client.post(
            reverse("admin-roles"),
            {"name": "Cannot Grant Publish", "color": "cyan", "permissions": ["courses.publish"]},
            format="json",
        )
        self.assertEqual(blocked_grant.status_code, status.HTTP_403_FORBIDDEN)

    def test_role_crud_and_stale_update_conflict(self):
        created = self.client.post(
            reverse("admin-roles"),
            {
                "name": "API Editor",
                "slug": "api-editor",
                "color": "cyan",
                "description": "Created through the role API",
                "permissions": ["courses.create"],
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["slug"], "api-editor")
        self.assertEqual(created.data["permissions"], ["courses.create"])

        role_id = created.data["id"]
        detail = self.client.get(reverse("admin-role-detail", args=[role_id]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        stale = self.client.patch(
            reverse("admin-role-detail", args=[role_id]),
            {"name": "Stale", "expectedUpdatedAt": "2000-01-01T00:00:00Z"},
            format="json",
        )
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(stale.data["code"], "conflict")

        updated = self.client.patch(
            reverse("admin-role-detail", args=[role_id]),
            {"name": "Updated Editor", "expectedUpdatedAt": detail.data["updatedAt"]},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["name"], "Updated Editor")

    def test_system_role_delete_is_denied_and_member_delete_requires_reassignment(self):
        student = AccessRole.objects.get(slug="student")
        blocked = self.client.delete(reverse("admin-role-detail", args=[student.pk]))
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)

        custom = self.role("member-role")
        member = make_user(email="role-member@example.com")
        RoleAssignment.objects.create(user=member, role=custom, assigned_by=self.admin)
        conflict = self.client.delete(reverse("admin-role-detail", args=[custom.pk]))
        self.assertEqual(conflict.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(conflict.data["code"], "role_has_members")
        self.assertEqual(conflict.data["count"], 1)

        deleted = self.client.delete(f"{reverse('admin-role-detail', args=[custom.pk])}?reassignTo={student.pk}")
        self.assertEqual(deleted.status_code, status.HTTP_200_OK)
        self.assertEqual(deleted.data, {"deleted": True})

    def test_default_role_members_are_paged_and_include_roles(self):
        make_user(email="default-member@example.com")
        student = AccessRole.objects.get(slug="student")
        response = self.client.get(reverse("admin-role-members", args=[student.pk]), {"page": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["pageSize"], 20)
        self.assertTrue(all("roles" in row for row in response.data["results"]))

    def test_member_page_query_count_stays_constant_as_the_page_fills(self):
        role = self.role("member-query-budget")
        first = make_user(email="member-budget-000@example.com")
        RoleAssignment.objects.create(user=first, role=role, assigned_by=self.admin)
        with CaptureQueriesContext(connection) as one_member_queries:
            role_members_page(role.pk, actor=self.admin)

        users = [first]
        for index in range(1, 25):
            users.append(make_user(email=f"member-budget-{index:03d}@example.com"))
        RoleAssignment.objects.bulk_create(
            [RoleAssignment(user=user, role=role, assigned_by=self.admin) for user in users[1:]]
        )
        with CaptureQueriesContext(connection) as many_member_queries:
            _, members, _ = role_members_page(role.pk, actor=self.admin)

        self.assertEqual(len(members), 20)
        self.assertEqual(len(one_member_queries), len(many_member_queries))

    def test_bulk_assignment_returns_per_id_outcomes_and_replacement_returns_user_row(self):
        role = self.role("assignable", ["courses.create"])
        first = make_user(email="bulk-one@example.com")
        second = make_user(email="bulk-two@example.com")
        response = self.client.post(
            reverse("admin-role-members", args=[role.pk]),
            {"userIds": [str(first.pk), str(second.pk), str(uuid.uuid4())]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)
        self.assertTrue(all("userId" in item and "ok" in item for item in response.data["results"]))

        replaced = self.client.put(
            reverse("admin-user-roles", args=[first.pk]),
            {"roleIds": [str(role.pk)]},
            format="json",
        )
        self.assertEqual(replaced.status_code, status.HTTP_200_OK)
        self.assertIn("roles", replaced.data)

        removed = self.client.delete(reverse("admin-role-member-detail", args=[role.pk, first.pk]))
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.assertEqual(removed.data, {"removed": True})

    def test_audit_endpoint_supports_contract_filters_and_pagination(self):
        record_audit(
            AuditAction.ROLE_CREATED,
            actor=self.admin,
            target_type="role",
            target_id="target-role",
            detail={"before": {}, "after": {"permissionsAdded": ["courses.create"]}},
        )
        response = self.client.get(
            reverse("admin-audit"),
            {"action": AuditAction.ROLE_CREATED, "actor": str(self.admin.pk), "targetType": "role", "page": 1},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["pageSize"], 20)
        self.assertTrue(response.data["results"])
        row = response.data["results"][0]
        self.assertIn("actor", row)
        self.assertIn("targetType", row)
        self.assertIn("createdAt", row)

    def test_audit_endpoint_rejects_invalid_filter_values(self):
        invalid_actor = self.client.get(reverse("admin-audit"), {"actor": "not-a-uuid"})
        self.assertEqual(invalid_actor.status_code, status.HTTP_400_BAD_REQUEST)
        invalid_action = self.client.get(reverse("admin-audit"), {"action": "not-an-action"})
        self.assertEqual(invalid_action.status_code, status.HTTP_400_BAD_REQUEST)
