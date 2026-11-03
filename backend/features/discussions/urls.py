from django.urls import path

from . import views

urlpatterns = [
    path("courses/<slug:slug>/discussions", views.course_discussions, name="course-discussions"),
    path(
        "courses/<slug:slug>/discussions/<uuid:thread_id>",
        views.course_discussion_detail,
        name="course-discussion-detail",
    ),
    path(
        "courses/<slug:slug>/discussions/<uuid:thread_id>/posts",
        views.course_discussion_reply,
        name="course-discussion-reply",
    ),
    path(
        "courses/<slug:slug>/discussions/<uuid:thread_id>/accept",
        views.course_discussion_accept,
        name="course-discussion-accept",
    ),
    path(
        "courses/<slug:slug>/discussions/<uuid:thread_id>/moderate",
        views.course_discussion_moderate,
        name="course-discussion-moderate",
    ),
    path("studio/discussions", views.studio_discussions, name="studio-discussions"),
]
