"""Django admin — account inspection, session controls, and audit rows."""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from features.access.models import RoleAssignment
from features.access.services import sync_primary_role
from features.auth.models import AuthEvent, InstructorProfile, StudentProfile, User, UserSession
from features.common.choices import SessionRevokeReason


class RoleAssignmentInline(admin.TabularInline):
    model = RoleAssignment
    fk_name = "user"
    extra = 0
    can_delete = False
    fields = ("role", "assigned_by", "created_at")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "full_name", "role", "is_staff", "is_active", "date_joined"]
    list_filter = ["role", "is_staff", "is_active"]
    search_fields = ["email", "full_name", "firebase_uid"]
    readonly_fields = ("role",)
    inlines = (RoleAssignmentInline,)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Account role",
            {
                "fields": ("role",),
                "description": "يُدار من مدير الأدوار",
            },
        ),
        (
            "Identity",
            {
                "fields": (
                    "firebase_uid",
                    "full_name",
                    "phone",
                    "avatar_url",
                    "avatar_initials",
                    "membership_status",
                    "language",
                    "timezone",
                )
            },
        ),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "last_seen_at", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        sync_primary_role(obj)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "learning_level"]
    search_fields = ["user__email"]


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "headline", "credential"]
    search_fields = ["user__email"]


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "device_label", "device_type", "ip_address", "is_active", "last_seen_at", "revoked_reason"]
    list_filter = ["is_active", "device_type", "os", "browser"]
    search_fields = ["user__email", "ip_address", "user_agent"]
    readonly_fields = ["refresh_token_hash"]
    actions = ["revoke_sessions"]

    @admin.action(description="Revoke selected sessions")
    def revoke_sessions(self, request, queryset):
        queryset.update(is_active=False, revoked_reason=SessionRevokeReason.REVOKED_BY_ADMIN)


@admin.register(AuthEvent)
class AuthEventAdmin(admin.ModelAdmin):
    list_display = ["kind", "email", "provider", "device_type", "ip_address", "created_at"]
    list_filter = ["kind", "provider", "device_type"]
    search_fields = ["email", "user__email", "ip_address"]
    readonly_fields = ["created_at"]
