"""Profile read/update endpoint — acts on the signed-in user."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth.models import StudentProfile
from features.auth.serializers import user_profile


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
