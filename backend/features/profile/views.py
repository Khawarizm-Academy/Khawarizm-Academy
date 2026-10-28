"""Profile read/update endpoint — acts on the signed-in user."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth.models import StudentProfile
from features.auth.serializers import user_profile

# PATCH is partial: every key is optional, unknown keys are ignored.
inline_profile_update = inline_serializer(
    "ProfileUpdateRequest",
    fields={
        "fullName": ser.CharField(required=False, allow_blank=True),
        "phone": ser.CharField(required=False, allow_blank=True),
        "language": ser.CharField(required=False, allow_blank=True),
        "timezone": ser.CharField(required=False, allow_blank=True),
        "learningLevel": ser.CharField(required=False, allow_blank=True),
        "interests": ser.ListField(child=ser.CharField(), required=False),
        "notifications": ser.DictField(required=False),
    },
)


@extend_schema(
    methods=["GET"],
    operation_id="profile_read",
    summary="Read the signed-in user's profile and preferences.",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The user profile shape.")},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="profile_update",
    summary="Update the signed-in user's profile and preferences.",
    description="Partial: every key is optional; unknown keys are ignored.",
    request=inline_profile_update,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The updated user profile shape.")},
)
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request: Any) -> Response:
    """Read or update the signed-in user's profile and preferences."""
    user = request.user

    if request.method == "PATCH":
        data = request.data
        if "fullName" in data:
            user.full_name = data["fullName"]
        if "phone" in data:
            user.phone = data["phone"]
        if "language" in data:
            user.language = data["language"]
        if "timezone" in data:
            user.timezone = data["timezone"]
        user.save()

        # Preferences live on the student profile so the account row stays lean.
        profile, _ = StudentProfile.objects.get_or_create(user=user)
        if "learningLevel" in data:
            profile.learning_level = data["learningLevel"]
        if "interests" in data:
            profile.interests = data["interests"]
        if "notifications" in data:
            profile.notifications = data["notifications"]
        profile.save()

    return Response(user_profile(user))
