"""Model → cache-namespace invalidation wiring.

The registry is the invalidation contract: when any of these models is
written (through the admin console, seed, or a command), the affected cache
families get their version bumped after the commit — a reader that raced the
write cannot repopulate stale data. `features.common.apps.CommonConfig.ready`
connects the receivers at boot.
"""

from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save

from features.common.cache import bump_version

# Which cache families each watched model can change. Home rails embed
# competition/event/course/scholarship payloads, so those models touch
# "home" as well as their own family.
MODEL_NAMESPACES: dict[str, tuple[str, ...]] = {
    "courses.Course": ("catalog", "home"),
    "scholarships.Scholarship": ("catalog", "home"),
    "events.EventItem": ("events", "home"),
    "competitions.Competition": ("competitions", "home"),
    "home.HomeFeaturedCourse": ("home",),
    "home.HomeFeaturedScholarship": ("home",),
    "home.HomeCompetitionSpot": ("home",),
    "home.HomeEventSpot": ("home",),
    "home.HomeQuickLink": ("home",),
    "catalog.FilterGroup": ("catalog",),
    "catalog.FilterOption": ("catalog",),
}


def _bump_on_commit(namespaces: tuple[str, ...]):
    def receiver(sender, **kwargs) -> None:
        for namespace in namespaces:
            transaction.on_commit(lambda ns=namespace: bump_version(ns))

    return receiver


def connect() -> None:
    """Attach save/delete receivers for every registered model."""
    from django.apps import apps

    for label, namespaces in MODEL_NAMESPACES.items():
        app_label, model_name = label.split(".")
        model = apps.get_model(app_label, model_name)
        receiver = _bump_on_commit(namespaces)
        post_save.connect(receiver, sender=model, dispatch_uid=f"cache-bump-save-{label}", weak=False)
        post_delete.connect(receiver, sender=model, dispatch_uid=f"cache-bump-delete-{label}", weak=False)
