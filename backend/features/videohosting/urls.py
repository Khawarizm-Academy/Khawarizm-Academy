"""Video hosting routes — mounted under /api/.

Playback paths carry the token instead of a session cookie because `Authorization`
cannot ride on an hls.js segment request; the token is the whole grant.
"""

from __future__ import annotations

from django.urls import path

from features.videohosting import studio_assets, studio_uploads, views

urlpatterns = [
    # Static slugs resolve before <slug:slug> — otherwise "providers" is taken
    # as an asset slug and meta's 404 shadows this route entirely.
    path("videos/providers", views.video_providers_list, name="videohosting-providers"),
    path("videos/<slug:slug>", views.video_meta_view, name="videohosting-meta"),
    path("videos/<slug:slug>/token", views.video_token_view, name="videohosting-token"),
    path("videos/<slug:slug>/raw", views.raw_video_view, name="videohosting-raw"),
    path(
        "courses/<str:slug>/lessons/<str:lesson_id>/playback",
        views.lesson_playback_view,
        name="lesson-playback",
    ),
    # Studio library and resumable upload API; upload URIs remain server-side.
    path("studio/video-providers", studio_uploads.video_providers, name="studio-video-providers"),
    path("studio/videos", studio_uploads.videos, name="studio-videos"),
    path("studio/videos/link", studio_uploads.create_link, name="studio-video-link-create"),
    path(
        "studio/videos/<str:asset_id>/captions",
        studio_assets.studio_video_caption_create,
        name="studio-video-caption-create",
    ),
    path(
        "studio/videos/<str:asset_id>/captions/<str:language>",
        studio_assets.studio_video_caption_delete,
        name="studio-video-caption-delete",
    ),
    path("studio/videos/<str:asset_id>/upload", studio_uploads.init_upload, name="studio-video-upload-init"),
    path("studio/videos/<str:asset_id>", studio_assets.studio_video_detail, name="studio-video-detail"),
    path("studio/uploads/<str:session_id>/chunk", studio_uploads.upload_chunk, name="studio-video-upload-chunk"),
    path(
        "studio/uploads/<str:session_id>/complete", studio_uploads.complete_upload, name="studio-video-upload-complete"
    ),
    path("studio/uploads/<str:session_id>", studio_uploads.upload_status, name="studio-video-upload-status"),
    # HLS control plane: hls.js and the browser resolve these from the playlists.
    path("stream/<str:token>/captions/<str:lang>.vtt", views.caption_view, name="videohosting-caption"),
    path("stream/<str:token>/master.m3u8", views.master_playlist_view, name="videohosting-master"),
    path("stream/<str:token>/<slug:quality>/index.m3u8", views.media_playlist_view, name="videohosting-media"),
    path("stream/<str:token>/key/<slug:quality>", views.key_view, name="videohosting-key"),
    path("stream/<str:token>/<slug:quality>/<int:index>.ts", views.segment_view, name="videohosting-segment"),
]
