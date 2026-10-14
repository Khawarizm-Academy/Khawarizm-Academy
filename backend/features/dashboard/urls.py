"""Dashboard routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.dashboard import views

urlpatterns = [
    path("dashboard", views.dashboard_summary, name="dashboard-summary"),
    path("dashboard/enrolled", views.dashboard_enrolled, name="dashboard-enrolled"),
    path("dashboard/saved", views.dashboard_saved, name="dashboard-saved"),
    path("dashboard/competitions", views.dashboard_competitions, name="dashboard-competitions"),
    path("dashboard/notifications", views.dashboard_notifications, name="dashboard-notifications"),
    path("dashboard/notifications/<str:notification_id>/read", views.dashboard_notification_read, name="dashboard-notification-read"),
]
