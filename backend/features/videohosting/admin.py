"""Django admin for video hosting — the catalog and the token ledger."""

from __future__ import annotations

from django.contrib import admin

from features.videohosting.models import (
    ProviderAsset,
    StreamToken,
    UploadSession,
    VideoAsset,
    VideoProvider,
    VideoRendition,
    VideoSegment,
)


class VideoRenditionInline(admin.TabularInline):
    model = VideoRendition
    extra = 0
    show_change_link = True


class StreamTokenInline(admin.TabularInline):
    model = StreamToken
    extra = 0


@admin.register(VideoProvider)
class VideoProviderAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_enabled", "is_default")
    list_filter = ("is_enabled", "is_default")
    search_fields = ("code", "name")


@admin.register(VideoAsset)
class VideoAssetAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "status", "provider", "duration_seconds", "source_size_bytes")
    list_filter = ("status", "provider")
    search_fields = ("slug", "title")
    readonly_fields = ("master_playlist",)
    inlines = [VideoRenditionInline, StreamTokenInline]


class VideoSegmentInline(admin.TabularInline):
    model = VideoSegment
    extra = 0


@admin.register(VideoRendition)
class VideoRenditionAdmin(admin.ModelAdmin):
    list_display = ("asset", "quality", "width", "height", "bandwidth_bps", "segment_count")
    list_filter = ("quality",)
    search_fields = ("asset__slug",)
    readonly_fields = ("playlist", "aes_key_hex")
    inlines = [VideoSegmentInline]


@admin.register(VideoSegment)
class VideoSegmentAdmin(admin.ModelAdmin):
    list_display = ("rendition", "index", "message_id", "provider_asset_id", "file_id", "size_bytes", "file_path")
    list_filter = ("rendition__quality",)
    search_fields = ("rendition__asset__slug", "file_id", "provider_asset_id")


@admin.register(ProviderAsset)
class ProviderAssetAdmin(admin.ModelAdmin):
    list_display = ("asset", "provider", "external_id", "mime_type", "created_at")
    list_filter = ("provider",)
    search_fields = ("asset__slug", "external_id")


@admin.register(UploadSession)
class UploadSessionAdmin(admin.ModelAdmin):
    list_display = ("asset", "provider", "status", "progress", "bytes_uploaded", "total_bytes", "created_at")
    list_filter = ("provider", "status")
    search_fields = ("asset__slug", "session_key")


@admin.register(StreamToken)
class StreamTokenAdmin(admin.ModelAdmin):
    list_display = ("asset", "user", "ip_binding", "expires_at", "created_at")
    list_filter = ("expires_at",)
    search_fields = ("asset__slug",)
    readonly_fields = ("token_hash",)
