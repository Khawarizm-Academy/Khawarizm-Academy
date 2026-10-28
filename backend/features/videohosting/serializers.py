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
    )


def minted_token(asset: Any, raw_token: str, token_row: Any, master_url: str) -> dict[str, Any]:
    """The playback grant — the raw token appears here and nowhere else.

    An un-packaged (raw) asset swaps the HLS master for a platform-run
    direct watch URL; the player branches on `mode`.
    """
    is_raw = not (asset.master_playlist or "").strip()
    grant = compact(
        token=raw_token,
        assetId=asset.slug,
        masterUrl="" if is_raw else master_url,
        playUrl=master_url,
        mode="raw" if is_raw else "hls",
        expiresAt=token_row.expires_at.isoformat(),
        durationSeconds=asset.duration_seconds,
    )
    return grant


def provider_payload(provider: Any) -> dict[str, Any]:
    return compact(
        code=provider.code,
        name=provider.name,
        enabled=provider.is_enabled,
        isDefault=provider.is_default,
        capabilities=provider.capabilities or {},
    )
