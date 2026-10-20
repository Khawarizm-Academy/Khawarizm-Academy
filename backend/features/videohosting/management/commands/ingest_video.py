"""Ingest one video into Telegram + HLS — `python manage.py ingest_video <file> --slug <slug>`."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from features.videohosting.ingest import ingest_file


class Command(BaseCommand):
    help = "Upload a video to the Telegram channel, package encrypted HLS, and store its segments."

    def add_arguments(self, parser) -> None:
        parser.add_argument("file", help="Path to the source video file")
        parser.add_argument("--slug", required=True, help="Public asset id used in stream URLs")
        parser.add_argument("--title", default="", help="Human title shown in the player")
        parser.add_argument("--delete-source", action="store_true", help="Delete the local file once ingested")

    def handle(self, *args, **options) -> None:
        try:
            asset = ingest_file(
                options["file"],
                options["slug"],
                options["title"],
                remove_source=options["delete_source"],
            )
        except Exception as exc:  # a failed ingest must exit non-zero for the operator
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(f"{asset.slug} ready — {asset.duration_seconds}s, {asset.renditions.count()} renditions"))
