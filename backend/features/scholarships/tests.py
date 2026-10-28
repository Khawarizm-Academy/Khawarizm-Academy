"""Tests for the scholarships feature — model, serializer, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, authenticate, make_scholarship, make_user
from features.scholarships.models import Scholarship, ScholarshipApplication
from features.scholarships.serializers import scholarship_catalog_item


class ScholarshipModelTests(TestCase):
    def test_str_returns_the_title(self):
        self.assertEqual(str(make_scholarship(title="Global")), "Global")

    def test_slug_is_a_unique_business_key(self):
        self.assertEqual(Scholarship._meta.pk.name, "id")
        self.assertTrue(Scholarship._meta.get_field("slug").unique)

    def test_days_remaining_is_optional(self):
        self.assertIsNone(make_scholarship().days_remaining)


class ScholarshipCatalogSerializerTests(TestCase):
    def test_type_and_id(self):
        item = scholarship_catalog_item(make_scholarship(slug="scholarship-1"))
        self.assertEqual((item["type"], item["id"]), ("scholarship", "scholarship-1"))

    def test_drops_empty_optional_fields(self):
        self.assertNotIn("country", scholarship_catalog_item(make_scholarship()))

    def test_keeps_populated_fields(self):
        item = scholarship_catalog_item(make_scholarship(country="USA", provider="MIT", days_remaining=3))
        self.assertEqual((item["country"], item["provider"], item["daysRemaining"]), ("USA", "MIT", 3))


class ScholarshipViewTests(ApiTestCase):
    def test_detail_returns_the_catalog_item(self):
        make_scholarship(slug="scholarship-1")
        body = self.client.get("/api/scholarships/scholarship-1").json()
        self.assertEqual((body["id"], body["type"]), ("scholarship-1", "scholarship"))

    def test_detail_missing_slug_returns_404(self):
        response = self.client.get("/api/scholarships/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "المنحة غير موجودة", "code": "not_found"})

    def test_apply_acknowledges(self):
        make_scholarship(slug="scholarship-1")
        body = self.client.post("/api/scholarships/scholarship-1/apply", {}, format="json").json()
        self.assertEqual(body, {"applied": True, "scholarshipId": "scholarship-1"})

    def test_save_defaults_to_true(self):
        make_scholarship(slug="scholarship-1")
        body = self.client.post("/api/scholarships/scholarship-1/save", {}, format="json").json()
        self.assertEqual(body, {"saved": True, "scholarshipId": "scholarship-1"})

    def test_save_can_unsave(self):
        make_scholarship(slug="scholarship-1")
        body = self.client.post("/api/scholarships/scholarship-1/save", {"saved": False}, format="json").json()
        self.assertFalse(body["saved"])

    def test_apply_missing_slug_returns_404(self):
        self.assertEqual(self.client.post("/api/scholarships/missing/apply", {}, format="json").status_code, 404)


class ScholarshipPersistenceTests(ApiTestCase):
    def test_save_toggles_for_the_signed_in_learner(self):
        make_scholarship()
        authenticate(self.client, make_user())
        first = self.client.post("/api/scholarships/scholarship-1/save", {}, format="json").json()
        second = self.client.post("/api/scholarships/scholarship-1/save", {}, format="json").json()
        self.assertTrue(first["saved"])
        self.assertFalse(second["saved"])

    def test_apply_creates_the_application_once(self):
        make_scholarship()
        user = make_user()
        authenticate(self.client, user)
        self.client.post("/api/scholarships/scholarship-1/apply", {}, format="json")
        self.client.post("/api/scholarships/scholarship-1/apply", {}, format="json")
        self.assertEqual(ScholarshipApplication.objects.filter(user=user).count(), 1)


class ScholarshipUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("scholarship-detail", args=["s"]), "/api/scholarships/s")
        self.assertEqual(reverse("scholarship-apply", args=["s"]), "/api/scholarships/s/apply")
        self.assertEqual(reverse("scholarship-save", args=["s"]), "/api/scholarships/s/save")


class ScholarshipAdminTests(TestCase):
    def test_scholarship_is_registered(self):
        self.assertTrue(admin.site.is_registered(Scholarship))

    def test_application_is_registered(self):
        self.assertTrue(admin.site.is_registered(ScholarshipApplication))
