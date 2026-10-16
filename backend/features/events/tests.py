"""Tests for the events feature — the global event model, serializer, and list."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.common.testing import ApiTestCase
from features.events.models import EventItem
from features.events.serializers import event


class EventModelTests(TestCase):
    def test_str_returns_the_title(self):
        self.assertEqual(str(EventItem.objects.create(event_id="e1", title="Workshop")), "Workshop")

    def test_event_id_is_unique(self):
        self.assertTrue(EventItem._meta.get_field("event_id").unique)


class EventSerializerTests(TestCase):
    def test_maps_to_camel_case(self):
        row = EventItem.objects.create(event_id="e1", title="Workshop", is_featured=True)
        payload = event(row)
        self.assertEqual((payload["id"], payload["isFeatured"]), ("e1", True))

    def test_drops_empty_optional_fields(self):
        self.assertNotIn("badge", event(EventItem.objects.create(event_id="e1", title="Workshop")))


class EventViewTests(ApiTestCase):
    def test_lists_every_event(self):
        EventItem.objects.create(event_id="e1", title="Workshop")
        EventItem.objects.create(event_id="e2", title="Webinar")
        body = self.client.get("/api/events").json()
        self.assertEqual([row["id"] for row in body], ["e1", "e2"])

    def test_empty_list_when_no_events(self):
        self.assertEqual(self.client.get("/api/events").json(), [])


class EventUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("events-list"), "/api/events")


class EventAdminTests(TestCase):
    def test_event_is_registered(self):
        self.assertTrue(admin.site.is_registered(EventItem))
