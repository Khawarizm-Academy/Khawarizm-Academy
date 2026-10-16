"""Auth endpoints — read the current user, login, social login, logout."""

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view
from rest_framework.response import Response

from features.auth.serializers import user_profile
from features.auth.services import get_demo_learner


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
