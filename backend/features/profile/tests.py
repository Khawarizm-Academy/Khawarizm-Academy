"""Tests for the profile feature — read and partially update the signed-in user."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse

from features.auth import services
from features.common.testing import ApiTestCase, authenticate, make_user


class ProfileViewTests(ApiTestCase):
    def test_requires_auth(self):
        self.assertIn(self.client.get("/api/profile").status_code, (401, 403))

    def test_get_returns_the_current_profile(self):
        user = make_user()
        services.ensure_profile(user)
        authenticate(self.client, user)
        body = self.client.get("/api/profile").json()
        self.assertEqual(body["email"], user.email)

    def test_patch_updates_provided_fields(self):
        authenticate(self.client, make_user())
        body = self.client.patch("/api/profile", {"fullName": "New Name"}, format="json").json()
        self.assertEqual(body["fullName"], "New Name")

    def test_patch_leaves_unmentioned_fields_unchanged(self):
        user = make_user(phone="+966 00")
        services.ensure_profile(user)
        authenticate(self.client, user)
        body = self.client.patch("/api/profile", {"fullName": "New Name"}, format="json").json()
        self.assertEqual(body["phone"], "+966 00")

    def test_patch_persists_the_change(self):
        user = make_user()
        authenticate(self.client, user)
        self.client.patch("/api/profile", {"phone": "+966 00"}, format="json")
        user.refresh_from_db()
        self.assertEqual(user.phone, "+966 00")

    def test_patch_updates_preferences(self):
        authenticate(self.client, make_user())
        payload = {"learningLevel": "advanced", "interests": ["ai"], "language": "en"}
        body = self.client.patch("/api/profile", payload, format="json").json()
        self.assertEqual(body["learningLevel"], "advanced")
        self.assertEqual(body["interests"], ["ai"])
        self.assertEqual(body["language"], "en")

    def test_empty_patch_returns_the_current_profile(self):
        user = make_user()
        services.ensure_profile(user)
        authenticate(self.client, user)
        body = self.client.patch("/api/profile", {}, format="json").json()
        self.assertEqual(body["email"], user.email)


class ProfileUrlTests(TestCase):
    def test_route_resolves(self):
        self.assertEqual(reverse("profile"), "/api/profile")
