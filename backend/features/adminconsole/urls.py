"""Admin console routes, mounted under /api/ and gated to admins."""

from django.urls import path

from features.adminconsole import views

urlpatterns = [
    path("admin/overview", views.overview, name="admin-overview"),
    path("admin/users", views.users, name="admin-users"),
    path("admin/users/<uuid:user_id>", views.user_detail, name="admin-user-detail"),
    path("admin/users/<uuid:user_id>/role", views.set_role, name="admin-user-role"),
    path("admin/sessions", views.sessions, name="admin-sessions"),
    path("admin/sessions/<uuid:session_id>/revoke", views.revoke_session, name="admin-session-revoke"),
    path("admin/analytics/logins", views.logins_series, name="admin-analytics-logins"),
    path("admin/analytics/devices", views.devices, name="admin-analytics-devices"),
    path("admin/events", views.events, name="admin-events"),
]
