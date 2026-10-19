"""Course routes — mounted under /api/."""

from __future__ import annotations

from django.urls import path

from features.courses import views

urlpatterns = [
    path("problems", views.problems_list, name="problems-list"),
    path("courses/<str:slug>", views.course_detail_view, name="course-detail"),
    path("courses/<str:slug>/problems", views.course_problems_view, name="course-problems"),
    path("courses/<str:slug>/related", views.course_related_view, name="course-related"),
    path("courses/<str:slug>/enroll", views.course_enroll_view, name="course-enroll"),
    path("courses/<str:slug>/favorite", views.course_favorite_view, name="course-favorite"),
    path("courses/<str:slug>/progress", views.course_progress_view, name="course-progress"),
    path("courses/<str:slug>/certificate", views.course_certificate_view, name="course-certificate"),
]
