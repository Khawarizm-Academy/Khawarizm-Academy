"""Video hosting views — the control plane.

The backend never carries video bytes: it mints a scoped token, rewrites the
stored ``__TOKEN__`` playlists for one request, gates the AES key, and 302-redirects
each segment to the provider's CDN so the encrypted ``.ts`` flows browser↔provider.
"""

from __future__ import annotations

import re
import threading
from datetime import timedelta
from typing import Any
from urllib.parse import urlsplit

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse, StreamingHttpResponse
from django.urls import reverse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import exceptions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.auth.device import client_ip
from features.common.errors import (
    Conflict,
    InvalidParameter,
    NotEntitled,
    NotFound,
    NoVideo,
    RangeNotSatisfiable,
    UpstreamUnavailable,
)
from features.common.messages import (
    INVALID_VIDEO_LINK,
    NOT_READY,
    NOT_READY_ERROR,
    NOT_READY_PROCESSING,
    NOT_READY_STAGED,
    PLAYBACK_TOKEN_INVALID,
    RAW_BUSY,
    RENDITION_NOT_DIRECT,
    RENDITION_NOT_FOUND,
    SEGMENT_NOT_FOUND,
    VIDEO_NOT_FOUND,
    provider_no_direct,
)
from features.common.schemas import ErrorSerializer
from features.common.throttling import scoped_throttle
from features.courses.models import CourseLesson, LessonProgress
from features.videohosting import tokens
from features.videohosting.models import VideoAsset, VideoCaption, VideoSegment
from features.videohosting.packaging import TOKEN_PLACEHOLDER
from features.videohosting.providers import provider_listing, spec_for
from features.videohosting.serializers import asset_meta, minted_token
from features.videohosting.services import playback_access

_M3U8 = "application/vnd.apple.mpegurl"
_PLAYLIST_RESPONSE = OpenApiResponse(
    response=OpenApiTypes.STR,
    description="The playlist text — `__TOKEN__` placeholders rewritten per request.",
)


class PlaybackTokenInvalid(exceptions.APIException):
    """An expired or unknown playback grant; the player re-mints and retries."""

    status_code = 403
    default_code = "token_invalid"
    default_detail = PLAYBACK_TOKEN_INVALID


# Per-status "not ready" — staged waits for an FFmpeg host, processing waits for time.
NOT_READY_BY_STATUS = {
    "staged": NOT_READY_STAGED,
    "processing": NOT_READY_PROCESSING,
    "uploading": NOT_READY_PROCESSING,
    "error": NOT_READY_ERROR,
}

# Manifests and keys carry the token, so they must never be cached by a proxy.
NO_STORE = "no-store"
_RAW_SEMAPHORE = threading.BoundedSemaphore(max(1, int(settings.VIDEO_RAW_MAX_CONCURRENT)))


def _playlist_response(text: str) -> HttpResponse:
    """Serve a rewritten m3u8 — an HLS playlist content type, never cached."""
    response = HttpResponse(text, content_type="application/vnd.apple.mpegurl")
    response["Cache-Control"] = NO_STORE
    response["Referrer-Policy"] = "no-referrer"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def _grant(request: Any, token: str):
    """Resolve the playback grant or raise `PlaybackTokenInvalid`."""
    row = tokens.resolve(token, client_ip(request))
    if row is None:
        raise PlaybackTokenInvalid()
    return row


def _require_hls(row: Any) -> None:
    if row.asset.playback_mode != "hls" or not (row.asset.master_playlist or "").strip():
        raise NotFound(RENDITION_NOT_DIRECT)


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


def _resolve_lesson_ref(asset: VideoAsset, value: Any) -> CourseLesson | None:
    if value is None:
        return None
    if not isinstance(value, dict) or set(value) != {"course", "lesson"}:
        raise InvalidParameter(INVALID_VIDEO_LINK)
    course_slug, lesson_id = value.get("course"), value.get("lesson")
    if not isinstance(course_slug, str) or not isinstance(lesson_id, str) or not course_slug or not lesson_id:
        raise InvalidParameter(INVALID_VIDEO_LINK)
    lesson = (
        CourseLesson.objects.select_related("module__course")
        .filter(module__course__slug=course_slug, lesson_id=lesson_id, video_asset_id=asset.pk)
        .first()
    )
    if lesson is None:
        raise InvalidParameter(INVALID_VIDEO_LINK)
    return lesson


