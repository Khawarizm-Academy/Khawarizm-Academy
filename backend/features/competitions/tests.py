"""Tests for the competitions feature — the global competition model and list."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase
from features.competitions.models import Competition
from features.competitions.serializers import competition


class CompetitionModelTests(TestCase):
    def test_str_returns_the_title(self):
        self.assertEqual(str(Competition.objects.create(competition_id="k1", title="Hackathon")), "Hackathon")

    def test_competition_id_is_unique(self):
        self.assertTrue(Competition._meta.get_field("competition_id").unique)


class CompetitionSerializerTests(TestCase):
    def test_maps_to_camel_case(self):
        row = Competition.objects.create(competition_id="k1", title="Hackathon", days_remaining="4")
        payload = competition(row)
        self.assertEqual((payload["id"], payload["daysRemaining"]), ("k1", "4"))

    def test_empty_optional_fields_are_kept_as_blank(self):
        payload = competition(Competition.objects.create(competition_id="k1", title="Hackathon"))
        self.assertEqual(payload["badge"], "")


class CompetitionViewTests(ApiTestCase):
    def test_lists_every_competition(self):
        Competition.objects.create(competition_id="k1", title="Hackathon")
        Competition.objects.create(competition_id="k2", title="Challenge")
        body = self.client.get("/api/competitions").json()
        self.assertEqual([row["id"] for row in body], ["k1", "k2"])

    def test_empty_list_when_no_competitions(self):
        self.assertEqual(self.client.get("/api/competitions").json(), [])


class CompetitionUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("competitions-list"), "/api/competitions")


class CompetitionAdminTests(TestCase):
    def test_competition_is_registered(self):
        self.assertTrue(admin.site.is_registered(Competition))
