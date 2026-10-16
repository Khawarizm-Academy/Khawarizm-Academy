"""Tests for the scholarships feature — model, serializer, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, make_scholarship
from features.scholarships.models import Scholarship
from features.scholarships.serializers import scholarship_catalog_item


class ScholarshipModelTests(TestCase):
    def test_str_returns_the_title(self):
        self.assertEqual(str(make_scholarship(title="Global")), "Global")

    def test_slug_is_the_primary_key(self):
        self.assertEqual(Scholarship._meta.pk.name, "slug")

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
        self.assertEqual(response.json(), {"detail": "المنحة غير موجودة"})

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


class ScholarshipUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("scholarship-detail", args=["s"]), "/api/scholarships/s")
        self.assertEqual(reverse("scholarship-apply", args=["s"]), "/api/scholarships/s/apply")
        self.assertEqual(reverse("scholarship-save", args=["s"]), "/api/scholarships/s/save")


class ScholarshipAdminTests(TestCase):
    def test_scholarship_is_registered(self):
        self.assertTrue(admin.site.is_registered(Scholarship))
