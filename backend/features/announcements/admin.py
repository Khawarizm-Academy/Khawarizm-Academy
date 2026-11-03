from django.contrib import admin

from .models import CourseAnnouncement, CourseAnnouncementDailyQuota


@admin.register(CourseAnnouncement)
class CourseAnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "author", "pinned", "created_at", "updated_at")
    list_filter = ("pinned", "course")
    search_fields = ("title", "body", "course__title", "author__full_name")
    readonly_fields = ("id", "course", "author", "title", "body", "pinned", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False


@admin.register(CourseAnnouncementDailyQuota)
class CourseAnnouncementDailyQuotaAdmin(admin.ModelAdmin):
    list_display = ("course", "local_date", "post_count")
    list_filter = ("local_date",)
    readonly_fields = ("id", "course", "local_date", "post_count")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
