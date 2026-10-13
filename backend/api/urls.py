"""API URL routing, grouped by feature.

Every path is mounted under /api/ by config/urls.py.
"""

from __future__ import annotations

from django.urls import path

from api.views import auth, catalog, competitions, courses, dashboard, events, home, profile, scholarships

app_name = "api"

urlpatterns = [
    # Catalog
    path("catalog", catalog.catalog_list, name="catalog-list"),
    path("catalog/<str:slug>", catalog.catalog_detail, name="catalog-detail"),
    # Courses
    path("problems", courses.problems_list, name="problems-list"),
    path("courses/<str:slug>", courses.course_detail_view, name="course-detail"),
    path("courses/<str:slug>/problems", courses.course_problems_view, name="course-problems"),
    path("courses/<str:slug>/related", courses.course_related_view, name="course-related"),
    path("courses/<str:slug>/enroll", courses.course_enroll_view, name="course-enroll"),
    path("courses/<str:slug>/progress", courses.course_progress_view, name="course-progress"),
    path("courses/<str:slug>/certificate", courses.course_certificate_view, name="course-certificate"),
    # Scholarships
    path("scholarships/<str:slug>", scholarships.scholarship_detail_view, name="scholarship-detail"),
    path("scholarships/<str:slug>/apply", scholarships.scholarship_apply_view, name="scholarship-apply"),
    path("scholarships/<str:slug>/save", scholarships.scholarship_save_view, name="scholarship-save"),
    # Dashboard
    path("dashboard", dashboard.dashboard_summary, name="dashboard-summary"),
    path("dashboard/enrolled", dashboard.dashboard_enrolled, name="dashboard-enrolled"),
    path("dashboard/saved", dashboard.dashboard_saved, name="dashboard-saved"),
    path("dashboard/competitions", dashboard.dashboard_competitions, name="dashboard-competitions"),
    path("dashboard/notifications", dashboard.dashboard_notifications, name="dashboard-notifications"),
    path("dashboard/notifications/<str:notification_id>/read", dashboard.dashboard_notification_read, name="dashboard-notification-read"),
    path("dashboard/chambers", dashboard.dashboard_chambers, name="dashboard-chambers"),
    path("dashboard/content", dashboard.dashboard_content, name="dashboard-content"),
    # Content
    path("home", home.home_view, name="home"),
    path("events", events.events_list, name="events-list"),
    path("competitions", competitions.competitions_list, name="competitions-list"),
    # Profile
    path("profile", profile.profile_view, name="profile"),
    # Auth stubs
    path("auth/me", auth.auth_me, name="auth-me"),
    path("auth/login", auth.auth_login, name="auth-login"),
    path("auth/oauth/<str:provider>", auth.auth_oauth, name="auth-oauth"),
    path("auth/logout", auth.auth_logout, name="auth-logout"),
]
