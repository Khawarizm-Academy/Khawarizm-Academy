"""Studio and moderation routes, mounted below /api/."""

from functools import wraps

from django.urls import path

from features.studio import views


def _no_store(view):
    """Apply the Studio cache policy even when DRF returns an auth/error response."""

    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = views.NO_STORE
        return response

    return wrapped


urlpatterns = [
    # Static collection/action routes precede parameterized routes.
    path("studio/overview", _no_store(views.overview), name="studio-overview"),
    path("studio/profile", _no_store(views.profile), name="studio-profile"),
    path("studio/courses", _no_store(views.courses), name="studio-courses"),
    path("studio/courses/bulk-archive", _no_store(views.bulk_archive), name="studio-course-bulk-archive"),
    path("studio/courses/<slug:slug>/staff", _no_store(views.staff), name="studio-course-staff"),
    path(
        "studio/courses/<slug:slug>/staff/<str:staff_id>",
        _no_store(views.staff_detail),
        name="studio-course-staff-detail",
    ),
    path("studio/courses/<slug:slug>/submit", _no_store(views.submit), name="studio-course-submit"),
    path("studio/courses/<slug:slug>/publish", _no_store(views.publish), name="studio-course-publish"),
    path("studio/courses/<slug:slug>/unpublish", _no_store(views.unpublish), name="studio-course-unpublish"),
    path("studio/courses/<slug:slug>/duplicate", _no_store(views.duplicate), name="studio-course-duplicate"),
    path("studio/courses/<slug:slug>/checklist", _no_store(views.checklist), name="studio-course-checklist"),
    path("studio/courses/<slug:slug>/modules/reorder", _no_store(views.module_reorder), name="studio-module-reorder"),
    path("studio/courses/<slug:slug>/modules", _no_store(views.modules), name="studio-modules"),
    path("studio/courses/<slug:slug>", _no_store(views.course_detail), name="studio-course-detail"),
    path(
        "studio/modules/<str:module_id>/lessons/reorder", _no_store(views.lesson_reorder), name="studio-lesson-reorder"
    ),
    path("studio/modules/<str:module_id>/lessons", _no_store(views.lessons), name="studio-lessons"),
    path("studio/modules/<str:module_id>", _no_store(views.module_detail), name="studio-module-detail"),
    path("studio/lessons/<str:lesson_id>/video", _no_store(views.lesson_video), name="studio-lesson-video"),
    path("studio/lessons/<str:lesson_id>/resources", _no_store(views.resources), name="studio-lesson-resources"),
    path(
        "studio/lessons/<str:lesson_id>/resources/<str:resource_id>",
        _no_store(views.resource_detail),
        name="studio-lesson-resource-detail",
    ),
    path("studio/lessons/<str:lesson_id>", _no_store(views.lesson_detail), name="studio-lesson-detail"),
    path("admin/review-queue", _no_store(views.review_queue), name="admin-review-queue"),
    path("admin/review-queue/<slug:slug>/approve", _no_store(views.review_approve), name="admin-review-approve"),
    path(
        "admin/review-queue/<slug:slug>/request-changes",
        _no_store(views.review_request_changes),
        name="admin-review-request-changes",
    ),
]
