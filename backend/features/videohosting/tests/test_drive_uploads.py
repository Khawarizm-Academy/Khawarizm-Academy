"""Offline protocol tests for the low-level Drive resumable-upload helper."""

from __future__ import annotations

import json
from unittest import mock

from features.common.testing import ApiTestCase
from features.videohosting.providers import drive_uploads
from features.videohosting.tests.helpers import ScriptedDriveHTTP

SESSION = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=trusted"
BEARER = "cached-bearer"
TOTAL = 8 * 1024 * 1024


def request_header(request, name: str) -> str:
    """urllib normalizes header spelling; tests should remain case-insensitive."""
    return next((value for key, value in request.headers.items() if key.lower() == name.lower()), "")


class DriveUploadProtocolTests(ApiTestCase):
    def test_start_session_sends_metadata_and_returns_only_validated_google_uri(self):
        scripted = ScriptedDriveHTTP([(200, {"Location": SESSION}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            session_uri = drive_uploads.start_session("lesson.mp4", "video/mp4", 1234, "ROOT-FOLDER", BEARER)

        self.assertEqual(session_uri, SESSION)
        request = scripted.calls[0]
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request_header(request, "Authorization"), f"Bearer {BEARER}")
        self.assertEqual(request_header(request, "X-Upload-Content-Type"), "video/mp4")
        self.assertEqual(request_header(request, "X-Upload-Content-Length"), "1234")
        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            {"name": "lesson.mp4", "mimeType": "video/mp4", "parents": ["ROOT-FOLDER"]},
        )

    def test_four_megabyte_chunk_is_raw_and_has_exact_binary_protocol_headers(self):
        chunk = b"\x00\x01\xff" * (drive_uploads.CHUNK_BYTES // 3) + b"\x00"
        self.assertEqual(len(chunk), drive_uploads.CHUNK_BYTES)
        scripted = ScriptedDriveHTTP([(308, {"Range": "bytes=0-4194303"}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            result = drive_uploads.send_chunk(SESSION, BEARER, chunk, 0, TOTAL)

        request = scripted.calls[0]
        self.assertEqual(request.data, chunk)
        self.assertEqual(request_header(request, "Content-Length"), "4194304")
        self.assertEqual(request_header(request, "Content-Range"), "bytes 0-4194303/8388608")
        self.assertEqual(result.next_offset, 4194304)
        self.assertFalse(result.complete)

    def test_partial_range_ack_is_authoritative_not_the_submitted_end(self):
        scripted = ScriptedDriveHTTP([(308, {"Range": "bytes 0-1023"}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            result = drive_uploads.send_chunk(SESSION, BEARER, b"x" * 4096, 0, TOTAL)

        self.assertEqual(result.next_offset, 1024)
        self.assertEqual(result.offset, 1024)

    def test_missing_range_means_no_committed_bytes(self):
        scripted = ScriptedDriveHTTP([(308, {}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            result = drive_uploads.send_chunk(SESSION, BEARER, b"x" * 256, 0, TOTAL)

        self.assertEqual(result.next_offset, 0)

    def test_status_probe_uses_empty_put_and_total_range(self):
        scripted = ScriptedDriveHTTP([(308, {"Range": "bytes 0-4194303"}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            result = drive_uploads.probe_offset(SESSION, BEARER, TOTAL)

        request = scripted.calls[0]
        self.assertEqual(request.get_method(), "PUT")
        self.assertEqual(request.data, b"")
        self.assertEqual(request_header(request, "Content-Length"), "0")
        self.assertEqual(request_header(request, "Content-Range"), "bytes */8388608")
        self.assertEqual(result.next_offset, 4194304)

    def test_final_200_and_201_return_completion_and_optional_file_id(self):
        for status in (200, 201):
            scripted = ScriptedDriveHTTP([(status, {}, b'{"id":"FILE-200-201"}')])
            with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
                result = drive_uploads.send_chunk(SESSION, BEARER, b"final", TOTAL - 5, TOTAL)
            self.assertEqual(result.next_offset, TOTAL)
            self.assertEqual(result.file_id, "FILE-200-201")
            self.assertTrue(result.complete)

    def test_expired_session_is_a_distinct_bounded_error(self):
        scripted = ScriptedDriveHTTP([(404, {}, b'{"error":"expired"}')])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            with self.assertRaises(drive_uploads.DriveUploadExpired):
                drive_uploads.probe_offset(SESSION, BEARER, TOTAL)

    def test_malformed_range_is_rejected_without_guessing_an_offset(self):
        scripted = ScriptedDriveHTTP([(308, {"Range": "not-a-range"}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            with self.assertRaises(drive_uploads.MalformedDriveRange):
                drive_uploads.probe_offset(SESSION, BEARER, TOTAL)

    def test_transient_remote_failures_are_bounded_and_do_not_echo_sensitive_values(self):
        secret_session = "https://www.googleapis.com/upload/drive/v3/files?session_secret=do-not-echo"
        scripted = ScriptedDriveHTTP([(500, {}, b"server failure")] * 10)

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            with self.assertRaises(drive_uploads.DriveUploadError) as context:
                drive_uploads.send_chunk(secret_session, BEARER, b"x", 0, 1)

        self.assertEqual(len(scripted.calls), drive_uploads.MAX_ATTEMPTS)
        self.assertNotIn(secret_session, str(context.exception))
        self.assertNotIn(BEARER, str(context.exception))

    def test_untrusted_session_uri_is_rejected_before_bearer_is_sent(self):
        scripted = ScriptedDriveHTTP([(200, {"Location": "https://attacker.example/upload/steal"}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            with self.assertRaises(drive_uploads.InvalidDriveSessionURI):
                drive_uploads.start_session("x.mp4", "video/mp4", 1, "ROOT", BEARER)

        self.assertEqual(len(scripted.calls), 1)  # only the unauthenticated session-open call ran
        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            self.assertFalse(drive_uploads.cancel_session("https://attacker.example/upload/steal", BEARER))
        self.assertEqual(len(scripted.calls), 1)

    def test_cancel_is_best_effort_and_accepts_expired_session_as_already_gone(self):
        scripted = ScriptedDriveHTTP([(404, {}, b"")])

        with mock.patch.object(drive_uploads.urllib.request, "urlopen", scripted):
            cancelled = drive_uploads.cancel_session(SESSION, BEARER)

        self.assertTrue(cancelled)
        self.assertEqual(scripted.calls[0].get_method(), "DELETE")
