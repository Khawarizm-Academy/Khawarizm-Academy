"""Phase 12 admin-console upgrade tests: bulk role edits, effective-permission inspector,
legacy-bridge retirement, and the practice-set deprecation header."""

from __future__ import annotations

from django.urls import reverse

from features.access.models import AccessRole
from features.common.testing import ApiTestCase, authenticate, make_admin, make_user


class BulkRolesTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin(email="bulk-admin@example.com")
        authenticate(self.client, self.admin)

    def test_bulk_add_assigns_one_role_to_every_selected_user(self):
        role = AccessRole.objects.create(
            slug="assistant-x",
            name="Assistant X",
            description="bulk",
            color="cyan",
            position=50,
            permissions=["courses.create"],
        )
        u1 = make_user(email="bulk-1@example.com")
        u2 = make_user(email="bulk-2@example.com")
        response = self.client.post(
            reverse("admin-users-bulk-roles"),
            {"userIds": [str(u1.pk), str(u2.pk)], "roleId": str(role.pk), "mode": "add"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertTrue(all(row["ok"] for row in results))
        self.assertTrue(u1.role_assignments.filter(role_id=role.pk).exists())
        self.assertTrue(u2.role_assignments.filter(role_id=role.pk).exists())

    def test_bulk_remove_revokes_the_role_only_where_it_was_assigned(self):
        role = AccessRole.objects.create(
            slug="assistant-y",
            name="Assistant Y",
            description="bulk",
            color="cyan",
            position=50,
            permissions=["courses.create"],
        )
        u1 = make_user(email="bulk-3@example.com")
        u2 = make_user(email="bulk-4@example.com")
        u1.role_assignments.create(role=role, assigned_by=self.admin)
        response = self.client.post(
            reverse("admin-users-bulk-roles"),
            {"userIds": [str(u1.pk), str(u2.pk)], "roleId": str(role.pk), "mode": "remove"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        outcomes = {row["userId"]: row for row in response.json()["results"]}
        self.assertTrue(outcomes[str(u1.pk)]["ok"])
        self.assertFalse(outcomes[str(u2.pk)]["ok"])
        self.assertEqual(outcomes[str(u2.pk)]["code"], "not_assigned")
        self.assertFalse(u1.role_assignments.filter(role_id=role.pk).exists())

    def test_bulk_rejects_a_missing_or_empty_selection(self):
        role = AccessRole.objects.get(slug="instructor")
        response = self.client.post(
            reverse("admin-users-bulk-roles"),
            {"userIds": [], "roleId": str(role.pk), "mode": "add"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class EffectivePermissionsInspectorTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin(email="inspector-admin@example.com")
        authenticate(self.client, self.admin)

    def test_administrator_bypass_marks_every_permission_administrator(self):
        body = self.client.get(reverse("admin-user-effective-permissions", args=[self.admin.pk])).json()
        items = body["items"]
        self.assertTrue(items, "expected at least one permission for the admin")
        self.assertTrue(all(item["administrator"] for item in items))

    def test_direct_assignment_lists_the_granting_role(self):
        role = AccessRole.objects.create(
            slug="reviewer-1",
            name="Reviewer",
            description="can review",
            color="gold",
            position=60,
            permissions=["courses.review"],
        )
        learner = make_user(email="reviewer-learner@example.com")
        learner.role_assignments.create(role=role, assigned_by=self.admin)
        body = self.client.get(reverse("admin-user-effective-permissions", args=[learner.pk])).json()
        review = next((item for item in body["items"] if item["key"] == "courses.review"), None)
        self.assertIsNotNone(review)
        self.assertEqual(review["grantedBy"][0]["roleSlug"], "reviewer-1")
        self.assertFalse(review["administrator"])

    def test_implied_permission_lists_the_parent_key_as_via(self):
        # `courses.edit_any` implies `courses.edit_own`; holding only the
        # parent should surface the child entry with a `via` trace.
        role = AccessRole.objects.create(
            slug="editor-any",
            name="Editor Any",
            description="edits everything",
            color="cyan",
            position=60,
            permissions=["courses.edit_any"],
        )
        learner = make_user(email="editor-any@example.com")
        learner.role_assignments.create(role=role, assigned_by=self.admin)
        body = self.client.get(reverse("admin-user-effective-permissions", args=[learner.pk])).json()
        own = next((item for item in body["items"] if item["key"] == "courses.edit_own"), None)
        self.assertIsNotNone(own)
        self.assertIn("courses.edit_any", own["via"])
        self.assertEqual(own["grantedBy"], [])


class PracticeSetDeprecationTests(ApiTestCase):
    def test_legacy_shared_problems_endpoint_carries_deprecation_header(self):
        response = self.client.get("/api/problems")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Deprecation"], "true")
        self.assertIn("Sunset", response)

    def test_quiz_backed_course_problems_is_not_marked_deprecated(self):
        # When a course has a practice quiz, the endpoint serves the quiz and
        # does not emit the legacy deprecation headers.
        from features.courses.models import Course
        from features.quizzes.models import Question, Quiz, QuizKind

        course = Course.objects.create(
            slug="quiz-backed",
            title="Quiz Backed",
            tagline="t",
            about="d",
            instructor="i",
            course_level="beginner",
            price_type="free",
            duration="1h",
            lessons_count=0,
            status="published",
        )
        quiz = Quiz.objects.create(
            course=course,
            kind=QuizKind.PRACTICE,
            title="P",
            is_published=True,
        )
        Question.objects.create(quiz=quiz, prompt="Q", kind="single", order=1)
        response = self.client.get(f"/api/courses/{course.slug}/problems")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Deprecation", response)