def _safe_embed_url(asset: VideoAsset) -> str:
    spec = spec_for(asset.provider.code) if asset.provider_id else None
    if spec is None or spec.embed_url is None:
        raise InvalidParameter(INVALID_VIDEO_LINK)
    url = spec.embed_url(asset.external_ref)
    host = (urlsplit(url).hostname or "").lower()
    allowed = [item.lower().lstrip(".") for item in settings.VIDEO_EMBED_ALLOWED_HOSTS]
    if not host or not any(host == suffix or host.endswith(f".{suffix}") for suffix in allowed):
        raise InvalidParameter(INVALID_VIDEO_LINK)
    return url


def _caption_payload(request: Any, asset: VideoAsset, token: str) -> list[dict[str, Any]]:
    return [
        {
            "language": caption.language,
            "label": caption.label,
            "url": request.build_absolute_uri(
                reverse("videohosting-caption", kwargs={"token": token, "lang": caption.language})
            ),
            "isDefault": caption.is_default,
        }
        for caption in VideoCaption.objects.filter(asset_id=asset.pk).order_by("-is_default", "language")
    ]


def _next_lesson_id(lesson: CourseLesson) -> str | None:
    module = lesson.module
    return (
        CourseLesson.objects.filter(module__course_id=module.course_id, is_published=True)
        .filter(
            Q(module__order__gt=module.order)
            | Q(module__order=module.order, module__module_id__gt=module.module_id)
            | Q(
                module__order=module.order,
                module__module_id=module.module_id,
                order__gt=lesson.order,
            )
            | Q(
                module__order=module.order,
                module__module_id=module.module_id,
                order=lesson.order,
                lesson_id__gt=lesson.lesson_id,
            )
        )
        .order_by("module__order", "module__module_id", "order", "lesson_id")
        .values_list("lesson_id", flat=True)
        .first()
    )


def _issue_grant(request: Any, asset: VideoAsset, access: Any, lesson: CourseLesson | None = None) -> dict[str, Any]:
    mode = asset.playback_mode
    if mode not in {"hls", "raw", "embed", "external"}:
        raise Conflict(NOT_READY)
    preview_ttl = timedelta(minutes=max(1, settings.VIDEO_GRANT_TTL_PREVIEW_MINUTES))
    expires_at = None
    token = ""
    row = None
    play_url = ""
    embed_url = ""
    source_url = ""

    if mode in {"hls", "raw"}:
        ttl = preview_ttl if access.via == "preview" else None
        token, row = tokens.mint(asset, request.user, client_ip(request), lesson=lesson, ttl=ttl)
        if mode == "hls":
            play_url = request.build_absolute_uri(reverse("videohosting-master", kwargs={"token": token}))
        else:
            play_url = request.build_absolute_uri(
                f"{reverse('videohosting-raw', kwargs={'slug': asset.slug})}?token={token}"
            )
        captions = _caption_payload(request, asset, token)
    else:
        tokens.record_view(asset)
        expires_at = timezone.now() + preview_ttl
        if mode == "embed":
            embed_url = _safe_embed_url(asset)
        else:
            source_url = asset.external_ref
        captions = None

    grant = minted_token(
        asset,
        token,
        row,
        play_url,
        expires_at=expires_at,
        embed_url=embed_url,
        source_url=source_url,
        captions=captions,
    )
    if lesson is not None:
        progress = (
            LessonProgress.objects.filter(user_id=request.user.pk, lesson_id=lesson.pk)
            .values_list("position_seconds", flat=True)
            .first()
        )
        grant["resumeAt"] = progress or 0
        grant["lesson"] = {
            "id": lesson.lesson_id,
            "title": lesson.title,
            "nextLessonId": _next_lesson_id(lesson),
        }
    return grant


@extend_schema(
    operation_id="video_meta",
    summary="Readiness and the rendition ladder for one asset.",
    description="Polled before minting a playback grant; unknown and non-entitled slugs are 404 `not_found`.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{slug, title, status, renditions: [...]}` — status gates the token mint.",
        ),
    },
)
@api_view(["GET"])
def video_meta_view(request: Any, slug: str) -> Response:
    """Readiness and the rendition ladder — polled before minting a grant."""
    asset = VideoAsset.objects.select_related("provider").filter(slug=slug).prefetch_related("renditions").first()
    if asset is None or not asset.playback_mode:
        raise NotFound(VIDEO_NOT_FOUND)
    if not playback_access(request.user, asset).allowed:
        raise NotFound(VIDEO_NOT_FOUND)
    return Response(asset_meta(asset))


