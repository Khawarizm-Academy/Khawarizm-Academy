"""Send scheduled live-session reminders through the dashboard notification service."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from features.dashboard.notifications import send_live_session_reminders


class Command(BaseCommand):
    help = "Send preference-aware reminders for live sessions starting in 15–20 minutes."

    def handle(self, *args, **options) -> None:
        sent = send_live_session_reminders()
        self.stdout.write(self.style.SUCCESS(f"reminders sent: {sent}"))
