"""Helper for the current (unauthenticated) demo learner."""

from __future__ import annotations

from django.utils import timezone

from academy.models import Learner


def get_demo_learner() -> Learner:
    """Return the single seeded demo learner for this demo build (no auth)."""
    learner, _ = Learner.objects.get_or_create(
        email="ahmad.q@example.com",
        defaults={
            "full_name": "أحمد محمد القحطاني",
            "phone": "+966 55 820 1437",
            "membership_status": "متعلّم منذ مارس 2024 · المستوى المتوسط",
            "avatar_initials": "أق",
            "learning_level": "intermediate",
            "interests": ["الذكاء الاصطناعي", "تحليل البيانات", "البرمجة والتطوير"],
            "notifications_preferences": {
                "liveSessionReminders": True,
                "weeklyProgressSummary": True,
                "recommendedOpportunities": False,
            },
            "language": "ar",
            "timezone": "الرياض (GMT+3)",
            "last_seen_at": timezone.now(),
        },
    )
    return learner
