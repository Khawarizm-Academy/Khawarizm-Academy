"""Tests for the catalog feature — taxonomy, filters, sorting, and views."""

from __future__ import annotations

from decimal import Decimal

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.catalog.filters import matches, sort_key
from features.catalog.models import Category, FilterGroup, FilterOption
from features.catalog.serializers import catalog_item_for
from features.common.testing import ApiTestCase, make_course, make_scholarship
from features.courses.serializers import course_catalog_item
from features.scholarships.serializers import scholarship_catalog_item


class CategoryModelTests(TestCase):
    def test_str_returns_the_label(self):
        self.assertEqual(str(Category.objects.create(slug="ai", label="الذكاء الاصطناعي")), "الذكاء الاصطناعي")

    def test_slug_is_unique(self):
        self.assertTrue(Category._meta.get_field("slug").unique)


class CatalogItemForTests(TestCase):
    def test_course_dispatches_to_the_course_serializer(self):
        self.assertEqual(catalog_item_for(make_course())["type"], "course")

    def test_scholarship_dispatches_to_the_scholarship_serializer(self):
        self.assertEqual(catalog_item_for(make_scholarship())["type"], "scholarship")


class CatalogFilterTests(TestCase):
    def setUp(self):
        self.course = course_catalog_item(
            make_course(slug="c", course_level="advanced", price_type="paid", category_slug="ai", rating=Decimal("4.5"))
        )
        self.scholarship = scholarship_catalog_item(
            make_scholarship(slug="s", country_slug="usa", degree_level="master", status="open", days_remaining=3)
        )

    def test_type_filter_keeps_only_the_named_pillar(self):
        self.assertTrue(matches(self.course, {"type": "courses"}))
        self.assertFalse(matches(self.scholarship, {"type": "courses"}))
        self.assertTrue(matches(self.scholarship, {"type": "scholarships"}))

    def test_type_all_keeps_everything(self):
        self.assertTrue(matches(self.course, {"type": "all"}))

    def test_field_filter_matches_category_slug(self):
        self.assertTrue(matches(self.course, {"field": "ai"}))
        self.assertFalse(matches(self.course, {"field": "space"}))

    def test_level_filter_reads_the_right_key_per_type(self):
        self.assertTrue(matches(self.course, {"level": "advanced"}))
        self.assertTrue(matches(self.scholarship, {"level": "master"}))

    def test_cost_filter_only_applies_to_courses(self):
        self.assertTrue(matches(self.course, {"cost": "paid"}))
        self.assertTrue(matches(self.scholarship, {"cost": "free"}))

    def test_country_filter_only_applies_to_scholarships(self):
        self.assertTrue(matches(self.scholarship, {"country": "usa"}))
        self.assertTrue(matches(self.course, {"country": "saudi"}))

    def test_status_filter_only_applies_to_scholarships(self):
        self.assertTrue(matches(self.scholarship, {"status": "open"}))
        self.assertTrue(matches(self.course, {"status": "closed"}))

    def test_search_matches_title_and_case_insensitively(self):
        self.assertTrue(matches(self.course, {"q": "python"}))
        self.assertFalse(matches(self.course, {"q": "nothing"}))

    def test_empty_params_keep_everything(self):
        self.assertTrue(matches(self.course, {}))


class CatalogSorterTests(TestCase):
    def test_rating_sorts_descending(self):
        key = sort_key("rating")
        self.assertLess(key({"rating": 5}), key({"rating": 3}))

    def test_deadline_sorts_ascending(self):
        key = sort_key("deadline")
        self.assertLess(key({"daysRemaining": 2}), key({"daysRemaining": 9}))

    def test_unknown_sort_returns_none(self):
        self.assertIsNone(sort_key("newest"))


