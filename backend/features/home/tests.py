"""Tests for the home feature — rails assembled from the real content rows."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase, make_course, make_scholarship
from features.competitions.models import Competition
from features.events.models import EventItem
from features.home.models import (
    HomeCompetitionSpot,
    HomeEventSpot,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)


class HomeModelTests(TestCase):
    def test_featured_course_str(self):
        row = HomeFeaturedCourse.objects.create(course=make_course())
        self.assertEqual(str(row), "home-course:course-1")

    def test_featured_scholarship_str(self):
        row = HomeFeaturedScholarship.objects.create(scholarship=make_scholarship())
        self.assertEqual(str(row), "home-scholarship:scholarship-1")

    def test_competition_spot_str(self):
        competition = Competition.objects.create(competition_id="k1", title="Competition")
        row = HomeCompetitionSpot.objects.create(key="mobile", competition=competition)
        self.assertEqual(str(row), "home-competition:mobile")

    def test_event_spot_str(self):
        event = EventItem.objects.create(event_id="e1", title="Event")
        row = HomeEventSpot.objects.create(key="desktopFeatured", event=event)
        self.assertEqual(str(row), "home-event:desktopFeatured")

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
        HomeFeaturedCourse.objects.create(course=make_course(), students_count="12")
        HomeFeaturedScholarship.objects.create(scholarship=make_scholarship())
        HomeQuickLink.objects.create(link_id="l1", label="Link")
        body = self.client.get("/api/home").json()
        self.assertEqual(body["courses"][0]["id"], "course-1")
        self.assertEqual(body["scholarships"][0]["id"], "scholarship-1")
        self.assertEqual(body["quickLinks"][0]["id"], "l1")

    def test_competitions_are_split_by_key(self):
        mobile = Competition.objects.create(competition_id="km", title="Mobile")
        desktop = Competition.objects.create(competition_id="kd", title="Desktop")
        HomeCompetitionSpot.objects.create(key="mobile", competition=mobile)
        HomeCompetitionSpot.objects.create(key="desktop", competition=desktop)
        body = self.client.get("/api/home").json()
        self.assertEqual(body["competitionMobile"]["id"], "km")
        self.assertEqual(body["competitionDesktop"]["id"], "kd")

    def test_events_are_split_by_key(self):
        mobile = EventItem.objects.create(event_id="em", title="Mobile")
        featured = EventItem.objects.create(event_id="ef", title="Featured")
        workshop = EventItem.objects.create(event_id="ew", title="Workshop")
        HomeEventSpot.objects.create(key="mobile", event=mobile)
        HomeEventSpot.objects.create(key="desktopFeatured", event=featured)
        HomeEventSpot.objects.create(key="desktopWorkshop", event=workshop)
        body = self.client.get("/api/home").json()
        self.assertEqual(body["eventMobile"]["id"], "em")
        self.assertEqual(body["eventDesktopFeatured"]["id"], "ef")
        self.assertEqual(body["eventDesktopWorkshop"]["id"], "ew")


class HomeUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("home"), "/api/home")


class HomeAdminTests(TestCase):
    def test_every_model_is_registered(self):
        for model in (HomeCompetitionSpot, HomeEventSpot, HomeFeaturedCourse, HomeFeaturedScholarship, HomeQuickLink):
            self.assertTrue(admin.site.is_registered(model), model.__name__)
