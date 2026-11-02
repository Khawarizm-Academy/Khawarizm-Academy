"""Ingest one video through the selected provider's resolved playback plan."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from features.common.choices import VideoStatus
from features.videohosting.ingest import PACKAGE_MODES, ingest_file


class Command(BaseCommand):
    help = (
        "Upload a video through the configured provider. Unsupported playback plans fail before provider upload "
        "instead of leaving an unplayable asset staged indefinitely."
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
            help=(
                "auto = follow provider policy and host capabilities, force = require HLS, "
                "never = use raw only when supported"
            ),
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
            self.stdout.write(
                self.style.WARNING(
                    f"{asset.slug} is a legacy staged asset ({megabytes}MB). "
                    "Use `manage.py package_pending` on a configured persistent FFmpeg host to recover it."
                )
            )
            return
        self.stdout.write(
            self.style.SUCCESS(f"{asset.slug} ready — {asset.duration_seconds}s, {asset.renditions.count()} renditions")
        )
