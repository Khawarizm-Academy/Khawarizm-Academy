"""Shared test building blocks for the feature apps.

Only test modules import this file, so nothing here runs in production paths.
"""

from __future__ import annotations

from typing import Any

from django.test import TestCase
from rest_framework.test import APIClient

from features.auth import services
from features.auth.models import User
from features.common.choices import CourseLevel, Role
from features.courses.models import Course
from features.scholarships.models import Scholarship

# The API middleware only lets /api/ through when the origin is allow-listed.
ALLOWED_ORIGIN = "http://localhost:5173"
TEST_EMAIL = "test.learner@example.com"
TEST_PASSWORD = "test-pass-123"
TEST_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


class FakeRequest:
    """The tiny slice of a request the session service reads."""

    def __init__(self, user_agent: str = TEST_UA, ip: str = "127.0.0.1") -> None:
        self.META = {"HTTP_USER_AGENT": user_agent, "REMOTE_ADDR": ip}


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


def make_user(email: str = TEST_EMAIL, role: str = Role.STUDENT, **overrides: Any) -> User:
    """A user row with a usable password."""
    fields: dict[str, Any] = {"email": email, "full_name": "Test Learner", "role": role, "password": TEST_PASSWORD}
    fields.update(overrides)
    return User.objects.create_user(**fields)


def make_admin(email: str = "admin@example.com", **overrides: Any) -> User:
    """A staff/admin user for the console endpoints."""
    fields: dict[str, Any] = {"role": Role.ADMIN, "is_staff": True, "is_superuser": True}
    fields.update(overrides)
    return make_user(email=email, **fields)


def authenticate(client: APIClient, user: User | None = None, user_agent: str = TEST_UA):
    """Open a real session and authorize the client with its access token."""
    user = user or make_user()
    session, access, _refresh = services.open_session(user, FakeRequest(user_agent), "dev")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return user, session


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
