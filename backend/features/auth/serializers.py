"""Learner serializers — the shape every consumer reads as `UserProfileData`."""

from __future__ import annotations

from typing import Any

from features.auth.models import Learner


def user_profile(learner: Learner) -> dict[str, Any]:
    """Matches `UserProfileData` in features/profile/types.ts."""
    return {
        "fullName": learner.full_name,
        "email": learner.email,
        "phone": learner.phone,
        "membershipStatus": learner.membership_status,
        "avatarInitials": learner.avatar_initials,
        "avatarUrl": learner.avatar_url,
        "learningLevel": learner.learning_level,
        "interests": learner.interests,
        "notifications": learner.notifications_preferences,
        "language": learner.language,
        "timezone": learner.timezone,
    }