@extend_schema(
    operation_id="video_token",
    summary="Mint a short-lived playback grant.",
    request=None,
    description="Entitlement-checked playback grant; stored mode is one of hls/raw/embed/external. "
    "HLS/raw grants are IP-bound; link grants carry no bearer token.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="`{token, url, mode, expiresAt, ...}` — the grant shown once.",
        ),
        409: OpenApiResponse(response=ErrorSerializer, description="`not_ready` — the asset is not `ready` yet."),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("video_token")
def video_token_view(request: Any, slug: str) -> Response:
    """Mint an entitlement-checked playback grant bound to the caller's IP and account."""
    asset = VideoAsset.objects.select_related("provider").prefetch_related("renditions").filter(slug=slug).first()
    if asset is None:
        raise NotFound(VIDEO_NOT_FOUND)
    access = playback_access(request.user, asset)
    if not access.allowed:
        raise NotEntitled()
    if asset.status != "ready":
        raise Conflict(NOT_READY_BY_STATUS.get(asset.status, NOT_READY))
    payload = request.data or {}
    if not isinstance(payload, dict) or set(payload) - {"lessonRef"}:
        raise InvalidParameter(INVALID_VIDEO_LINK)
    lesson = _resolve_lesson_ref(asset, payload.get("lessonRef"))
    return Response(_issue_grant(request, asset, access, lesson))


@extend_schema(
    operation_id="lesson_playback",
    summary="Resolve an enrolled lesson's video and mint its playback grant.",
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("lesson_id", OpenApiTypes.STR, OpenApiParameter.PATH),
    ],
    request=None,
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="Playback grant plus resume and next-lesson data."
        ),
        403: OpenApiResponse(response=ErrorSerializer, description="`not_entitled` for a non-entitled viewer."),
        409: OpenApiResponse(response=ErrorSerializer, description="`no_video` when the lesson has no linked asset."),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("video_token")
def lesson_playback_view(request: Any, slug: str, lesson_id: str) -> Response:
    """Resolve the linked asset from the course lesson; clients never build a video slug."""
    lesson = (
        CourseLesson.objects.select_related("module__course", "video_asset__provider")
        .filter(module__course__slug=slug, lesson_id=lesson_id)
        .first()
    )
    if lesson is None:
        raise NotFound("الدرس غير موجود.")
    if lesson.video_asset_id is None:
        raise NoVideo()
    asset = lesson.video_asset
    access = playback_access(request.user, asset)
    if not access.allowed:
        raise NotEntitled()
    if asset.status != "ready":
        raise Conflict(NOT_READY_BY_STATUS.get(asset.status, NOT_READY))
    return Response(_issue_grant(request, asset, access, lesson))


