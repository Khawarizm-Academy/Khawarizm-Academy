from django.contrib import admin

from .models import DiscussionPost, DiscussionThread


class DiscussionPostInline(admin.TabularInline):
    model = DiscussionPost
    extra = 0
    fields = ("author", "body", "is_instructor_answer", "created_at")
    readonly_fields = ("created_at",)


@admin.register(DiscussionThread)
class DiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "lesson", "author", "status", "pinned", "created_at")
    list_filter = ("status", "pinned")
    search_fields = ("title", "body", "course__title", "author__full_name", "author__email")
    autocomplete_fields = ("course", "lesson", "author", "accepted_post")
    readonly_fields = ("created_at", "updated_at")
    inlines = (DiscussionPostInline,)


@admin.register(DiscussionPost)
class DiscussionPostAdmin(admin.ModelAdmin):
    list_display = ("thread", "author", "is_instructor_answer", "created_at")
    list_filter = ("is_instructor_answer",)
    search_fields = ("body", "author__full_name", "author__email", "thread__title")
    autocomplete_fields = ("thread", "author")
    readonly_fields = ("created_at", "updated_at")
