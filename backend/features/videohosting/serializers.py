"""Video hosting serializers — asset readiness and the one-time playback grant."""

from __future__ import annotations

from typing import Any

from features.common.serializers import compact


def _qualities(asset: Any) -> list[dict[str, Any]]:
    """The packaged ladder, lowest bandwidth first (the order players climb)."""
    rows = sorted(asset.renditions.all(), key=lambda row: row.bandwidth_bps)
    return [
        {
            "quality": row.quality,
            "width": row.width,
            "height": row.height,
            "bandwidthBps": row.bandwidth_bps,
        }
        for row in rows
    ]


def asset_meta(asset: Any) -> dict[str, Any]:
    """What the player needs before minting: readiness, length, ladder, views."""
    return compact(
        id=asset.slug,
        title=asset.title,
        status=asset.status,
        durationSeconds=asset.duration_seconds,
        viewCount=asset.view_count if asset.view_count else None,
        qualities=_qualities(asset),
        playbackMode=asset.playback_mode,
        protection=asset.protection,
        provider=asset.provider.code if asset.provider_id else None,
        poster=asset.poster_url,
        mimeType=asset.mime_type,
    )


def minted_token(
    asset: Any,
    raw_token: str,
    token_row: Any,
    master_url: str,
    *,
    mode: str | None = None,
    expires_at: Any = None,
    embed_url: str = "",
    source_url: str = "",
    captions: list[dict[str, Any]] | None = None,
    resume_at: int | None = None,
) -> dict[str, Any]:
    """The playback grant — the raw token appears here and nowhere else.

    The stored playback mode is authoritative. Link grants deliberately carry
    an empty token; only the public safe embed/source URL is sent to the player.
    """
    playback_mode = mode or asset.playback_mode
    if playback_mode == "hls" or playback_mode == "raw":
        play_url = master_url
    elif playback_mode == "embed":
        play_url = embed_url
    elif playback_mode == "external":
        play_url = source_url
    else:
        play_url = ""
    expiry = token_row.expires_at if token_row is not None else expires_at
    grant = compact(
        token="" if playback_mode in {"embed", "external"} else raw_token,
        assetId=asset.slug,
        masterUrl=master_url if playback_mode == "hls" else "",
        playUrl=play_url,
        mode=playback_mode,
        expiresAt=expiry.isoformat() if hasattr(expiry, "isoformat") else expiry,
        durationSeconds=asset.duration_seconds,
        protection=asset.protection,
        provider=asset.provider.code if asset.provider_id else None,
        embedUrl=embed_url if playback_mode == "embed" else None,
        sourceUrl=source_url if playback_mode == "external" else None,
        poster=asset.poster_url,
        captions=captions or None,
        resumeAt=resume_at,
        qualities=_qualities(asset) if playback_mode == "hls" else None,
    )
    if playback_mode in {"embed", "external"}:
        grant["token"] = ""
    return grant


def provider_payload(provider: Any) -> dict[str, Any]:
    from features.videohosting.providers import spec_for

    spec = spec_for(provider.code)
    return compact(
        code=provider.code,
        name=provider.name,
        enabled=provider.is_enabled,
        isDefault=provider.is_default,
        capabilities=provider.capabilities or {},
        kind=spec.kind if spec else "storage",
        needs=sorted(spec.needs) if spec else [],
        packagingPolicy=provider.packaging_policy,
    )
