"""Profile read/update endpoint."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.auth.serializers import user_profile
from features.auth.services import get_demo_learner


@api_view(["GET", "PATCH"])
def profile_view(request: Any) -> Response:
    """Read or update the demo learner's profile/preferences."""
    learner = get_demo_learner()

    if request.method == "PATCH":
        data = request.data
        if "fullName" in data:
            learner.full_name = data["fullName"]
        if "phone" in data:
            learner.phone = data["phone"]
        if "learningLevel" in data:
            learner.learning_level = data["learningLevel"]
        if "interests" in data:
            learner.interests = data["interests"]
        if "notifications" in data:
            learner.notifications_preferences = data["notifications"]
        if "language" in data:
            learner.language = data["language"]
        if "timezone" in data:
            learner.timezone = data["timezone"]
        learner.save()

    return Response(user_profile(learner))
