"""Video hosting views — the control plane.

The backend never carries video bytes: it mints a scoped token, rewrites the
stored ``__TOKEN__`` playlists for one request, gates the AES key, and 302-redirects
each segment to the provider's CDN so the encrypted ``.ts`` flows browser↔provider.
"""

from __future__ import annotations

from typing import Any

from django.http import HttpResponse, StreamingHttpResponse
from django.urls import reverse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth.device import client_ip
from features.videohosting import tokens
from features.videohosting.models import VideoAsset, VideoSegment
from features.videohosting.packaging import TOKEN_PLACEHOLDER
from features.videohosting.providers import provider_listing, spec_for
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
    # An un-packaged asset has no master playlist — the watch URL points at the
    # gated raw endpoint instead, so the player branches on `mode`.
    is_raw = not (asset.master_playlist or "").strip()
    if is_raw:
        url = request.build_absolute_uri(
            f"{reverse('videohosting-raw', kwargs={'slug': asset.slug})}?token={raw}"
        )
    else:
        url = request.build_absolute_uri(reverse("videohosting-master", kwargs={"token": raw}))
    return Response(minted_token(asset, raw, row, url))


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
        # Assets created before provider assignment are Telegram-segmented —
        # the only provider that produced HLS segments.
        if url is None and provider is None:
            telegram = spec_for("telegram")
            url = telegram.segment_redirect(fp) if telegram else None
    response["Location"] = url or segment.file_path or ""
    return response


@api_view(["GET"])
def raw_video_view(request: Any, slug: str):
    """Stream the un-packaged source through the platform, honoring Range.

    Drive media responses need the backend's OAuth bearer, so the browser can
    not fetch the file directly — this endpoint is the gated watch route for
    assets uploaded in raw mode (FFmpeg off). The token rides the query string
    exactly like an hls.js segment request would.
    """
    token = request.query_params.get("token", "")
    row, error = _grant(request, token)
    if error is not None:
        return error
    asset = row.asset
    file_id = asset.source_file_id
    if (asset.master_playlist or "").strip() or not file_id or asset.provider is None:
        return Response({"detail": "هذه النسخة غير متاحة للعرض المباشر."}, status=404)
    return _stream_raw(asset.provider.code, file_id, request.headers.get("Range", ""))


def _stream_raw(provider_code: str, file_id: str, range_header: str):
    """Open the provider stream, mapping provider errors to 502 with a reason."""
    from features.videohosting.providers import spec_for

    spec = spec_for(provider_code)
    stream = spec.raw_stream if (spec is not None and hasattr(spec, "raw_stream")) else None
    if stream is None:
        return Response({"detail": f"المزود {provider_code} لا يدعم العرض المباشر."}, status=400)
    try:
        status_code, byte_iter, headers = stream(file_id, range_header)
    except Exception as exc:  # noqa: BLE001 — every upstream failure surfaces here
        return Response({"detail": f"تعذّر جلب الفيديو من {provider_code}: {exc}"}, status=502)
    http_response = StreamingHttpResponse(byte_iter, status=int(status_code), content_type=headers.get("Content-Type", "application/octet-stream"))
    for header in ("Content-Length", "Content-Range", "Accept-Ranges"):
        if headers.get(header):
            http_response[header] = headers[header]
    http_response["Cache-Control"] = NO_STORE
    return http_response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def video_providers_list(request: Any) -> Response:
    """Public provider listing — uses the same logic as admin, just without gate info."""
    return Response({"results": provider_listing(include_gate=False)})

