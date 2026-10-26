"""Mint a fresh GOOGLE_DRIVE_REFRESH_TOKEN — `python manage.py drive_auth`.

Service accounts carry no storage quota (uploads bill to the uploader), so
Google Drive uploads must ride the human OAuth grant: run the command bare
to print the consent URL, approve it in the browser, then rerun with the
redirect code to land the refresh token in the environment file.
"""

from __future__ import annotations

import urllib.parse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from features.videohosting.providers.google_drive import DRIVE_SCOPE, exchange_authorization_code

# Google's playground both displays the redirect and echoes the ?code= —
# it must be a registered redirect URI on the OAuth client; override it
# with --redirect-uri when the client lists a different one.
DEFAULT_REDIRECT_URI = "https://developers.google.com/oauthplayground"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


class Command(BaseCommand):
    help = (
        "Step 1 (bare): print the Google consent URL for a new refresh token. "
        "Step 2 (--code=...): exchange the redirected code and print the "
        "GOOGLE_DRIVE_REFRESH_TOKEN line to paste into the environment file."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument("--code", default="", help="The ?code= the consent page redirected with")
        parser.add_argument(
            "--redirect-uri", default=DEFAULT_REDIRECT_URI,
            help="The redirect URI registered on the OAuth client (default: the OAuth Playground)",
        )

    def handle(self, *args, **options) -> None:
        client_id = (settings.GOOGLE_DRIVE_CLIENT_ID or "").strip()
        client_secret = (settings.GOOGLE_DRIVE_CLIENT_SECRET or "").strip()
        if not client_id or not client_secret:
            raise CommandError("Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in the environment first.")
        redirect_uri = options["redirect_uri"]
        if not options["code"]:
            self._print_consent_url(client_id, redirect_uri)
            return
        okay, refresh, detail = exchange_authorization_code(options["code"], redirect_uri)
        if not okay:
            raise CommandError(f"Token exchange failed: {detail}")
        self.stdout.write(self.style.SUCCESS(detail))
        self.stdout.write("Paste this into your environment file (.env.development / host env) and restart the server:")
        self.stdout.write(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh}")
        self.stdout.write(
            "\nKeep the OAuth consent screen published as «In production» — a Testing app "
            "expires its refresh tokens after 7 days, which is how the previous one died."
        )

    def _print_consent_url(self, client_id: str, redirect_uri: str) -> None:
        consent_url = f"{AUTH_URL}?" + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": DRIVE_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        })
        self.stdout.write("1. Add this exact redirect URI to the OAuth client (Google Cloud Console):")
        self.stdout.write(self.style.HTTP_REDIRECT(redirect_uri))
        self.stdout.write("2. Open the consent URL and approve the Drive scope:")
        self.stdout.write(consent_url)
        self.stdout.write("3. Copy the ?code= you land on, then run:")
        self.stdout.write(self.style.WARNING("python manage.py drive_auth --code=<copied-code>"))
