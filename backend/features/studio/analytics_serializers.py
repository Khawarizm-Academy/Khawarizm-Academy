"""Serializers for the isolated Studio analytics API."""

from __future__ import annotations

from rest_framework import serializers


class AnalyticsQuerySerializer(serializers.Serializer):
    """Validate the bounded analytics window without accepting silent fallbacks."""

    range = serializers.ChoiceField(choices=("7", "30", "90"), required=False, default="30")

    def validate_range(self, value: str) -> int:
        return int(value)
