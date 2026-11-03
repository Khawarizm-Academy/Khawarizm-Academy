"""Private instructor analytics routes mounted below the shared API root."""

from functools import wraps

from django.urls import path

from features.studio import analytics_views


def _no_store(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = analytics_views.NO_STORE
        return response

    return wrapped


urlpatterns = [
    path("studio/analytics/overview", _no_store(analytics_views.overview), name="studio-analytics-overview"),
    path("studio/analytics/courses/<slug:slug>", _no_store(analytics_views.course), name="studio-analytics-course"),
]
