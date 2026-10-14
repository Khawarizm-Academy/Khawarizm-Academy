"""Auth stubs.

There is no real authentication yet: the API always acts as the seeded demo
learner. These endpoints exist so the frontend can wire a token flow later.
"""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.learners import get_demo_learner
from api.serializers.profile import user_profile


@api_view(["GET"])
def auth_me(request: Any) -> Response:
    """Current user profile (the demo learner for now)."""
    return Response(user_profile(get_demo_learner()))


@api_view(["POST"])
def auth_login(request: Any) -> Response:
    """Accept any credentials and return the demo learner."""
    return Response({"token": "demo-token", "user": user_profile(get_demo_learner())})


@api_view(["POST"])
def auth_oauth(request: Any, provider: str) -> Response:
    """Social login stub for google / facebook."""
    return Response({"token": f"demo-{provider}", "user": user_profile(get_demo_learner())})


@api_view(["POST"])
def auth_logout(request: Any) -> Response:
    """Logout acknowledgement; the client clears its cache."""
    return Response({"loggedOut": True})
