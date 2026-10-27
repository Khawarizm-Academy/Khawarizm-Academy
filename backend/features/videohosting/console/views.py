"""Admin console video endpoints — providers, assets, uploads, Drive OAuth, diagnostics."""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from tempfile import gettempdir

from django.db import connections
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from features.auth.permissions import IsAdminRole
from features.videohosting import diagnostics, drive_oauth, ingest
from features.videohosting.models import VideoAsset, VideoProvider
from features.videohosting.providers import ensure_defaults, provider_listing


def _resolve_provider(provider_code):
    """Resolve one provider code against the registry and its env checks.

    Returns ``(provider, None)`` on success or ``(None, ready Response)``.
    An unknown code fails loudly instead of silently falling back.
    """
    if not provider_code:
        provider = VideoProvider.objects.filter(is_default=True, is_enabled=True).first()
        return provider, None
    provider = VideoProvider.objects.filter(code=provider_code).first()
    if provider is None:
        return None, Response({"detail": f"مزود غير معروف: {provider_code}."}, status=status.HTTP_400_BAD_REQUEST)
    # The provider becomes selectable the moment its own env checks pass.
    if not diagnostics.provider_available(provider.code):
        return None, Response(
            {"detail": f"الرفع عبر {provider.name} غير جاهز — {diagnostics.provider_reason(provider.code)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return provider, None


def _asset_row(asset, *, include_error: bool = False) -> dict:
    """Tracker-ready camelCase projection used by list / detail / upload."""
    row = {
        "id": str(asset.id),
        "slug": asset.slug,
        "title": asset.title,
        "status": asset.status,
        "provider": asset.provider.code if asset.provider else None,
        "progress": asset.progress,
        "stage": asset.stage,
        "qualities": asset.renditions.count(),
        "createdAt": asset.created_at.isoformat(),
    }
    if include_error:
        row["error"] = asset.error_message[:300]
    return row


VIDEO_UPLOAD_MAX_BYTES = 2 ** 31     # Bot uploads cap at ~2GB


def _login_page(okay: bool, detail: str) -> HttpResponse:
    """The tiny neutral landing page Google's redirect ends on."""
    body = (
        "<!doctype html><html lang=ar dir=rtl><meta charset=utf-8><title>تخويل Google Drive</title>"
        f"<body style='font-family:sans-serif;text-align:center;padding:4rem'>"
        f"<h2>{'✓ تم ربط حساب Google' if okay else '✗ فشل التخويل'}</h2>"
        f"<p>{detail[:200]}</p>"
        "<p>أغلق هذه الصفحة، ثم أعد «فحص المنظومة» من لوحة الإدارة.</p>"
        "<script>setTimeout(close,4000)</script></body></html>"
    )
    return HttpResponse(body, content_type="text/html; charset=utf-8")


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_providers(request):
    """Admin provider list enriched with availability gate info."""
    return Response({"results": provider_listing(include_gate=True)})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_assets(request):
    """List first 100 assets or create a new one after provider resolution."""
    ensure_defaults()
    if request.method == "POST":
        data = request.data or {}
        slug = data.get("slug")
        if not slug:
            return Response({"detail": "slug مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
        provider, refusal = _resolve_provider(data.get("provider"))
        if refusal is not None:
            return refusal
        try:
            asset = VideoAsset.objects.create(
                slug=slug,
                title=data.get("title") or "",
                provider=provider,
                created_by=request.user,
            )
            return Response(
                {"id": str(asset.id), "slug": asset.slug, "title": asset.title,
                 "status": asset.status, "provider": asset.provider.code if asset.provider else None},
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            return Response({"detail": "تعذّر الإنشاء."}, status=status.HTTP_400_BAD_REQUEST)
    assets = VideoAsset.objects.select_related("provider").prefetch_related("renditions").all()[:100]
    return Response({"results": [_asset_row(a, include_error=True) for a in assets]})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_start(request):
    """Open the consent dance — Google's URL for the admin's browser."""
    try:
        return Response({"authUrl": drive_oauth.consent_url()})
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def video_drive_oauth_callback(request):
    """Google's redirect target — validates state, mints grant, shows result."""
    okay, email, detail = drive_oauth.complete(
        request.query_params.get("state") or "", request.query_params.get("code") or ""
    )
    return _login_page(okay, detail)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_status(request):
    """The admin-safe connection state — account email, no tokens."""
    grant = drive_oauth.connected()
    return Response({
        "connected": grant["connected"],
        "accountEmail": grant["account_email"],
        "status": grant["status"],
        "error": grant["error_message"],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_drive_oauth_disconnect(request):
    """Revoke the grant at Google and drop the persisted credential."""
    drive_oauth.revoke()
    return Response({"connected": False})


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_asset_upload(request):
    """Accept the actual video file, then ingest it in a worker thread."""
    ensure_defaults()
    uploaded = request.data.get("file")
    slug = (request.data.get("slug") or "").strip()
    if uploaded is None or not slug:
        return Response({"detail": "الملف و معرّف الفيديو مطلوبان."}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded.size > VIDEO_UPLOAD_MAX_BYTES:
        return Response({"detail": "الملف أكبر من 2GB — قسّمه أو استخدم ingest_video من الخادم."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    provider, refusal = _resolve_provider(request.data.get("provider"))
    if refusal is not None:
        return refusal

    existing = VideoAsset.objects.filter(slug=slug).first()
    if existing is not None and existing.status in ("uploading", "processing"):
        return Response({"detail": "هذا المعرّف في منتصف رفع آخر — انتظر انتهاء المعالجة."}, status=status.HTTP_409_CONFLICT)

    file_name = getattr(uploaded, "name", "") or "video.bin"
    temp_path = Path(gettempdir()) / f"kh-video-{uuid.uuid4().hex}{Path(file_name).suffix or '.bin'}"
    with temp_path.open("wb") as destination:
        for chunk in uploaded.chunks():
            destination.write(chunk)

    asset = existing or VideoAsset.objects.create(slug=slug, created_by=request.user)
    asset.title = asset.title or (request.data.get("title") or Path(file_name).stem)
    asset.provider = provider
    asset.source_file_name = file_name
    asset.status = "uploading"
    asset.error_message = ""
    asset.progress = 0
    asset.stage = "uploading"
    asset.save(update_fields=["title", "provider", "source_file_name", "status", "error_message", "progress", "stage", "updated_at"])

    worker = threading.Thread(target=_run_ingest_worker, args=(slug, str(temp_path)), daemon=True)
    worker.start()
    return Response(_asset_row(asset), status=status.HTTP_202_ACCEPTED)


def _run_ingest_worker(slug: str, file_path: str) -> None:
    """The background half of an admin upload: ingest, then drop DB connection."""
    from features.common.choices import VideoStatus

    try:
        ingest.ingest_file(file_path, slug, remove_source=True, track_progress=True)
    except Exception as exc:
        VideoAsset.objects.filter(slug=slug).exclude(
            status__in=(VideoStatus.READY, VideoStatus.STAGED, VideoStatus.ERROR)
        ).update(status=VideoStatus.ERROR, error_message=f"عامل الرفع توقّف: {exc}"[:2000], stage="")
    finally:
        connections.close_all()


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_asset_detail(request, asset_id):
    """GET tracker shape / DELETE the asset."""
    asset = VideoAsset.objects.filter(pk=asset_id).first()
    if asset is None:
        return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        asset.delete()
        return Response({"deleted": True, "id": str(asset_id)})
    return Response(_asset_row(asset, include_error=True))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def video_diagnostics(request):
    """Staged validation — shallow (default) or deep (live API probes)."""
    deep = (request.query_params.get("deep") or "").lower() in {"1", "true", "yes"}
    return Response(diagnostics.run(deep=deep))
