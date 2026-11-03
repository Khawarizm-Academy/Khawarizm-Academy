"""Announcements routes; the parent app mounts this module below ``/api/``."""

from functools import wraps

from django.urls import path

from . import views


def _private(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = views.NO_STORE
        return response

    return wrapped


urlpatterns = [
    path(
        "studio/announcements/courses",
        _private(views.announcement_courses),
        name="studio-announcement-courses",
    ),
    path(
        "courses/<slug:slug>/announcements",
        _private(views.course_announcements),
        name="course-announcements",
    ),
    path(
        "courses/<slug:slug>/announcements/<uuid:announcement_id>",
        _private(views.course_announcement_detail),
        name="course-announcement-detail",
    ),
    path(
        "courses/<slug:slug>/announcements/<uuid:announcement_id>/pin",
        _private(views.course_announcement_pin),
        name="course-announcement-pin",
    ),
]
