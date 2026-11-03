"""Repair server-derived course progress for every existing enrollment."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from features.courses import services
from features.dashboard.models import Enrollment


class Command(BaseCommand):
    help = "Recompute server-derived progress, resume lesson, and completion for every enrollment."

    def handle(self, *args, **options) -> None:
        processed = changed = 0
        rows = Enrollment.objects.select_related("user", "course").order_by("pk")
        for enrollment in rows.iterator(chunk_size=500):
            before = (enrollment.progress, enrollment.last_lesson, enrollment.is_completed)
            current = services.recompute_enrollment(enrollment.user, enrollment.course)
            if current is None:
                continue
            processed += 1
            changed += before != (current.progress, current.last_lesson, current.is_completed)
        self.stdout.write(f"processed: {processed}")
        self.stdout.write(f"changed: {changed}")
        self.stdout.write(self.style.SUCCESS("progress recompute done"))
