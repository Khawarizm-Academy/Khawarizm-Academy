from django.contrib import admin

from .models import CourseReview


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ("course", "user", "rating", "is_hidden", "created_at", "reply_created_at")
    list_filter = ("is_hidden", "rating", "created_at")
    search_fields = ("course__slug", "course__title", "user__email", "title", "body", "hidden_reason")
    autocomplete_fields = ("course", "user", "reply_author")
    readonly_fields = ("created_at", "updated_at", "reply_created_at")
