"""Ingest one video into Telegram + HLS — `python manage.py ingest_video <file> --slug <slug>`."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from features.common.choices import VideoStatus
from features.videohosting.ingest import PACKAGE_MODES, ingest_file


class Command(BaseCommand):
    help = (
        "Upload a video to the Telegram channel and (when the host can) package "
        "encrypted HLS. --package never stages the source when FFmpeg is missing."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument("file", help="Path to the source video file")
        parser.add_argument("--slug", required=True, help="Public asset id used in stream URLs")
        parser.add_argument("--title", default="", help="Human title shown in the player")
        parser.add_argument("--delete-source", action="store_true", help="Delete the local file once ingested")
        parser.add_argument(
            "--package",
            default="auto",
            choices=PACKAGE_MODES,
            help="auto = package when FFmpeg exists, force = require it, never = stage the source only",
        )

    def handle(self, *args, **options) -> None:
        try:
            asset = ingest_file(
                options["file"],
                options["slug"],
                options["title"],
                remove_source=options["delete_source"],
                package=options["package"],
            )
        except Exception as exc:  # a failed ingest must exit non-zero for the operator
            raise CommandError(str(exc)) from exc
        if asset.status == VideoStatus.STAGED:
            megabytes = asset.source_size_bytes // (1024 * 1024)
            self.stdout.write(self.style.WARNING(
                f"{asset.slug} staged — source stored ({megabytes}MB). "
                "Run again with --package force on a host that has FFmpeg to build the HLS ladder."
            ))
            return
        self.stdout.write(self.style.SUCCESS(
            f"{asset.slug} ready — {asset.duration_seconds}s, {asset.renditions.count()} renditions"
        ))
