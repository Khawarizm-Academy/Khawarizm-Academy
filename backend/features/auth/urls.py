"""Auth routes, mounted under /api/."""

from django.urls import path

from features.auth import views

urlpatterns = [
    path("auth/config", views.auth_config, name="auth-config"),
    path("auth/firebase", views.firebase_login, name="auth-firebase"),
    path("auth/refresh", views.refresh, name="auth-refresh"),
    path("auth/me", views.me, name="auth-me"),
    path("auth/logout", views.logout, name="auth-logout"),
    path("auth/sessions", views.my_sessions, name="auth-sessions"),
    path("auth/sessions/<uuid:session_id>/revoke", views.revoke_session, name="auth-revoke-session"),
]
