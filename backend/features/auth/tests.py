"""Tests for the auth feature — learner model, serializer, and endpoints."""

from __future__ import annotations

from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from features.auth.models import Learner
from features.auth.serializers import user_profile
from features.auth.services import DEMO_DEFAULTS, DEMO_EMAIL, get_demo_learner
from features.common.testing import ApiTestCase, make_learner


class LearnerModelTests(TestCase):
    def test_str_prefers_full_name(self):
        learner = Learner.objects.create(email="a@example.com", full_name="Ahmed")
        self.assertEqual(str(learner), "Ahmed")

    def test_str_falls_back_to_email(self):
        self.assertEqual(str(Learner.objects.create(email="a@example.com")), "a@example.com")

    def test_email_is_the_primary_key(self):
        self.assertEqual(Learner._meta.pk.name, "email")

    def test_defaults(self):
        learner = Learner.objects.create(email="a@example.com")
        self.assertEqual(learner.learning_level, "intermediate")
        self.assertEqual(learner.language, "ar")
        self.assertEqual(learner.interests, [])


class UserProfileSerializerTests(TestCase):
    def test_maps_model_fields_to_camel_case(self):
        learner = make_learner(full_name="Ahmed", phone="+966 55")
        payload = user_profile(learner)
        self.assertEqual(payload["fullName"], "Ahmed")
        self.assertEqual(payload["phone"], "+966 55")
        self.assertEqual(payload["email"], DEMO_EMAIL)

    def test_includes_preferences_and_identity_keys(self):
        keys = user_profile(make_learner()).keys()
        for key in ("learningLevel", "interests", "notifications", "language", "timezone"):
            self.assertIn(key, keys)


class DemoLearnerServiceTests(TestCase):
    def test_creates_once_then_reuses_the_same_row(self):
        first = get_demo_learner()
        second = get_demo_learner()
        self.assertEqual(first.email, DEMO_EMAIL)
        self.assertEqual(second.email, DEMO_EMAIL)
        self.assertEqual(Learner.objects.count(), 1)

    def test_seeds_the_demo_defaults(self):
        learner = get_demo_learner()
        self.assertEqual(learner.full_name, DEMO_DEFAULTS["full_name"])
        self.assertEqual(learner.learning_level, DEMO_DEFAULTS["learning_level"])
        self.assertEqual(str(learner), DEMO_DEFAULTS["full_name"])


class AuthViewTests(ApiTestCase):
    def test_me_returns_the_current_profile(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], DEMO_EMAIL)

    def test_login_returns_a_token_and_user(self):
        body = self.client.post("/api/auth/login", {}, format="json").json()
        self.assertEqual(body["token"], "demo-token")
        self.assertEqual(body["user"]["email"], DEMO_EMAIL)

    def test_oauth_builds_a_provider_token(self):
        body = self.client.post("/api/auth/oauth/google", {}, format="json").json()
        self.assertEqual(body["token"], "demo-google")

    def test_logout_acknowledges(self):
        response = self.client.post("/api/auth/logout", {}, format="json")
        self.assertEqual(response.json(), {"loggedOut": True})

    def test_login_rejects_get(self):
        self.assertEqual(self.client.get("/api/auth/login").status_code, 405)


class AuthUrlTests(TestCase):
    def test_routes_resolve(self):
        self.assertEqual(reverse("auth-me"), "/api/auth/me")
        self.assertEqual(reverse("auth-login"), "/api/auth/login")
        self.assertEqual(reverse("auth-oauth", args=["google"]), "/api/auth/oauth/google")
        self.assertEqual(reverse("auth-logout"), "/api/auth/logout")


class AuthAdminTests(TestCase):
    def test_learner_is_registered(self):
        self.assertTrue(admin.site.is_registered(Learner))
