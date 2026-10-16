"""Django admin — the data editor for accounts, sessions, and audit rows."""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from features.auth.models import AuthEvent, InstructorProfile, StudentProfile, User, UserSession
from features.common.choices import SessionRevokeReason


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "full_name", "role", "is_staff", "is_active", "date_joined"]
    list_filter = ["role", "is_staff", "is_active"]
    search_fields = ["email", "full_name", "firebase_uid"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identity", {"fields": ("firebase_uid", "role", "full_name", "phone", "avatar_url", "avatar_initials", "membership_status", "language", "timezone")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "last_seen_at", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role")}),)


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
