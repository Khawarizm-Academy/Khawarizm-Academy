"""Camel-case payloads for the auth endpoints."""

from __future__ import annotations

from features.auth.models import User, UserSession


def user_profile(user: User) -> dict:
    """The account payload every client stores after login."""
    profile = getattr(user, "student_profile", None)
    instructor = getattr(user, "instructor_profile", None)
    return {
        "id": str(user.id),
        "email": user.email,
        "fullName": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "isAdmin": user.is_admin,
        "isActive": user.is_active,
        "membershipStatus": user.membership_status,
        "avatarInitials": user.avatar_initials,
        "avatarUrl": user.avatar_url,
        "language": user.language,
        "timezone": user.timezone,
        "learningLevel": getattr(profile, "learning_level", "intermediate"),
        "interests": getattr(profile, "interests", []),
        "notifications": getattr(profile, "notifications", {}),
        "headline": getattr(instructor, "headline", ""),
        "credential": getattr(instructor, "credential", ""),
        "createdAt": user.date_joined.isoformat(),
        "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }


def session_payload(session: UserSession, current_id=None) -> dict:
    """One device row for the sessions list / admin console."""
    return {
        "id": str(session.id),
        "os": session.os,
        "browser": session.browser,
        "deviceType": session.device_type,
        "deviceLabel": session.device_label,
        "ipAddress": session.ip_address or "",
        "isActive": session.is_active,
        "isCurrent": str(session.id) == str(current_id),
        "revokedReason": session.revoked_reason,
        "createdAt": session.created_at.isoformat(),
        "lastSeenAt": session.last_seen_at.isoformat(),
    }


def session_with_user(session: UserSession, current_id=None) -> dict:
    """A session row enriched with its owner, for the admin console."""
    payload = session_payload(session, current_id)
    payload["user"] = {
        "id": str(session.user_id),
        "email": session.user.email,
        "fullName": session.user.full_name,
        "avatarUrl": session.user.avatar_url,
        "role": session.user.role,
    }
    return payload
