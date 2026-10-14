"""Scholarship routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.scholarships import views

urlpatterns = [
    path("scholarships/<str:slug>", views.scholarship_detail_view, name="scholarship-detail"),
    path("scholarships/<str:slug>/apply", views.scholarship_apply_view, name="scholarship-apply"),
    path("scholarships/<str:slug>/save", views.scholarship_save_view, name="scholarship-save"),
]