class CatalogListViewTests(ApiTestCase):
    def test_empty_catalog_returns_one_empty_page(self):
        body = self.client.get("/api/catalog").json()
        self.assertEqual(body, {"items": [], "totalResults": 0, "totalPages": 1, "currentPage": 1})

    def test_interleaves_courses_and_scholarships(self):
        make_course(slug="course-1")
        make_course(slug="course-2")
        make_scholarship(slug="scholarship-1")
        ids = [item["id"] for item in self.client.get("/api/catalog").json()["items"]]
        self.assertEqual(ids, ["course-1", "scholarship-1", "course-2"])

    def test_paginates_six_per_page(self):
        for index in range(7):
            make_course(slug=f"course-{index}")
        first = self.client.get("/api/catalog").json()
        self.assertEqual((len(first["items"]), first["totalResults"], first["totalPages"]), (6, 7, 2))
        second = self.client.get("/api/catalog", {"page": 2}).json()
        self.assertEqual((len(second["items"]), second["currentPage"]), (1, 2))

    def test_page_is_clamped_into_range(self):
        make_course(slug="course-1")
        body = self.client.get("/api/catalog", {"page": 99}).json()
        self.assertEqual(body["currentPage"], 1)

    def test_type_filter_returns_only_courses(self):
        make_course(slug="course-1")
        make_scholarship(slug="scholarship-1")
        body = self.client.get("/api/catalog", {"type": "courses"}).json()
        self.assertEqual([item["type"] for item in body["items"]], ["course"])

    def test_ids_filter_keeps_only_requested_items(self):
        make_course(slug="course-1")
        make_course(slug="course-2")
        body = self.client.get("/api/catalog", {"ids": "course-2"}).json()
        self.assertEqual([item["id"] for item in body["items"]], ["course-2"])

    def test_rating_sort_puts_the_highest_first(self):
        make_course(slug="course-1", rating=Decimal("3.0"))
        make_course(slug="course-2", rating=Decimal("5.0"))
        body = self.client.get("/api/catalog", {"sort": "rating"}).json()
        self.assertEqual(body["items"][0]["id"], "course-2")


class CatalogDetailViewTests(ApiTestCase):
    def test_returns_a_course_by_slug(self):
        make_course(slug="course-1")
        body = self.client.get("/api/catalog/course-1").json()
        self.assertEqual((body["id"], body["type"]), ("course-1", "course"))

    def test_returns_a_scholarship_by_slug(self):
        make_scholarship(slug="scholarship-1")
        body = self.client.get("/api/catalog/scholarship-1").json()
        self.assertEqual((body["id"], body["type"]), ("scholarship-1", "scholarship"))

    def test_missing_slug_returns_404(self):
        response = self.client.get("/api/catalog/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "العنصر غير موجود"})


class CatalogUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("catalog-list"), "/api/catalog")
        self.assertEqual(reverse("catalog-filters"), "/api/catalog/filters")
        self.assertEqual(reverse("catalog-detail", args=["slug"]), "/api/catalog/slug")


class CatalogFilterGroupTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.group = FilterGroup.objects.create(
            key="field", label="المجال", tone="gold", glow=True, surfaces=["desktop", "mobile"], order=0
        )
        FilterOption.objects.create(group=self.group, value="all", label="الكل", order=0)
        FilterOption.objects.create(group=self.group, value="ai", label="ذكاء اصطناعي", order=1)

    def test_filter_group_str(self):
        self.assertEqual(str(self.group), "field")

    def test_filter_option_str(self):
        self.assertEqual(str(self.group.options.first()), "field:all")

    def test_filters_endpoint_returns_groups_from_the_database(self):
        body = self.client.get("/api/catalog/filters").json()
        self.assertEqual(body["groups"][0]["key"], "field")
        self.assertEqual([option["id"] for option in body["groups"][0]["options"]], ["all", "ai"])

    def test_mobile_surface_can_override_the_tone(self):
        self.group.mobile_tone = "sky"
        self.group.save()
        body = self.client.get("/api/catalog/filters?surface=mobile").json()
        self.assertEqual(body["groups"][0]["tone"], "sky")

    def test_surface_without_the_group_omits_it(self):
        self.group.surfaces = ["desktop"]
        self.group.save()
        body = self.client.get("/api/catalog/filters?surface=mobile").json()
        self.assertEqual(body["groups"], [])

    def test_tab_scoped_options_are_filtered(self):
        FilterOption.objects.create(group=self.group, value="beginner", label="مبتدئ", tabs=["courses"], order=2)
        courses = self.client.get("/api/catalog/filters?tab=courses").json()
        self.assertIn("beginner", [option["id"] for option in courses["groups"][0]["options"]])
        all_tab = self.client.get("/api/catalog/filters?tab=all").json()
        self.assertNotIn("beginner", [option["id"] for option in all_tab["groups"][0]["options"]])

    def test_sort_groups_are_returned_as_sort_options(self):
        FilterGroup.objects.create(key="sort", label="الترتيب", kind="sort", surfaces=["desktop"], order=1)
        body = self.client.get("/api/catalog/filters").json()
        self.assertNotIn("sort", [group["key"] for group in body["groups"]])


class CatalogAdminTests(TestCase):
    def test_catalog_models_are_registered(self):
        self.assertTrue(admin.site.is_registered(Category))
        self.assertTrue(admin.site.is_registered(FilterGroup))
        self.assertTrue(admin.site.is_registered(FilterOption))
