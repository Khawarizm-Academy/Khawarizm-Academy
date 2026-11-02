"""Best-effort provider cleanup after a video asset row is deleted."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from features.access.services import record_audit
from features.common.choices import AuditAction
from features.videohosting.providers import spec_for

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RemoteDeleteSnapshot:
    """Provider references captured before the asset cascade removes their rows."""

    asset_id: str
    provider_code: str
    source_file_id: str = ""
    source_message_id: int | None = None
    segment_message_ids: tuple[int, ...] = ()

    @property
    def telegram_message_ids(self) -> tuple[int, ...]:
        """Return the source and every packaged segment message in delete order."""
        source = (self.source_message_id,) if self.source_message_id is not None else ()
        return source + self.segment_message_ids

    @property
    def reference_count(self) -> int:
        """Return the number of provider objects represented by this snapshot."""
        return bool(self.source_file_id) + len(self.telegram_message_ids)


def _provider_code(asset: Any) -> str:
    """Read the provider code without relying on rows that the caller may later delete."""
    if not getattr(asset, "provider_id", None):
        return ""
    try:
        provider = asset.provider
    except ObjectDoesNotExist:
        return ""
    return str(getattr(provider, "code", "") or "")


def _segment_message_ids(asset: Any) -> tuple[int, ...]:
    """Collect all Telegram segment messages in the stable rendition/index order."""
    message_ids: list[int] = []
    for rendition in asset.renditions.all():
        message_ids.extend(
            int(message_id)
            for message_id in rendition.segments.values_list("message_id", flat=True)
            if message_id is not None
        )
    return tuple(message_ids)


def snapshot_remote_references(asset: Any) -> RemoteDeleteSnapshot:
    """Capture every remote reference needed after the asset cascade."""
    provider_code = _provider_code(asset)
    return RemoteDeleteSnapshot(
        asset_id=str(asset.pk),
        provider_code=provider_code,
        source_file_id=str(getattr(asset, "source_file_id", "") or "") if provider_code == "google_drive" else "",
        source_message_id=(
            int(asset.source_message_id)
            if provider_code == "telegram" and asset.source_message_id is not None
            else None
        ),
        segment_message_ids=_segment_message_ids(asset) if provider_code == "telegram" else (),
    )


def _record_remote_orphan(snapshot: RemoteDeleteSnapshot, actor: Any, request: Any, error: Exception) -> None:
    """Write only stable, non-secret failure metadata to the audit stream."""
    detail = {
        "provider": snapshot.provider_code,
        "referenceCount": snapshot.reference_count,
        "errorType": type(error).__name__,
    }
    try:
        record_audit(
            AuditAction.REMOTE_ORPHAN,
            actor=actor,
            request=request,
            target_type="video_asset",
            target_id=snapshot.asset_id,
            detail=detail,
        )
    except Exception as audit_error:  # pragma: no cover - database failure is defensive only
        logger.warning(
            "Remote-orphan audit write failed provider=%s asset=%s error=%s",
            snapshot.provider_code,
            snapshot.asset_id,
            type(audit_error).__name__,
        )


def schedule_remote_delete(asset: Any, actor: Any = None, request: Any = None) -> RemoteDeleteSnapshot:
    """Capture remote references and delete them only after the surrounding transaction commits."""
    snapshot = snapshot_remote_references(asset)
    spec = spec_for(snapshot.provider_code)
    delete_remote = spec.delete_remote if spec is not None else None
    if delete_remote is None or snapshot.reference_count == 0:
        return snapshot

    def cleanup() -> None:
        try:
            delete_remote(snapshot)
        except Exception as error:  # best effort: a deleted row must never make the caller fail
            logger.warning(
                "Remote video cleanup failed provider=%s asset=%s references=%d error=%s",
                snapshot.provider_code,
                snapshot.asset_id,
                snapshot.reference_count,
                type(error).__name__,
            )
            _record_remote_orphan(snapshot, actor, request, error)

    transaction.on_commit(cleanup)
    return snapshot
