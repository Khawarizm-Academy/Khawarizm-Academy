"""Home routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.home import views

urlpatterns = [
    path("home", views.home_view, name="home"),
]
