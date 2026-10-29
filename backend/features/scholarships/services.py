"""Scholarship services: application and the saved-bookmark toggle."""

from __future__ import annotations

from features.scholarships.models import Scholarship, ScholarshipApplication


def apply(user, scholarship: Scholarship) -> None:
    """Submit one application; re-applying is a no-op."""
    ScholarshipApplication.objects.get_or_create(user=user, scholarship=scholarship)


def toggle_save(user, scholarship: Scholarship) -> bool:
    """Saved ↔ unsaved; `True` when the scholarship ends up saved."""
    # Imported here so the scholarships feature never depends on dashboard at module load.
    from features.dashboard.models import SavedScholarship

    saved = SavedScholarship.objects.filter(user=user, scholarship=scholarship).first()
    if saved is None:
        SavedScholarship.objects.create(user=user, scholarship=scholarship)
        return True
    saved.delete()
    return False
