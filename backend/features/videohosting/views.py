"""Video hosting views — the control plane.

The backend never carries video bytes: it mints a scoped token, rewrites the
stored ``__TOKEN__`` playlists for one request, gates the AES key, and 302-redirects
each segment to the provider's CDN so the encrypted ``.ts`` flows browser↔provider.
"""

from __future__ import annotations

from typing import Any

from django.http import HttpResponse
from django.urls import reverse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth.device import client_ip
from features.videohosting import tokens
from features.videohosting.models import VideoAsset, VideoSegment
from features.videohosting.providers import default_code, spec_for
from features.videohosting.serializers import asset_meta, minted_token

ASSET_NOT_FOUND = {"detail": "الفيديو غير موجود"}
TOKEN_INVALID = {"detail": "انتهت صلاحية رابط المشاهدة"}
RENDITION_NOT_FOUND = {"detail": "النسخة المطلوبة غير موجودة"}
SEGMENT_NOT_FOUND = {"detail": "المقطع غير موجود"}
# Per-status "not ready" — staged waits for an FFmpeg host, processing waits for time.
NOT_READY_BY_STATUS = {
    "staged": {"detail": "الفيديو مرفوع بانتظار التغليف — شغّل ingest_video بـ --package force من جهاز به FFmpeg"},
    "processing": {"detail": "الفيديو قيد المعالجة"},
    "uploading": {"detail": "الفيديو قيد المعالجة"},
    "error": {"detail": "فشلت معالجة الفيديو — راجع لوحة الإدارة"},
}
NOT_READY = {"detail": "الفيديو غير جاهز للعرض"}

# Placeholder living in every stored playlist; rewritten with the caller's token.
# Owned by packaging.py (it bakes the URIs); imported here for serve-time rewriting.
from features.videohosting.packaging import TOKEN_PLACEHOLDER

# Manifests and keys carry the token, so they must never be cached by a proxy.
NO_STORE = "no-store"


def _playlist_response(text: str) -> HttpResponse:
    """Serve a rewritten m3u8 — an HLS playlist content type, never cached."""
    response = HttpResponse(text, content_type="application/vnd.apple.mpegurl")
    response["Cache-Control"] = NO_STORE
    return response


def _grant(request: Any, token: str):
    """Resolve the playback grant or the error response the caller should return."""
    row = tokens.resolve(token, client_ip(request))
    if row is None:
        return None, Response(TOKEN_INVALID, status=403)
    return row, None


def _refresh_segment(segment, provider) -> str:
    """Refresh a segment's file path (Telegram refreshes over HTTPS) then resolve redirect.

    Bot API file links last only about an hour, so long lessons refresh once;
    the new path is persisted so later segment views skip the lookup.  For
    non-Telegram providers the file_id IS the path and no refresh happens.
    """
    fp = segment.file_path
    if not fp and segment.file_id and provider is not None:
        spec = spec_for(provider.code)
        if spec is not None:
            fp = spec.file_path_refresher(segment.file_id)
            segment.file_path = fp
            segment.save(update_fields=["file_path", "updated_at"])
    return fp or ""


@api_view(["GET"])
def video_meta_view(request: Any, slug: str) -> Response:
    """Readiness and the rendition ladder — polled before minting a grant."""
    asset = VideoAsset.objects.filter(slug=slug).prefetch_related("renditions").first()
    if asset is None:
        return Response(ASSET_NOT_FOUND, status=404)
    return Response(asset_meta(asset))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def video_token_view(request: Any, slug: str) -> Response:
    """Mint a short-lived playback grant bound to the caller's IP and account."""
    asset = VideoAsset.objects.filter(slug=slug).first()
    if asset is None:
        return Response(ASSET_NOT_FOUND, status=404)
    if asset.status != "ready":
        return Response(NOT_READY_BY_STATUS.get(asset.status, NOT_READY), status=409)
    raw, row = tokens.mint(asset, request.user, client_ip(request))
    master_url = request.build_absolute_uri(
        reverse("videohosting-master", kwargs={"token": raw})
    )
    return Response(minted_token(asset, raw, row, master_url))


@api_view(["GET"])
def master_playlist_view(request: Any, token: str):
    """The master playlist with the caller's token baked into every variant URI."""
    row, error = _grant(request, token)
    if error is not None:
        return error
    return _playlist_response(row.asset.master_playlist.replace(TOKEN_PLACEHOLDER, token))


@api_view(["GET"])
def media_playlist_view(request: Any, token: str, quality: str):
    """One rendition playlist with token-scoped segment and key URIs."""
    row, error = _grant(request, token)
    if error is not None:
        return error
    rendition = row.asset.renditions.filter(quality=quality).first()
    if rendition is None:
        return Response(RENDITION_NOT_FOUND, status=404)
    return _playlist_response(rendition.playlist.replace(TOKEN_PLACEHOLDER, token))


@api_view(["GET"])
def key_view(request: Any, token: str, quality: str):
    """The 16-byte AES-128 key for one rendition — the only secret the player needs."""
    row, error = _grant(request, token)
    if error is not None:
        return error
    rendition = row.asset.renditions.filter(quality=quality).first()
    if rendition is None:
        return Response(RENDITION_NOT_FOUND, status=404)
    response = HttpResponse(bytes.fromhex(rendition.aes_key_hex), content_type="application/octet-stream")
    response["Cache-Control"] = NO_STORE
    return response


@api_view(["GET"])
def segment_view(request: Any, token: str, quality: str, index: int):
    """Resolve one segment and 302 the browser straight to the provider's CDN."""
    row, error = _grant(request, token)
    if error is not None:
        return error
    segment = VideoSegment.objects.filter(rendition__asset=row.asset, rendition__quality=quality, index=index).first()
    if segment is None:
        return Response(SEGMENT_NOT_FOUND, status=404)
    response = HttpResponse(status=302)
    # No Cache-Control: the redirect is tiny and the target itself is cacheable,
    # so the browser reuses downloaded segments instead of re-hitting the API.
    provider = row.asset.provider
    fp = _refresh_segment(segment, provider)
    url = None
    if fp:
        if provider is not None:
            spec = spec_for(provider.code)
            if spec is not None:
                url = spec.segment_redirect(fp)
        # Fallback for assets created before provider assignment:
        # assume Telegram (the only provider that produces HLS segments).
        if url is None and provider is None:
            # Fallback for assets created before provider assignment:
            # assume Telegram (the only provider that produces HLS segments).
            from features.videohosting.providers import SPECS
            for sp in SPECS:
                # The CDN redirect transforms a file path; identity leaves it unchanged.
                if sp.segment_redirect("check") != "check":
                    url = sp.segment_redirect(fp)
                    break
    response["Location"] = url or segment.file_path or ""
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def video_providers_list(request: Any) -> Response:
    """Public provider listing — uses the same logic as admin, just without gate info."""
    from features.videohosting.providers import provider_listing
    return Response({"results": provider_listing(include_gate=False)})

