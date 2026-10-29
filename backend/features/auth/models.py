"""Accounts — one User with a role, role profiles, and device sessions.

`User` is the single identity table (Django's admin works on it directly).
`StudentProfile` / `InstructorProfile` hang off it with a one-to-one link, and
`admin` accounts use Django's own `is_staff` / `is_superuser` flags.
"""

from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

from features.common.choices import AuthEventKind, AuthProvider, DeviceType, Role, SessionRevokeReason
from features.common.models import UUIDModel

# Internal learning keys stay English; Arabic only appears at render time.
LEARNING_LEVELS = [("beginner", "beginner"), ("intermediate", "intermediate"), ("advanced", "advanced")]


class UserManager(BaseUserManager):
    """Email-first user manager — there is no username column."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("role", Role.STUDENT)
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("role", Role.ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    """The account every request belongs to; `role` picks the profile."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Firebase identity — the link between the auth provider and this row.
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)

    # Display fields shared by every role.
    full_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    membership_status = models.CharField(
        max_length=140, blank=True, help_text="Display line, e.g. 'متعلّم منذ مارس 2024'"
    )
    avatar_initials = models.CharField(max_length=10, blank=True)
    avatar_url = models.URLField(max_length=400, blank=True)
    language = models.CharField(max_length=10, default="ar")
    timezone = models.CharField(max_length=60, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.full_name or self.email

    @property
    def is_admin(self) -> bool:
        """The admin role or Django staff — both reach the console."""
        return self.role == Role.ADMIN or self.is_staff


class StudentProfile(UUIDModel):
    """Learner-specific preferences; created on first student login."""

    user = models.OneToOneField(User, related_name="student_profile", on_delete=models.CASCADE)
    learning_level = models.CharField(max_length=20, choices=LEARNING_LEVELS, default="intermediate")
    interests = models.JSONField(default=list, blank=True, help_text="List of interest labels")
    notifications = models.JSONField(
        default=dict, blank=True, help_text="liveSessionReminders / weeklyProgressSummary / recommendedOpportunities"
    )

    class Meta:
        verbose_name = "Student profile"

    def __str__(self) -> str:
        return f"student:{self.user.email}"


class InstructorProfile(UUIDModel):
    """Instructor-specific fields; created on first instructor login."""

    user = models.OneToOneField(User, related_name="instructor_profile", on_delete=models.CASCADE)
    headline = models.CharField(max_length=160, blank=True)
    bio = models.TextField(blank=True)
    credential = models.CharField(max_length=200, blank=True)
    expertise = models.JSONField(default=list, blank=True, help_text="List of expertise labels")

    class Meta:
        verbose_name = "Instructor profile"

    def __str__(self) -> str:
        return f"instructor:{self.user.email}"


class UserSession(UUIDModel):
    """One signed-in device. Only one stays active per user at a time."""

    user = models.ForeignKey(User, related_name="sessions", on_delete=models.CASCADE)

    # The refresh token is stored hashed; the raw value only ever lives client-side.
    refresh_token_hash = models.CharField(max_length=128, db_index=True)
    access_jti = models.CharField(max_length=64, blank=True)

    # Device footprint — parsed from the User-Agent so a user can spot a stranger.
    os = models.CharField(max_length=60, blank=True)
    browser = models.CharField(max_length=80, blank=True)
    device_type = models.CharField(max_length=20, choices=DeviceType.choices, default=DeviceType.UNKNOWN)
    device_label = models.CharField(max_length=160, blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=120, blank=True)

    is_active = models.BooleanField(default=True)
    revoked_reason = models.CharField(max_length=40, choices=SessionRevokeReason.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Session"
        ordering = ["-last_seen_at"]
        # Per-user active-session counts (admin users list annotation) and the
        # "which of my devices are live" trail.
        indexes = [models.Index(fields=["user", "is_active"], name="idx_usersession_user_active")]

    def __str__(self) -> str:
        return f"{self.user.email} · {self.device_label or self.device_type}"

    def revoke(self, reason: str) -> None:
        """Mark the session dead and remember why."""
        self.is_active = False
        self.revoked_reason = reason
        self.save(update_fields=["is_active", "revoked_reason"])

    def touch(self) -> None:
        """Record activity without a full save."""
        UserSession.objects.filter(pk=self.pk).update(last_seen_at=timezone.now())


class AuthEvent(UUIDModel):
    """An append-only audit trail powering the admin session analytics."""

    user = models.ForeignKey(User, related_name="auth_events", on_delete=models.SET_NULL, null=True, blank=True)
    session = models.ForeignKey(UserSession, related_name="events", on_delete=models.SET_NULL, null=True, blank=True)
    kind = models.CharField(max_length=20, choices=AuthEventKind.choices)
    provider = models.CharField(max_length=20, choices=AuthProvider.choices, blank=True)
    email = models.EmailField(blank=True)
    os = models.CharField(max_length=60, blank=True)
    browser = models.CharField(max_length=80, blank=True)
    device_type = models.CharField(max_length=20, choices=DeviceType.choices, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    detail = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Auth event"
        ordering = ["-created_at"]
        # Admin analytics ranges (kind x window) and the per-user trail. The
        # user FK index is automatic; this one matches its sort direction.
        indexes = [
            models.Index(fields=["kind", "created_at"], name="idx_authevent_kind_created"),
            models.Index(fields=["user", "-created_at"], name="idx_authevent_user_created"),
        ]

    def __str__(self) -> str:
        return f"{self.kind}:{self.email or self.user_id}"
