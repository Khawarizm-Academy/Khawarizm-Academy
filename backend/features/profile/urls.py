"""Profile routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.profile import views

urlpatterns = [
    path("profile", views.profile_view, name="profile"),
]
