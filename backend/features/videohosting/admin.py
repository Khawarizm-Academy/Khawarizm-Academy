"""Django admin for video hosting — the catalog and the token ledger."""

from __future__ import annotations

from django.contrib import admin

from features.videohosting.models import StreamToken, VideoAsset, VideoRendition, VideoSegment


class VideoRenditionInline(admin.TabularInline):
    model = VideoRendition
    extra = 0
    show_change_link = True


class StreamTokenInline(admin.TabularInline):
    model = StreamToken
    extra = 0


@admin.register(VideoAsset)
class VideoAssetAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "status", "duration_seconds", "source_size_bytes")
    list_filter = ("status",)
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
    list_display = ("rendition", "index", "message_id", "size_bytes", "file_path")
    list_filter = ("rendition__quality",)
    search_fields = ("rendition__asset__slug",)


@admin.register(StreamToken)
class StreamTokenAdmin(admin.ModelAdmin):
    list_display = ("asset", "user", "ip_binding", "expires_at", "created_at")
    list_filter = ("expires_at",)
    search_fields = ("asset__slug",)
    readonly_fields = ("token_hash",)
