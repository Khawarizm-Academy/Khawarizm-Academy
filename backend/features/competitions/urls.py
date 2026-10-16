"""Competition routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.competitions import views

urlpatterns = [
    path("competitions", views.competitions_list, name="competitions-list"),
]
