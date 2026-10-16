"""Tests for the home feature — curated rails and the single home endpoint."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase
from features.home.models import (
    HomeCompetition,
    HomeEvent,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)


class HomeModelTests(TestCase):
    def test_featured_course_str(self):
        self.assertEqual(str(HomeFeaturedCourse.objects.create(course_id="c1", title="Course")), "Course")

    def test_featured_scholarship_str(self):
        self.assertEqual(str(HomeFeaturedScholarship.objects.create(scholarship_id="s1", title="Scholarship")), "Scholarship")

    def test_competition_str_and_key(self):
        row = HomeCompetition.objects.create(key="mobile", competition_id="k1", title="Competition")
        self.assertEqual(str(row), "mobile:k1")

    def test_event_str_and_key(self):
        row = HomeEvent.objects.create(key="desktopFeatured", event_id="e1", title="Event")
        self.assertEqual(str(row), "desktopFeatured:e1")

    def test_quick_link_str_falls_back_to_id(self):
        self.assertEqual(str(HomeQuickLink.objects.create(link_id="l1")), "l1")


class HomeViewTests(ApiTestCase):
    def test_empty_home_returns_empty_rails_and_null_banners(self):
        body = self.client.get("/api/home").json()
        self.assertEqual(body["courses"], [])
        self.assertEqual(body["scholarships"], [])
        self.assertIsNone(body["competitionMobile"])
        self.assertIsNone(body["eventDesktopWorkshop"])

    def test_rails_are_serialized_and_keyed(self):
        HomeFeaturedCourse.objects.create(course_id="c1", title="Course")
        HomeFeaturedScholarship.objects.create(scholarship_id="s1", title="Scholarship")
        HomeQuickLink.objects.create(link_id="l1", label="Link")
        body = self.client.get("/api/home").json()
        self.assertEqual(body["courses"][0]["id"], "c1")
        self.assertEqual(body["scholarships"][0]["id"], "s1")
        self.assertEqual(body["quickLinks"][0]["id"], "l1")

    def test_competitions_are_split_by_key(self):
        HomeCompetition.objects.create(key="mobile", competition_id="km", title="Mobile")
        HomeCompetition.objects.create(key="desktop", competition_id="kd", title="Desktop")
        body = self.client.get("/api/home").json()
        self.assertEqual(body["competitionMobile"]["id"], "km")
        self.assertEqual(body["competitionDesktop"]["id"], "kd")

    def test_events_are_split_by_key_using_the_shared_event_shape(self):
        HomeEvent.objects.create(key="mobile", event_id="em", title="Mobile")
        HomeEvent.objects.create(key="desktopFeatured", event_id="ef", title="Featured")
        HomeEvent.objects.create(key="desktopWorkshop", event_id="ew", title="Workshop")
        body = self.client.get("/api/home").json()
        self.assertEqual(body["eventMobile"]["id"], "em")
        self.assertEqual(body["eventDesktopFeatured"]["id"], "ef")
        self.assertEqual(body["eventDesktopWorkshop"]["id"], "ew")


class HomeUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("home"), "/api/home")


class HomeAdminTests(TestCase):
    def test_every_model_is_registered(self):
        for model in (HomeCompetition, HomeEvent, HomeFeaturedCourse, HomeFeaturedScholarship, HomeQuickLink):
            self.assertTrue(admin.site.is_registered(model), model.__name__)
