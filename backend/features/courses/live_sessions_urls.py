"""Private live-session management routes, mounted below the shared API root."""

from functools import wraps

from django.urls import path

from features.courses import live_sessions_api


def _private(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    return wrapped


urlpatterns = [
    path(
        "studio/live-sessions",
        _private(live_sessions_api.global_live_sessions),
        name="studio-live-sessions-global",
    ),
    path(
        "studio/courses/<str:slug>/live-sessions",
        _private(live_sessions_api.live_sessions_collection),
        name="studio-live-sessions",
    ),
    path(
        "studio/courses/<str:slug>/live-sessions/<uuid:session_uuid>",
        _private(live_sessions_api.live_session_detail),
        name="studio-live-session-detail",
    ),
    path(
        "studio/courses/<str:slug>/live-sessions/<uuid:session_uuid>/cancel",
        _private(live_sessions_api.cancel_live_session),
        name="studio-live-session-cancel",
    ),
    path(
        "studio/courses/<str:slug>/live-sessions/<uuid:session_uuid>/recording",
        _private(live_sessions_api.add_live_session_recording),
        name="studio-live-session-recording",
    ),
]
