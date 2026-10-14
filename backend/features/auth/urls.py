"""Auth routes — mounted under /api/auth/."""

from __future__ import annotations

from django.urls import path

from features.auth import views

urlpatterns = [
    path("auth/me", views.auth_me, name="auth-me"),
    path("auth/login", views.auth_login, name="auth-login"),
    path("auth/oauth/<str:provider>", views.auth_oauth, name="auth-oauth"),
    path("auth/logout", views.auth_logout, name="auth-logout"),
]
