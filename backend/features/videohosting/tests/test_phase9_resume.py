from __future__ import annotations

import hashlib
from unittest import mock

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from features.common.testing import make_user
from features.videohosting import studio_uploads
from features.videohosting.models import UploadSession, VideoAsset, VideoProvider
from features.videohosting.providers import ensure_defaults, google_drive
from features.videohosting.providers.drive_uploads import UploadResult


class Phase9ResumeTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = make_user("phase9-owner@example.com")
        ensure_defaults()
        self.drive = VideoProvider.objects.get(code="google_drive")
        self.asset = VideoAsset.objects.create(
            slug="phase9-resume-video",
            title="Resume video",
            provider=self.drive,
            created_by=self.user,
            status="uploading",
            stage="packaging:auto",
        )

    def request(self, method, path, user=None, **kwargs):
        request = getattr(self.factory, method)(path, **kwargs)
        force_authenticate(request, user=user or self.user)
        return request

    def _session(
        self,
        *,
        session_key="phase9-session",
        file_name="lesson.mp4",
        total=12,
        first_chunk_sha256="",
    ):
        return UploadSession.objects.create(
            asset=self.asset,
            provider=self.drive,
            user=self.user,
            session_key=session_key,
            status="pending",
            file_name=file_name,
            mime_type="video/mp4",
            source_sha256_partial=first_chunk_sha256,
            upload_uri="https://upload.googleapis.com/upload/server-only",
            total_bytes=total,
            chunk_size=4 * 1024 * 1024,
        )

    def _init_upload(self, *, file_name="Original Lesson.MP4", size=12, first_chunk_sha256="a" * 64):
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(True, "")),
            mock.patch.object(studio_uploads, "_plan", return_value=mock.Mock(mode="raw")),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(
                google_drive.drive_uploads,
                "start_session",
                return_value="https://upload.googleapis.com/upload/server-only",
            ),
        ):
            return studio_uploads.studio_upload_init(
                self.request(
                    "post",
                    "/api/studio/videos/phase9-resume-video/upload",
                    data={
                        "fileName": file_name,
                        "sizeBytes": size,
                        "mimeType": "video/mp4",
                        "firstChunkSha256": first_chunk_sha256,
                    },
                    format="json",
                ),
                self.asset.slug,
            )

    def test_init_persists_original_name_size_and_first_chunk_sha256(self):
        fingerprint = "ABCDEF" * 10 + "ABCD"
        response = self._init_upload(
            file_name="Original Lesson.MP4",
            size=1234,
            first_chunk_sha256=fingerprint,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["fileName"], "Original Lesson.MP4")
        self.assertEqual(response.data["total"], 1234)
        self.assertEqual(response.data["firstChunkSha256"], fingerprint.lower())
        session = UploadSession.objects.get(session_key=response.data["sessionId"])
        self.assertEqual(session.file_name, "Original Lesson.MP4")
        self.assertEqual(session.total_bytes, 1234)
        self.assertEqual(session.source_sha256_partial, fingerprint.lower())
        self.assertNotIn("upload_uri", response.data)
        self.assertNotIn("server-only", repr(response.data))

    def test_owned_library_and_status_expose_resume_metadata_without_provider_secrets(self):
        body = b"0000ftyp" + b"x" * 4
        session = self._session(first_chunk_sha256=hashlib.sha256(body).hexdigest())

        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            listing = studio_uploads.studio_videos(self.request("get", "/api/studio/videos?scope=own&page=1"))
            status = studio_uploads.studio_upload_status(
                self.request("get", f"/api/studio/uploads/{session.session_key}"), session.session_key
            )

        self.assertEqual(listing.status_code, 200)
        pending = next(row["pendingUpload"] for row in listing.data["results"] if row["slug"] == self.asset.slug)
        self.assertEqual(
            pending,
            {
                "sessionId": session.session_key,
                "chunkSize": session.chunk_size,
                "offset": 0,
                "total": session.total_bytes,
                "status": "pending",
                "progress": 0,
                "fileName": session.file_name,
                "firstChunkSha256": session.source_sha256_partial,
            },
        )
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.data["fileName"], session.file_name)
        self.assertEqual(status.data["total"], session.total_bytes)
        self.assertEqual(status.data["firstChunkSha256"], session.source_sha256_partial)
        self.assertNotIn("upload_uri", repr(listing.data))
        self.assertNotIn("server-only", repr(listing.data))
        self.assertNotIn("upload_uri", repr(status.data))
        self.assertNotIn("server-only", repr(status.data))

    def test_valid_resume_relays_the_first_chunk_and_advances_the_session(self):
        body = b"0000ftyp" + b"x" * 4
        session = self._session(first_chunk_sha256=hashlib.sha256(body).hexdigest())
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(
                google_drive.drive_uploads,
                "probe_offset",
                return_value=UploadResult(0),
            ) as probe_offset,
            mock.patch.object(
                google_drive.drive_uploads,
                "send_chunk",
                return_value=UploadResult(12, "drive-file", True),
            ) as send_chunk,
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    f"/api/studio/uploads/{session.session_key}/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-11/12",
                ),
                session.session_key,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"offset": 12, "complete": True})
        probe_offset.assert_called_once()
        send_chunk.assert_called_once()
        session.refresh_from_db()
        self.assertEqual(session.bytes_uploaded, 12)
        self.assertEqual(session.source_sha256_partial, hashlib.sha256(body).hexdigest())
        self.assertNotIn("drive-file", repr(response.data))

    def test_wrong_size_and_first_chunk_hash_are_rejected_before_provider_bytes(self):
        body = b"0000ftyp" + b"x" * 4
        session = self._session(first_chunk_sha256="f" * 64)
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset") as probe_offset,
            mock.patch.object(google_drive.drive_uploads, "send_chunk") as send_chunk,
        ):
            wrong_hash = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    f"/api/studio/uploads/{session.session_key}/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-11/12",
                ),
                session.session_key,
            )
            wrong_size = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    f"/api/studio/uploads/{session.session_key}/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-11/13",
                ),
                session.session_key,
            )

        self.assertEqual(wrong_hash.status_code, 400)
        self.assertEqual(wrong_hash.data["code"], "upload_file_mismatch")
        self.assertEqual(wrong_size.status_code, 400)
        self.assertEqual(wrong_size.data["code"], "invalid_content_range")
        probe_offset.assert_not_called()
        send_chunk.assert_not_called()
        session.refresh_from_db()
        self.assertEqual(session.bytes_uploaded, 0)

    def test_wrong_content_for_the_persisted_filename_is_rejected_before_provider_write(self):
        body = b"\x1a\x45\xdf\xa3" + b"webm"
        session = self._session(
            file_name="lesson.mp4",
            total=len(body),
            first_chunk_sha256=hashlib.sha256(body).hexdigest(),
        )
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset", return_value=UploadResult(0)),
            mock.patch.object(google_drive.drive_uploads, "send_chunk") as send_chunk,
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    f"/api/studio/uploads/{session.session_key}/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE=f"bytes 0-{len(body) - 1}/{len(body)}",
                ),
                session.session_key,
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "invalid_video_magic")
        send_chunk.assert_not_called()
        session.refresh_from_db()
        self.assertEqual(session.bytes_uploaded, 0)

    def test_legacy_session_without_fingerprint_is_accepted_and_backfilled(self):
        body = b"0000ftyp" + b"x" * 4
        session = self._session(first_chunk_sha256="")
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(
                google_drive.drive_uploads,
                "probe_offset",
                return_value=UploadResult(0),
            ),
            mock.patch.object(
                google_drive.drive_uploads,
                "send_chunk",
                return_value=UploadResult(12, "legacy-drive-file", True),
            ) as send_chunk,
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    f"/api/studio/uploads/{session.session_key}/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-11/12",
                ),
                session.session_key,
            )

        self.assertEqual(response.status_code, 200)
        send_chunk.assert_called_once()
        session.refresh_from_db()
        self.assertEqual(session.source_sha256_partial, hashlib.sha256(body).hexdigest())
        self.assertEqual(session.bytes_uploaded, 12)
