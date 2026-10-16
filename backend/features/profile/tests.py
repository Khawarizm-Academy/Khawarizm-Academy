"""Tests for the profile feature — read and partially update the learner."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse

from features.auth.services import DEMO_EMAIL, get_demo_learner
from features.common.testing import ApiTestCase


class ProfileViewTests(ApiTestCase):
    def test_get_returns_the_current_profile(self):
        response = self.client.get("/api/profile")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], DEMO_EMAIL)

    def test_patch_updates_provided_fields(self):
        body = self.client.patch("/api/profile", {"fullName": "New Name"}, format="json").json()
        self.assertEqual(body["fullName"], "New Name")

    def test_patch_leaves_unmentioned_fields_unchanged(self):
        original = self.client.get("/api/profile").json()["phone"]
        body = self.client.patch("/api/profile", {"fullName": "New Name"}, format="json").json()
        self.assertEqual(body["phone"], original)

    def test_patch_persists_the_change(self):
        self.client.patch("/api/profile", {"phone": "+966 00"}, format="json")
        self.assertEqual(get_demo_learner().phone, "+966 00")

    def test_patch_updates_preferences(self):
        payload = {"learningLevel": "advanced", "interests": ["ai"], "language": "en"}
        body = self.client.patch("/api/profile", payload, format="json").json()
        self.assertEqual(body["learningLevel"], "advanced")
        self.assertEqual(body["interests"], ["ai"])
        self.assertEqual(body["language"], "en")

    def test_empty_patch_returns_the_current_profile(self):
        body = self.client.patch("/api/profile", {}, format="json").json()
        self.assertEqual(body["email"], DEMO_EMAIL)


class ProfileUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("profile"), "/api/profile")
