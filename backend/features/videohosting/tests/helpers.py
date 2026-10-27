"""Shared videohosting test fixtures — build asset rows, grants, and fake HTTP."""

from __future__ import annotations

import base64
import io
import json
import urllib.error
import urllib.parse
from datetime import timedelta
from pathlib import Path

from django.utils import timezone

from features.common.choices import VideoStatus
from features.videohosting.models import DriveGrant, VideoAsset, VideoRendition, VideoSegment

MASTER = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n/api/stream/__TOKEN__/360p/index.m3u8\n"
MEDIA = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"/api/stream/__TOKEN__/key/360p\"\nseg_00000.ts\n"
KEY_HEX = "00112233445566778899aabbccddeeff"


def make_asset(**overrides) -> VideoAsset:
    """A ready asset with one packaged rendition and one cached segment."""
    fields = {
        "slug": "course-1--lesson-1",
        "title": "Lesson 1",
        "status": VideoStatus.READY,
        "duration_seconds": 120,
        "master_playlist": MASTER,
    }
    fields.update(overrides)
    asset = VideoAsset.objects.create(**fields)
    rendition = VideoRendition.objects.create(
        asset=asset,
        quality="360p",
        width=640,
        height=360,
        bandwidth_bps=800_000,
        playlist=MEDIA,
        aes_key_hex=KEY_HEX,
        segment_count=1,
    )
    VideoSegment.objects.create(
        rendition=rendition, index=0, message_id=11, file_id="FILEID", file_path="documents/file_1.ts", size_bytes=1024
    )
    return asset


def drive_grant(bearer: str = "BEAR") -> DriveGrant:
    """One stored Google grant with a fresh cached access token — no network.

    The upload grants need `refresh_token`, so the row mirrors what Google's
    consent callback writes; tests stop at the Drive-call script.
    """
    return DriveGrant.objects.create(
        account_email="owner@example.com",
        refresh_token="rt-fixed",
        access_token=bearer,
        access_token_expires_at=timezone.now() + timedelta(hours=1),
    )


def google_id_token(email: str) -> str:
    """A three-part id_token whose middle section carries the email claim."""
    payload = base64.urlsafe_b64encode(json.dumps({"email": email}).encode("utf-8")).rstrip(b"=").decode("ascii")
    return f"header.{payload}.signature"


def banked_state() -> str:
    """Run consent_url() and hand back the raw CSRF state it banked."""
    from features.videohosting import oauthdrive

    url = oauthdrive.consent_url()
    return urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["state"][0]


class FakeDriveResponse:
    """The slice of urllib's response the uploader touches."""

    def __init__(self, status, headers=None, body=b""):
        self.status = status
        self.headers = headers or {}
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class ScriptedDriveHTTP:
    """A urlopen stand-in answering from a script: (status, headers, body)."""

    def __init__(self, steps):
        self.steps = list(steps)
        self.calls = []

    def __call__(self, request, timeout=0):
        self.calls.append(request)
        status, headers, payload = self.steps.pop(0)
        if status == 308:
            # urllib's default opener has no 308 handler, so a live resume
            # tick arrives as an HTTPError — the stand-in mirrors that.
            raise urllib.error.HTTPError(request.full_url, 308, "Resume Incomplete", headers, None)
        if status >= 400:
            # Errors never flow through either: they raise with a readable body.
            raise urllib.error.HTTPError(request.full_url, status, "http impl error", headers, io.BytesIO(payload))
        return FakeDriveResponse(status, headers, payload)


class FakeTelegramService:
    """A TelegramMediaService stand-in that never touches the network."""

    async def upload_file(self, file_path: str, caption: str = ""):
        return {"is_split": False, "parts": [{"message_id": 11, "file_id": "F", "size_bytes": 2048}]}
