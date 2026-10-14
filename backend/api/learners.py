"""Helper for the current (unauthenticated) demo learner."""

from __future__ import annotations

from django.db import DatabaseError, IntegrityError
from django.utils import timezone

from academy.models import Learner


def get_demo_learner() -> Learner:
    """Return the single demo learner for this build (no auth).

    On read-only SQLite (e.g. Vercel without Postgres), we may not be able to
    create the row. If it cannot be read/created, return an unsaved in-memory
    Learner so the API can return sensible read-only responses.
    """
    email = "ahmad.q@example.com"
    defaults = {
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
    }

    try:
        learner = Learner.objects.get(email=email)
        return learner
    except Learner.DoesNotExist:
        try:
            learner = Learner.objects.create(email=email, **defaults)
            return learner
        except (DatabaseError, IntegrityError):
            # Read-only DB or race: return an ephemeral learner for read-only ops.
            learner = Learner(email=email, **defaults)
            return learner
    except DatabaseError:
        # Cannot read the table; return an ephemeral learner for read-only ops.
        learner = Learner(email=email, **defaults)
        return learner
