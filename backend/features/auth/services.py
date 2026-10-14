"""Resolves the current learner while authentication is stubbed."""

from __future__ import annotations

from django.db import DatabaseError, IntegrityError
from django.utils import timezone

from features.auth.models import Learner

DEMO_EMAIL = "ahmad.q@example.com"

DEMO_DEFAULTS = {
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
}


def get_demo_learner() -> Learner:
    """Return the demo learner, creating it once on first request.

    On read-only SQLite (Vercel without Postgres) the row cannot be written, so
    an unsaved in-memory learner is returned to keep reads working.
    """
    try:
        learner = Learner.objects.get(email=DEMO_EMAIL)
    except Learner.DoesNotExist:
        try:
            return Learner.objects.create(email=DEMO_EMAIL, last_seen_at=timezone.now(), **DEMO_DEFAULTS)
        except (DatabaseError, IntegrityError):
            return Learner(email=DEMO_EMAIL, **DEMO_DEFAULTS)
    except DatabaseError:
        return Learner(email=DEMO_EMAIL, **DEMO_DEFAULTS)

    # Refresh seen time best-effort; ignore failures on a read-only database.
    try:
        Learner.objects.filter(email=DEMO_EMAIL).update(last_seen_at=timezone.now())
    except DatabaseError:
        pass
    return learner
