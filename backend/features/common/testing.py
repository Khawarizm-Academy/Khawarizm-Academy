"""Shared test building blocks for the feature apps.

Only test modules import this file, so nothing here runs in production paths.
"""

from __future__ import annotations

from typing import Any

from django.test import TestCase
from rest_framework.test import APIClient

from features.auth.models import Learner
from features.auth.services import DEMO_EMAIL, get_demo_learner
from features.common.choices import CourseLevel
from features.courses.models import Course
from features.scholarships.models import Scholarship

# The API middleware only lets /api/ through when the origin is allow-listed.
ALLOWED_ORIGIN = "http://localhost:5173"


def api_client() -> APIClient:
    """A DRF client that always sends an allowed Origin and asks for JSON."""
    client = APIClient()
    client.defaults["HTTP_ORIGIN"] = ALLOWED_ORIGIN
    client.defaults["HTTP_ACCEPT"] = "application/json"
    return client


class ApiTestCase(TestCase):
    """Base case whose client passes the API origin middleware."""

    def setUp(self) -> None:
        super().setUp()
        self.client = api_client()


def demo_learner() -> Learner:
    """The learner every request acts as; created on first call."""
    return get_demo_learner()


def make_learner(**overrides: Any) -> Learner:
    """A learner row; defaults to the demo identity."""
    fields: dict[str, Any] = {"email": DEMO_EMAIL, "full_name": "Test Learner"}
    fields.update(overrides)
    return Learner.objects.create(**fields)


def make_course(**overrides: Any) -> Course:
    """A course with every required field filled."""
    fields: dict[str, Any] = {
        "slug": "course-1",
        "title": "Python Basics",
        "category_label": "Programming",
        "category_slug": "programming",
        "thumbnail_url": "https://cdn.example.com/course-1.png",
        "course_level": CourseLevel.BEGINNER,
    }
    fields.update(overrides)
    return Course.objects.create(**fields)


def make_scholarship(**overrides: Any) -> Scholarship:
    """A scholarship with every required field filled."""
    fields: dict[str, Any] = {
        "slug": "scholarship-1",
        "title": "Global Scholarship",
        "thumbnail_url": "https://cdn.example.com/scholarship-1.png",
    }
    fields.update(overrides)
    return Scholarship.objects.create(**fields)
