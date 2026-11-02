"""Read-only Django-admin visibility for access data; mutations use services."""

from django.contrib import admin

from features.access.models import AccessRole, AuditEvent, RoleAssignment


@admin.register(AccessRole)
class AccessRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "position", "is_system", "is_default", "updated_at")
    list_filter = ("is_system", "is_default", "color")
    search_fields = ("slug", "name")
    readonly_fields = tuple(field.name for field in AccessRole._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RoleAssignment)
class RoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "assigned_by", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "role__slug")
    readonly_fields = tuple(field.name for field in RoleAssignment._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("action", "target_type", "target_id", "actor", "created_at")
    list_filter = ("action", "target_type")
    search_fields = ("target_id", "actor__email")
    readonly_fields = tuple(field.name for field in AuditEvent._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
