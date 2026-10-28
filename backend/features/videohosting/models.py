"""Video hosting models — provider-agnostic video catalog.

The split is deliberate: manifests, keys, and tokens live here (control plane);
video bytes live with the configured provider (data plane). Nothing here ever
exposes provider credentials or raw private URLs to the client.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.choices import VideoStatus
from features.common.models import TimeStampedModel, UUIDModel


class VideoProvider(UUIDModel, TimeStampedModel):
    """A configured video hosting provider (e.g. google_drive, telegram)."""

    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    is_enabled = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    capabilities = models.JSONField(default=dict, blank=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class VideoAsset(UUIDModel, TimeStampedModel):
    """One hosted lesson video: the business key plus its packaging state."""

    # Business key — equals the frontend id, e.g. "course-1--lesson-1".
    slug = models.CharField(max_length=120, unique=True, help_text="Public id used in stream URLs")

    # Summary — what the player and admin show.
    title = models.CharField(max_length=200, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=VideoStatus.choices, default=VideoStatus.UPLOADING)
    error_message = models.TextField(blank=True)

    # The watch ledger — one minted playback grant is one session start.
    view_count = models.PositiveBigIntegerField(default=0, help_text="How many playback grants were minted")
    last_viewed_at = models.DateTimeField(null=True, blank=True, help_text="When the platform last served a watch link")

    provider = models.ForeignKey(
        VideoProvider, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets"
    )

    # Admin tracker — what the upload progress bar reads while the worker runs.
    progress = models.PositiveSmallIntegerField(default=0, help_text="Ingest progress 0-100")
    stage = models.CharField(max_length=20, blank=True, help_text="uploading | packaging | publishing")

    # Source file — kept for re-packaging when applicable.
    source_message_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="Telegram message holding the original upload")
    source_file_id = models.CharField(max_length=128, blank=True, help_text="Provider file handle for non-message providers (Drive file id)")
    source_size_bytes = models.BigIntegerField(default=0)
    source_file_name = models.CharField(max_length=255, blank=True)

    # Generated master playlist — rewritten with per-user token URLs at serve time.
    master_playlist = models.TextField(blank=True, help_text="HLS master playlist with __TOKEN__ placeholders")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="hosted_videos"
    )

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.slug


class VideoRendition(UUIDModel):
    """One AES-128 encrypted quality variant of an asset (e.g. 480p)."""

    asset = models.ForeignKey(VideoAsset, related_name="renditions", on_delete=models.CASCADE)
    quality = models.CharField(max_length=12, help_text="Rendition label, e.g. 480p")

    # Encoding facts — what the playlist advertises and the player switches on.
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    bandwidth_bps = models.PositiveIntegerField(default=0)
    segment_seconds = models.PositiveIntegerField(default=6)

    # Media playlist — served after rewriting segment and key URIs with the token.
    playlist = models.TextField(blank=True, help_text="Media playlist with __TOKEN__ placeholders")

    # AES-128 key — server-side only; delivered exclusively through the gated key endpoint.
    aes_key_hex = models.CharField(max_length=32, help_text="16-byte HLS segment key, hex; never leaves the backend un-gated")
    segment_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["asset", "quality"]
        unique_together = ("asset", "quality")

    def __str__(self) -> str:
        return f"{self.asset.slug}:{self.quality}"


class VideoSegment(UUIDModel):
    """One encrypted `.ts` segment stored as a provider document/object."""

    rendition = models.ForeignKey(VideoRendition, related_name="segments", on_delete=models.CASCADE)
    index = models.PositiveIntegerField()

    # Provider addressing.
    message_id = models.PositiveBigIntegerField(null=True, blank=True)
    file_id = models.CharField(max_length=255, blank=True, help_text="Stable provider file handle used to resolve a fresh file path")
    file_path = models.CharField(max_length=512, blank=True, help_text="Resolved provider file path cached for the redirect")
    provider_asset_id = models.CharField(max_length=255, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ["rendition", "index"]
        unique_together = ("rendition", "index")
        indexes = [models.Index(fields=["rendition", "index"])]

    def __str__(self) -> str:
        return f"{self.rendition}#{self.index}"


class ProviderAsset(UUIDModel, TimeStampedModel):
    """Mapping between a VideoAsset and a provider-specific object."""

    asset = models.ForeignKey(VideoAsset, related_name="provider_assets", on_delete=models.CASCADE)
    provider = models.ForeignKey(VideoProvider, related_name="provider_assets", on_delete=models.CASCADE)
    external_id = models.CharField(max_length=255)
    external_path = models.CharField(max_length=512, blank=True)
    mime_type = models.CharField(max_length=128, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("provider", "external_id")
        indexes = [
            models.Index(fields=["asset", "provider"]),
            models.Index(fields=["external_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.asset.slug}:{self.provider.code}:{self.external_id}"


class UploadSession(UUIDModel, TimeStampedModel):
    """Resumable upload session state for a provider."""

    asset = models.ForeignKey(VideoAsset, related_name="upload_sessions", on_delete=models.CASCADE)
    provider = models.ForeignKey(VideoProvider, related_name="upload_sessions", on_delete=models.CASCADE)
    session_key = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=16, default="pending")
    upload_uri = models.TextField(blank=True)
    progress = models.PositiveIntegerField(default=0)
    bytes_uploaded = models.BigIntegerField(default=0)
    total_bytes = models.BigIntegerField(default=0)
    chunk_size = models.PositiveIntegerField(default=262144)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["asset", "provider"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.asset.slug}:{self.provider.code}:{self.session_key[:8]}"


class StreamToken(UUIDModel, TimeStampedModel):
    """A hashed, expiring playback grant for one asset; the raw value is shown once."""

    # Only the SHA-256 is stored, so a database dump yields no usable tokens.
    token_hash = models.CharField(max_length=64, unique=True)
    asset = models.ForeignKey(VideoAsset, related_name="stream_tokens", on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="stream_tokens"
    )

    # Binding — a shared link stops working off the minting network and after the TTL.
    ip_binding = models.GenericIPAddressField(null=True, blank=True, help_text="Requests from another address are refused")
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["token_hash", "expires_at"])]

    def __str__(self) -> str:
        return f"{self.asset.slug}@{self.expires_at:%Y-%m-%d %H:%M}"


class DriveGrant(UUIDModel, TimeStampedModel):
    """The backend's persisted Google OAuth grant for the upload account.

    The refresh token is a live credential the backend must keep to mint
    access tokens, so it is stored here — server side only. Nothing from
    this row ever reaches the frontend: the admin sees the account email
    and the status, the tokens never leave the Django process.
    """

    class Status(models.TextChoices):
        ACTIVE = "active"
        REVOKED = "revoked"

    account_email = models.CharField(max_length=200, help_text="The Google account that granted consent")
    refresh_token = models.TextField(help_text="Google's offline-access refresh token")
    scope = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    error_message = models.TextField(blank=True)

    # The cached access token makes one grant worth one mint per hour, not per request.
    access_token = models.TextField(blank=True)
    access_token_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"تخويل Drive — {self.account_email} ({self.status})"


class DriveAuthState(UUIDModel, TimeStampedModel):
    """One single-use OAuth CSRF state — only its hash is stored, like StreamToken."""

    state_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Drive state@{self.expires_at:%Y-%m-%d %H:%M}"


# --------------------------------------------------------------------- config
class VideoSystemConfig(UUIDModel, TimeStampedModel):
    """Admin-controlled toggles that affect every video in the platform.

    This singleton lives here (not in Django settings) so an admin can change
    behaviour at runtime without restarting the server — e.g. disable FFmpeg
    HLS packaging when no packaging host is available and fall back to raw
    uploads served directly from Google Drive.
    """

    use_ffmpeg = models.BooleanField(default=True, help_text="Wrap uploads with HLS via FFmpeg")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        status = "FFmpeg مُفعّل" if self.use_ffmpeg else "بدون تغليف — رفع مباشر"
        return f"إعدادات الفيديو — {status}"

    @classmethod
    def get_instance(cls):
        """Return the singleton, creating it from the env default if absent."""
        row = cls.objects.first()
        if row is None:
            row = cls.objects.create(use_ffmpeg=settings.VIDEO_HOSTING_USE_FFMPEG)
        return row
