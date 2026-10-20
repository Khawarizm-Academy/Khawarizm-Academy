"""Video hosting routes — mounted under /api/.

Playback paths carry the token instead of a session cookie because `Authorization`
cannot ride on an hls.js segment request; the token is the whole grant.
"""

from __future__ import annotations

from django.urls import path

from features.videohosting import views

urlpatterns = [
    path("videos/<slug:slug>", views.video_meta_view, name="videohosting-meta"),
    path("videos/<slug:slug>/token", views.video_token_view, name="videohosting-token"),
    # HLS control plane: hls.js and the browser resolve these from the playlists.
    path("stream/<str:token>/master.m3u8", views.master_playlist_view, name="videohosting-master"),
    path("stream/<str:token>/<slug:quality>/index.m3u8", views.media_playlist_view, name="videohosting-media"),
    path("stream/<str:token>/key/<slug:quality>", views.key_view, name="videohosting-key"),
    path("stream/<str:token>/<slug:quality>/<int:index>.ts", views.segment_view, name="videohosting-segment"),
]
