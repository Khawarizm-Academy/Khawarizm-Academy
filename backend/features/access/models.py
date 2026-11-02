"""Database-backed access roles, assignments, and security audit events."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q

from features.access.registry import PERMISSION_COLORS, PERMISSIONS, validate_permission_keys
from features.common.choices import AuditAction
from features.common.models import TimeStampedModel, UUIDModel

ROLE_SLUG_VALIDATOR = RegexValidator(
    regex=r"^[a-z0-9][a-z0-9-]{1,38}$",
    message="Use 2–39 lowercase letters, digits, and hyphens; start with a letter or digit.",
)


class AccessRole(UUIDModel, TimeStampedModel):
    """A permission bundle with an immutable slug and hierarchy position."""

    slug = models.SlugField(max_length=40, unique=True, validators=[ROLE_SLUG_VALIDATOR])
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=240, blank=True)
    color = models.CharField(max_length=20, choices=[(color, color) for color in PERMISSION_COLORS])
    position = models.PositiveIntegerField(default=0)
    permissions = models.JSONField(default=list, blank=True)
    is_system = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    template_key = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["-position", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_default"],
                condition=Q(is_default=True),
                name="uniq_access_default_role",
            ),
            models.CheckConstraint(
                condition=(
                    Q(slug="student", is_system=True, is_default=True)
                    | Q(slug="admin", is_system=True, is_default=False)
                    | (~Q(slug__in=("student", "admin")) & Q(is_system=False, is_default=False))
                ),
                name="ck_access_role_system_state",
            ),
        ]
        indexes = [models.Index(fields=["position", "name"], name="idx_accessrole_position")]

    def clean(self) -> None:
        super().clean()
        if self.color not in PERMISSION_COLORS:
            raise ValidationError({"color": "Choose a color token from the supported palette."})
        try:
            keys = validate_permission_keys(self.permissions)
        except ValueError as exc:
            raise ValidationError({"permissions": str(exc)}) from exc
        if self.slug == "student" and (not self.is_system or not self.is_default):
            raise ValidationError("The student role must be the system's implicit default role.")
        if self.slug == "admin" and (not self.is_system or self.is_default):
            raise ValidationError("The admin role must be a non-default system role.")
        if self.slug not in {"student", "admin"} and (self.is_system or self.is_default):
            raise ValidationError("Only student and admin can be system roles.")
        if self.is_default and any(PERMISSIONS[key].elevated for key in keys):
            raise ValidationError({"permissions": "The implicit default role cannot contain elevated permissions."})
        if self.slug == "admin" and keys != ["administrator"]:
            raise ValidationError({"permissions": "The system administrator permissions are locked."})
        if self.slug == "admin" and self.pk and not self._state.adding:
            original = type(self).objects.filter(pk=self.pk).values("permissions", "slug").first()
            if original and original["slug"] == "admin" and original["permissions"] != keys:
                raise ValidationError({"permissions": "The system administrator permissions are locked."})
        if self.pk and not self._state.adding:
            original_slug = type(self).objects.filter(pk=self.pk).values_list("slug", flat=True).first()
            if original_slug and original_slug != self.slug:
                raise ValidationError({"slug": "A role slug cannot be changed after creation."})

    def save(self, *args, **kwargs):
        # Model writes (including non-API callers) must not persist unknown keys.
        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_system or self.is_default:
            raise ValidationError("System and default roles cannot be deleted.")
        return super().delete(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


class RoleAssignment(UUIDModel):
    """A user's explicit role; the default role remains implicit."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="role_assignments",
        on_delete=models.CASCADE,
    )
    role = models.ForeignKey(AccessRole, related_name="assignments", on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="role_assignments_given",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "role"], name="uniq_user_access_role"),
        ]
        indexes = [
            models.Index(fields=["user"], name="idx_roleassignment_user"),
            models.Index(fields=["role"], name="idx_roleassignment_role"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.role_id and self.role.is_default:
            raise ValidationError({"role": "The default role is implicit and cannot be assigned explicitly."})

    def save(self, *args, **kwargs):
        self.full_clean()
        result = super().save(*args, **kwargs)
        user = self._state.fields_cache.get("user")
        if user is not None:
            for cache_key in (
                "_access_control_snapshot",
                "_effective_permissions_cache",
                "_access_roles_cache",
                "_access_highest_position_cache",
            ):
                user.__dict__.pop(cache_key, None)
        return result

    def delete(self, *args, **kwargs):
        user = self._state.fields_cache.get("user")
        result = super().delete(*args, **kwargs)
        if user is not None:
            for cache_key in (
                "_access_control_snapshot",
                "_effective_permissions_cache",
                "_access_roles_cache",
                "_access_highest_position_cache",
            ):
                user.__dict__.pop(cache_key, None)
        return result

    def __str__(self) -> str:
        return f"{self.user_id} → {self.role.slug}"


class AuditEvent(UUIDModel):
    """Append-only audit record for access and future high-impact mutations."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="access_audit_events",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=40, choices=AuditAction.choices)
    target_type = models.CharField(max_length=40)
    target_id = models.CharField(max_length=64)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id", "-created_at"], name="idx_accessaudit_target"),
            models.Index(fields=["actor", "-created_at"], name="idx_accessaudit_actor"),
            models.Index(fields=["action", "created_at"], name="idx_accessaudit_action"),
        ]

    def __str__(self) -> str:
        return f"{self.action}:{self.target_type}:{self.target_id}"
