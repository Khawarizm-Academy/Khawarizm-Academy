# Stream token control plane <- Mint & serving views
# Only a SHA-256 of each grant is stored, and every grant is bound to the
# minting client IP with a TTL, so a leaked manifest/key/segment URL stops
# working as soon as it leaves that network or the window closes.
import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from features.videohosting.models import StreamToken, VideoAsset


def mint(asset: VideoAsset, user, ip: str | None) -> tuple[str, StreamToken]:
    """Create a grant and hand back the raw token — shown to the client once."""
    raw = secrets.token_urlsafe(28)
    row = StreamToken.objects.create(
        asset=asset,
        user=user,
        ip_binding=ip,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(hours=settings.STREAM_TOKEN_TTL_HOURS),
    )
    return raw, row


def resolve(raw: str, ip: str | None) -> StreamToken | None:
    """The live grant for a raw token, or None when it is unknown, stale, or off-IP."""
    if not raw:
        return None
    row = (
        StreamToken.objects.select_related("asset")
        .filter(token_hash=hashlib.sha256(raw.encode()).hexdigest())
        .first()
    )
    if row is None:
        return None
    if row.expires_at <= timezone.now():
        row.delete()  # expired grants are dead weight — drop on first miss
        return None
    if row.ip_binding and row.ip_binding != ip:
        return None
    return row
