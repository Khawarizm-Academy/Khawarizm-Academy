"""Video hosting models — the Telegram-backed HLS catalog.

The split is deliberate: manifests, AES keys, and segment indexes live here
(control plane, tiny and fast); the encrypted `.ts` bytes live in a Telegram
channel (data plane, unlimited storage, zero backend bandwidth in redirect
mode). Nothing here ever exposes a key or a raw Telegram file to the client.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from features.common.choices import VideoStatus
from features.common.models import TimeStampedModel, UUIDModel


class VideoAsset(UUIDModel, TimeStampedModel):
    """One hosted lesson video: the business key plus its packaging state."""

    # Business key — equals the frontend id, e.g. "course-1--lesson-1".
    slug = models.CharField(max_length=120, unique=True, help_text="Public id used in stream URLs")

    # Summary — what the player and admin show.
    title = models.CharField(max_length=200, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=VideoStatus.choices, default=VideoStatus.UPLOADING)
    error_message = models.TextField(blank=True)

    # Derived — the player polls readiness without loading the rendition tables.
    @property
    def is_ready(self) -> bool:
        return self.status == VideoStatus.READY

    # Source file — the original upload kept in Telegram for re-packaging.
    source_message_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="Telegram message holding the original upload")
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
    """One encrypted `.ts` segment stored as a Telegram document message."""

    rendition = models.ForeignKey(VideoRendition, related_name="segments", on_delete=models.CASCADE)
    index = models.PositiveIntegerField()

    # Telegram addressing — file_id is the durable handle, file_path is resolved lazily and cached.
    message_id = models.PositiveBigIntegerField()
    file_id = models.CharField(max_length=64, blank=True, help_text="Stable Telegram file handle used to resolve a fresh file_path")
    file_path = models.CharField(max_length=255, blank=True, help_text="Resolved Bot API file path cached for the redirect")
    size_bytes = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ["rendition", "index"]
        unique_together = ("rendition", "index")

    def __str__(self) -> str:
        return f"{self.rendition}#{self.index}"


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
