"""Tests for the shared helpers in features.common."""

from __future__ import annotations

from decimal import Decimal

from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from features.common.errors import api_exception_handler
from features.common.serializers import as_number, compact
from features.common.testing import ALLOWED_ORIGIN, ApiTestCase, make_course, make_scholarship


class CompactTests(TestCase):
    def test_drops_none_and_empty_string(self):
        self.assertEqual(compact(a=1, b=None, c=""), {"a": 1})

    def test_keeps_falsy_values_that_are_not_empty(self):
        self.assertEqual(compact(a=0, b=False, c=[], d={}), {"a": 0, "b": False, "c": [], "d": {}})

    def test_keeps_arabic_strings(self):
        self.assertEqual(compact(label="العربية"), {"label": "العربية"})


class AsNumberTests(TestCase):
    def test_converts_decimal_to_float(self):
        self.assertEqual(as_number(Decimal("4.5")), 4.5)

    def test_none_stays_none(self):
        self.assertIsNone(as_number(None))


class ExceptionHandlerTests(TestCase):
    def test_returns_drf_response_for_known_exception(self):
        response = api_exception_handler(ValidationError("bad"), {})
        self.assertEqual(response.status_code, 400)


class ApiOriginMiddlewareTests(TestCase):
    def test_rejects_request_without_origin(self):
        response = APIClient().get("/api/events")
        self.assertEqual(response.status_code, 403)

    def test_allows_request_with_allowed_origin(self):
        response = APIClient().get("/api/events", HTTP_ORIGIN=ALLOWED_ORIGIN)
        self.assertEqual(response.status_code, 200)


class TestingHelpersTests(ApiTestCase):
    def test_client_sends_allowed_origin(self):
        self.assertEqual(self.client.get("/api/events").status_code, 200)

    def test_factories_fill_required_fields(self):
        self.assertEqual(make_course().slug, "course-1")
        self.assertEqual(make_scholarship().slug, "scholarship-1")
