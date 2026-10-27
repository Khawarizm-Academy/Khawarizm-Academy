"""Admin video routes — owned by the videohosting feature.

Paths and name attributes are identical to the original ``adminconsole/urls.py``
entries so the frontend fetchers need no changes.  The origin middleware
exemption for the OAuth callback (``config/middleware.py:38``) still applies
because the path string hasn't changed.
"""

from django.urls import path

from features.videohosting.console import views

urlpatterns = [
    path("video-providers", views.video_providers, name="admin-video-providers"),
    path("video-assets", views.video_assets, name="admin-video-assets"),
    path("video-assets/upload", views.video_asset_upload, name="admin-video-asset-upload"),
    path("video-assets/<uuid:asset_id>", views.video_asset_detail, name="admin-video-asset-detail"),
    path("video-diagnostics", views.video_diagnostics, name="admin-video-diagnostics"),
    path("video-drive/oauth/start", views.video_drive_oauth_start, name="admin-video-drive-oauth-start"),
    path("video-drive/oauth/callback", views.video_drive_oauth_callback, name="admin-video-drive-oauth-callback"),
    path("video-drive/oauth/status", views.video_drive_oauth_status, name="admin-video-drive-oauth-status"),
    path("video-drive/oauth/disconnect", views.video_drive_oauth_disconnect, name="admin-video-drive-oauth-disconnect"),
]