@extend_schema(
    operation_id="stream_caption",
    summary="Serve one WebVTT caption for a short-lived video token.",
    auth=None,
    parameters=[
        OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("lang", OpenApiTypes.STR, OpenApiParameter.PATH),
    ],
    responses={(200, "text/vtt"): OpenApiResponse(response=OpenApiTypes.STR, description="WebVTT caption text.")},
)
@api_view(["GET"])
def caption_view(request: Any, token: str, lang: str) -> HttpResponse:
    """Serve a caption only when the associated stream grant remains valid."""
    row = _grant(request, token)
    if row.asset.playback_mode not in {"hls", "raw"}:
        raise NotFound("الترجمة غير موجودة.")
    caption = VideoCaption.objects.filter(asset_id=row.asset_id, language=lang).first()
    if caption is None:
        raise NotFound("الترجمة غير موجودة.")
    response = HttpResponse(caption.vtt, content_type="text/vtt; charset=utf-8")
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@extend_schema(
    operation_id="stream_master",
    summary="The HLS master playlist for a grant.",
    description="Token-authenticated (hls.js cannot send headers); a dead or foreign-IP token is 403 `token_invalid`.",
    auth=None,
    parameters=[OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={(200, _M3U8): _PLAYLIST_RESPONSE},
)
@api_view(["GET"])
def master_playlist_view(request: Any, token: str):
    """The master playlist with the caller's token baked into every variant URI."""
    row = _grant(request, token)
    _require_hls(row)
    return _playlist_response(row.asset.master_playlist.replace(TOKEN_PLACEHOLDER, token))


@extend_schema(
    operation_id="stream_media",
    summary="One rendition's media playlist.",
    auth=None,
    parameters=[
        OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("quality", OpenApiTypes.STR, OpenApiParameter.PATH),
    ],
    responses={(200, _M3U8): _PLAYLIST_RESPONSE},
)
@api_view(["GET"])
def media_playlist_view(request: Any, token: str, quality: str):
    """One rendition playlist with token-scoped segment and key URIs."""
    row = _grant(request, token)
    _require_hls(row)
    rendition = row.asset.renditions.filter(quality=quality).first()
    if rendition is None:
        raise NotFound(RENDITION_NOT_FOUND)
    return _playlist_response(rendition.playlist.replace(TOKEN_PLACEHOLDER, token))


@extend_schema(
    operation_id="stream_key",
    summary="The AES-128 key bytes for one rendition.",
    description="IP-bound and expiring; served `no-store` — a leaked URL exposes encrypted bytes only.",
    auth=None,
    parameters=[
        OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("quality", OpenApiTypes.STR, OpenApiParameter.PATH),
    ],
    responses={
        ("200", "application/octet-stream"): OpenApiResponse(
            response=OpenApiTypes.BINARY, description="The 16-byte key."
        ),
    },
)
@api_view(["GET"])
def key_view(request: Any, token: str, quality: str):
    """The 16-byte AES-128 key for one rendition — the only secret the player needs."""
    row = _grant(request, token)
    _require_hls(row)
    rendition = row.asset.renditions.filter(quality=quality).first()
    if rendition is None:
        raise NotFound(RENDITION_NOT_FOUND)
    response = HttpResponse(bytes.fromhex(rendition.aes_key_hex), content_type="application/octet-stream")
    response["Cache-Control"] = NO_STORE
    return response


@extend_schema(
    operation_id="stream_segment",
    summary="One 6s encrypted segment.",
    description="Resolves a fresh provider path per view and **302s** straight to the CDN — "
    "the backend never proxies bytes.",
    auth=None,
    parameters=[
        OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("quality", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("index", OpenApiTypes.INT, OpenApiParameter.PATH),
    ],
    responses={
        ("200", "video/mp2t"): OpenApiResponse(response=OpenApiTypes.BINARY, description="The encrypted .ts bytes."),
        302: OpenApiResponse(description="Redirect to the provider/CDN URL."),
    },
)
@api_view(["GET"])
def segment_view(request: Any, token: str, quality: str, index: int):
    """Resolve one segment and 302 the browser straight to the provider's CDN."""
    row = _grant(request, token)
    _require_hls(row)
    segment = VideoSegment.objects.filter(rendition__asset=row.asset, rendition__quality=quality, index=index).first()
    if segment is None:
        raise NotFound(SEGMENT_NOT_FOUND)
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


@extend_schema(
    operation_id="video_raw",
    summary="The gated raw source for an un-packaged asset.",
    description="Drive assets watch through here when HLS packaging is off; the token rides in the query. "
    "Range requests pass through to the provider's media API.",
    auth=None,
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("token", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter("Range", OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
    ],
    responses={
        ("200", "video/mp4"): OpenApiResponse(response=OpenApiTypes.BINARY, description="The source bytes."),
        ("206", "video/mp4"): OpenApiResponse(response=OpenApiTypes.BINARY, description="The requested range."),
    },
)
@api_view(["GET"])
def raw_video_view(request: Any, slug: str):
    """Stream the un-packaged source through the platform, honoring Range.

    Drive media responses need the backend's OAuth bearer, so the browser can
    not fetch the file directly — this endpoint is the gated watch route for
    assets uploaded in raw mode (FFmpeg off). The token rides the query string
    exactly like an hls.js segment request would.
    """
    token = request.query_params.get("token", "")
    row = _grant(request, token)
    asset = row.asset
    file_id = asset.source_file_id
    if (
        asset.slug != slug
        or asset.playback_mode != "raw"
        or asset.protection != "gated"
        or not file_id
        or asset.provider is None
    ):
        raise NotFound(RENDITION_NOT_DIRECT)
    return _stream_raw(asset, file_id, request.headers.get("Range", ""))


def _range_window(range_header: str, total: int, cap: int) -> tuple[str, int, int]:
    """Normalize one byte range to a finite window no larger than `cap`."""
    cap = max(1, cap)
    value = (range_header or "").strip()
    if len(value) > 100:
        raise RangeNotSatisfiable()
    if not value:
        start, end = 0, cap - 1
    else:
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", value, flags=re.IGNORECASE)
        if match is None or (not match.group(1) and not match.group(2)):
            raise RangeNotSatisfiable()
        start_text, end_text = match.groups()
        if not start_text:
            if total <= 0:
                raise RangeNotSatisfiable()
            suffix = int(end_text)
            if suffix <= 0:
                raise RangeNotSatisfiable()
            end = total - 1
            start = max(0, end - min(suffix, cap) + 1)
        else:
            start = int(start_text)
            end = int(end_text) if end_text else start + cap - 1
    if total > 0:
        if start >= total:
            raise RangeNotSatisfiable()
        end = min(end, total - 1)
    if end < start:
        raise RangeNotSatisfiable()
    end = min(end, start + cap - 1)
    return f"bytes={start}-{end}", start, end


def _content_range(value: str) -> tuple[int, int, int | None] | None:
    match = re.fullmatch(r"bytes\s+(\d+)-(\d+)/(\d+|\*)", (value or "").strip(), flags=re.IGNORECASE)
    if match is None:
        return None
    start, end = int(match.group(1)), int(match.group(2))
    total = None if match.group(3) == "*" else int(match.group(3))
    if end < start or (total is not None and end >= total):
        return None
    return start, end, total


def _bounded_chunks(byte_iter, limit: int):
    """Release the process-wide permit even when the client drops the stream."""

    def generate():
        remaining = limit
        try:
            for part in byte_iter:
                if remaining <= 0:
                    break
                chunk = part if isinstance(part, bytes) else bytes(part)
                if len(chunk) > remaining:
                    yield chunk[:remaining]
                    break
                remaining -= len(chunk)
                yield chunk
        finally:
            close = getattr(byte_iter, "close", None)
            try:
                if callable(close):
                    close()
            finally:
                _RAW_SEMAPHORE.release()

    return generate()


def _stream_raw(asset: VideoAsset, file_id: str, range_header: str):
    """Open a bounded provider byte window without forwarding provider secrets."""
    spec = spec_for(asset.provider.code) if asset.provider_id else None
    stream = spec.raw_stream if spec is not None else None
    if stream is None:
        raise InvalidParameter(provider_no_direct(asset.provider.code if asset.provider_id else "unknown"))
    cap = max(1, int(settings.VIDEO_RAW_RANGE_CAP_BYTES))
    try:
        bounded_range, start, requested_end = _range_window(range_header, asset.source_size_bytes, cap)
    except RangeNotSatisfiable as exc:
        response = Response(
            {"detail": str(exc.detail), "code": exc.default_code},
            status=exc.status_code,
        )
        response["Content-Range"] = f"bytes */{max(0, asset.source_size_bytes)}"
        response["Accept-Ranges"] = "bytes"
        response["Cache-Control"] = "private, no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response
    if not _RAW_SEMAPHORE.acquire(blocking=False):
        response = Response({"detail": RAW_BUSY, "code": "raw_busy"}, status=503)
        response["Retry-After"] = "2"
        response["Cache-Control"] = "private, no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response
    byte_iter = None
    try:
        status_code, byte_iter, headers = stream(file_id, bounded_range)
        content_range = _content_range(headers.get("Content-Range", ""))
        if status_code != 206 or content_range is None:
            raise ValueError("invalid upstream range response")
        actual_start, actual_end, upstream_total = content_range
        if (
            actual_start != start
            or actual_end > requested_end
            or actual_end - actual_start + 1 > cap
            or (asset.source_size_bytes > 0 and upstream_total not in (None, asset.source_size_bytes))
        ):
            raise ValueError("upstream range exceeded the requested window")
        length = actual_end - actual_start + 1
    except Exception as exc:
        try:
            close = getattr(byte_iter, "close", None)
            if callable(close):
                close()
        except Exception:
            pass
        finally:
            _RAW_SEMAPHORE.release()
        raise UpstreamUnavailable() from exc

    http_response = StreamingHttpResponse(
        _bounded_chunks(byte_iter, length),
        status=206,
        content_type=asset.mime_type or "application/octet-stream",
    )
    http_response["Content-Length"] = str(length)
    http_response["Content-Range"] = headers.get("Content-Range", "")
    http_response["Accept-Ranges"] = "bytes"
    http_response["Cache-Control"] = "private, no-store"
    http_response["Referrer-Policy"] = "no-referrer"
    http_response["X-Content-Type-Options"] = "nosniff"
    return http_response


@extend_schema(
    operation_id="video_providers",
    summary="The public provider listing.",
    description="Same registry logic as the admin endpoint, without the gate diagnostics.",
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{results: [Provider]}`"),
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def video_providers_list(request: Any) -> Response:
    """Public provider listing — uses the same logic as admin, just without gate info."""
    return Response({"results": provider_listing(include_gate=False)})
