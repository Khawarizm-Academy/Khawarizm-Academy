"""Event routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.events import views

urlpatterns = [
    path("events", views.events_list, name="events-list"),
]
