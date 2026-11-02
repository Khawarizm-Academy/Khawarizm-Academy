from __future__ import annotations

from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from features.common.testing import make_user
from features.videohosting import studio_uploads
from features.videohosting.models import UploadSession, VideoAsset, VideoProvider
from features.videohosting.providers import ensure_defaults, google_drive
from features.videohosting.providers.drive_uploads import UploadResult


class StudioUploadsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = make_user("instructor@example.com")
        ensure_defaults()
        self.drive = VideoProvider.objects.get(code="google_drive")
        self.asset = VideoAsset.objects.create(
            slug="studio-test",
            title="Test video",
            provider=self.drive,
            created_by=self.user,
            status="uploading",
            stage="packaging:auto",
        )

    def request(self, method, path, user=None, **kwargs):
        request = getattr(self.factory, method)(path, **kwargs)
        force_authenticate(request, user=user or self.user)
        return request

    def test_collection_post_and_get_return_their_route_shapes(self):
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(True, "")),
            mock.patch.object(studio_uploads, "_plan", return_value=mock.Mock(mode="raw")),
        ):
            created = studio_uploads.studio_videos(
                self.request(
                    "post",
                    "/api/studio/videos",
                    data={"title": "New video", "provider": "google_drive", "packaging": "never"},
                    format="json",
                )
            )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["title"], "New video")
        self.assertEqual(created.data["provider"], "google_drive")
        self.assertNotIn("upload_uri", repr(created.data))

        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            listing = studio_uploads.studio_videos(self.request("get", "/api/studio/videos?page=1&scope=own"))

        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["total"], 2)
        self.assertEqual(listing.data["page"], 1)
        self.assertEqual(listing.data["pageSize"], 20)
        self.assertEqual({row["title"] for row in listing.data["results"]}, {"Test video", "New video"})

    def test_collection_error_uses_the_standard_response_envelope(self):
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(False, "offline")),
        ):
            response = studio_uploads.studio_videos(
                self.request(
                    "post",
                    "/api/studio/videos",
                    data={"title": "Unavailable", "provider": "google_drive"},
                    format="json",
                )
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {"detail", "code"})
        self.assertEqual(response.data["code"], "provider_unavailable")
        self.assertEqual(response.data["detail"], "offline")

    def test_init_rejects_extension_and_quota(self):
        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            response = studio_uploads.studio_upload_init(
                self.request(
                    "post",
                    "/api/studio/videos/studio-test/uploads",
                    data={"fileName": "clip.exe", "sizeBytes": 12, "mimeType": "video/mp4"},
                    format="json",
                ),
                "studio-test",
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data["code"], "invalid_extension")

        with (
            mock.patch.object(
                studio_uploads,
                "has_perm",
                side_effect=lambda _user, key: key in {"videos.upload", "videos.manage_own"},
            ),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(True, "")),
            mock.patch.object(studio_uploads, "_plan", return_value=mock.Mock(mode="raw")),
            override_settings(VIDEO_USER_QUOTA_BYTES=10),
        ):
            response = studio_uploads.studio_upload_init(
                self.request(
                    "post",
                    "/api/studio/videos/studio-test/uploads",
                    data={"fileName": "clip.mp4", "sizeBytes": 12, "mimeType": "video/mp4"},
                    format="json",
                ),
                "studio-test",
            )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.data["code"], "payload_too_large")

    def test_init_rejects_unavailable_provider(self):
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(False, "offline")),
        ):
            response = studio_uploads.studio_upload_init(
                self.request(
                    "post",
                    "/api/studio/videos/studio-test/uploads",
                    data={"fileName": "clip.mp4", "sizeBytes": 12, "mimeType": "video/mp4"},
                    format="json",
                ),
                "studio-test",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {"detail", "code"})
        self.assertEqual(response.data["code"], "provider_unavailable")

    def test_init_response_never_contains_upload_uri(self):
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_needs_available", return_value=(True, "")),
            mock.patch.object(studio_uploads, "_plan", return_value=mock.Mock(mode="raw")),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(
                google_drive.drive_uploads,
                "start_session",
                return_value="https://upload.googleapis.com/upload/secret",
            ) as start_session,
        ):
            response = studio_uploads.studio_upload_init(
                self.request(
                    "post",
                    "/api/studio/videos/studio-test/uploads",
                    data={"fileName": "clip.mp4", "sizeBytes": 12, "mimeType": "video/mp4"},
                    format="json",
                ),
                "studio-test",
            )

        self.assertEqual(response.status_code, 201)
        start_session.assert_called_once()
        self.assertNotIn("upload_uri", response.data)
        self.assertNotIn("secret", repr(response.data))
        self.assertEqual(
            response.data,
            {
                "sessionId": mock.ANY,
                "chunkSize": mock.ANY,
                "offset": 0,
                "total": 12,
                "fileName": "clip.mp4",
                "firstChunkSha256": "",
            },
        )
        session = UploadSession.objects.get(session_key=response.data["sessionId"])
        self.assertEqual(session.upload_uri, "https://upload.googleapis.com/upload/secret")

    def _session(self, total=12):
        return UploadSession.objects.create(
            asset=self.asset,
            provider=self.drive,
            user=self.user,
            session_key="session-test",
            status="pending",
            file_name="clip.mp4",
            mime_type="video/mp4",
            upload_uri="https://upload.googleapis.com/upload/server-only",
            total_bytes=total,
            chunk_size=4 * 1024 * 1024,
        )

    def test_chunk_magic_header_and_strict_content_range(self):
        self._session()
        body = b"0000ftyp" + b"x" * 4
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset", return_value=UploadResult(0)) as probe_offset,
            mock.patch.object(
                google_drive.drive_uploads,
                "send_chunk",
                return_value=UploadResult(12, "file-id", True),
            ) as send_chunk,
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    "/api/studio/uploads/session-test/chunk",
                    data=body,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-11/12",
                ),
                "session-test",
            )

        self.assertEqual(response.data, {"offset": 12, "complete": True})
        probe_offset.assert_called_once()
        send_chunk.assert_called_once()
        self.assertNotIn("file-id", repr(response.data))

        response = studio_uploads.studio_upload_chunk(
            self.request(
                "put",
                "/api/studio/uploads/session-test/chunk",
                data=b"bad",
                content_type="application/octet-stream",
                HTTP_CONTENT_RANGE="bytes=0-2/12",
            ),
            "session-test",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "invalid_content_range")

    def test_duplicate_and_out_of_order_offsets_are_safe_and_enveloped(self):
        session = self._session()
        session.bytes_uploaded = 8
        session.save(update_fields=["bytes_uploaded"])
        duplicate = b"x" * 4
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset", return_value=UploadResult(8)) as probe_offset,
            mock.patch.object(google_drive.drive_uploads, "send_chunk") as send_chunk,
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    "/api/studio/uploads/session-test/chunk",
                    data=duplicate,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-3/12",
                ),
                "session-test",
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data, {"offset": 8, "complete": False})
        probe_offset.assert_called_once()
        send_chunk.assert_not_called()

        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset", return_value=UploadResult(8)),
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    "/api/studio/uploads/session-test/chunk",
                    data=b"x" * 4,
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 6-9/12",
                ),
                "session-test",
            )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(set(response.data), {"detail", "code", "fields"})
        self.assertEqual(response.data["code"], "offset_mismatch")
        self.assertEqual(response.data["fields"]["offset"], 8)

    def test_webm_magic_is_required_for_webm(self):
        session = self._session()
        session.file_name = "clip.webm"
        session.save(update_fields=["file_name"])
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "probe_offset", return_value=UploadResult(0)),
        ):
            response = studio_uploads.studio_upload_chunk(
                self.request(
                    "put",
                    "/api/studio/uploads/session-test/chunk",
                    data=b"not-webm",
                    content_type="application/octet-stream",
                    HTTP_CONTENT_RANGE="bytes 0-7/12",
                ),
                "session-test",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "invalid_video_magic")

    def test_status_get_and_delete_dispatch_with_idempotent_cancel(self):
        session = self._session()
        session.bytes_uploaded = 5
        session.save(update_fields=["bytes_uploaded"])
        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            response = studio_uploads.studio_upload_status(
                self.request("get", "/api/studio/uploads/session-test"), "session-test"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "sessionId": "session-test",
                "chunkSize": 4 * 1024 * 1024,
                "offset": 5,
                "total": 12,
                "status": "pending",
                "progress": 0,
                "fileName": "clip.mp4",
                "firstChunkSha256": "",
            },
        )
        self.assertNotIn("upload_uri", response.data)

        dispatched = studio_uploads._response({"status": "cancelled"})
        with mock.patch.object(studio_uploads, "studio_upload_cancel", return_value=dispatched) as cancel_handler:
            routed = studio_uploads.studio_upload_status(
                self.request("delete", "/api/studio/uploads/session-test"), "session-test"
            )

        cancel_handler.assert_called_once()
        self.assertIs(routed, dispatched)

        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(google_drive, "access_token", return_value=(True, "bearer", "ok")),
            mock.patch.object(google_drive.drive_uploads, "cancel_session", return_value=True) as cancel_session,
        ):
            cancelled = studio_uploads.studio_upload_cancel(
                self.request("delete", "/api/studio/uploads/session-test"), "session-test"
            )
            again = studio_uploads.studio_upload_cancel(
                self.request("delete", "/api/studio/uploads/session-test"), "session-test"
            )

        self.assertEqual(cancel_session.call_count, 1)
        self.assertEqual(cancelled.data, {"status": "cancelled"})
        self.assertEqual(again.data, {"status": "cancelled"})
        self.assertNotIn("upload_uri", repr(cancelled.data))

    def test_status_authorization_error_uses_the_standard_envelope(self):
        self._session()
        other = make_user("other@example.com")
        with mock.patch.object(studio_uploads, "has_perm", return_value=False):
            response = studio_uploads.studio_upload_status(
                self.request("get", "/api/studio/uploads/session-test", user=other), "session-test"
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(set(response.data), {"detail", "code"})
        self.assertEqual(response.data["code"], "permission_denied")

    def test_link_parsers_are_pure_and_link_asset_is_ready(self):
        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            response = studio_uploads.studio_video_link_create(
                self.request(
                    "post",
                    "/api/studio/videos/link",
                    data={"url": "https://youtu.be/dQw4w9WgXcQ", "title": "Linked"},
                    format="json",
                )
            )
        self.assertEqual(response.status_code, 201)
        linked = VideoAsset.objects.get(slug=response.data["slug"])
        self.assertEqual(linked.status, "ready")
        self.assertEqual(linked.playback_mode, "embed")
        with mock.patch.object(studio_uploads, "has_perm", return_value=True):
            response = studio_uploads.studio_video_link_create(
                self.request(
                    "post",
                    "/api/studio/videos/link",
                    data={"url": "javascript:alert(1)", "title": "Bad"},
                    format="json",
                )
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "invalid_video_link")

    def test_complete_and_cancel_are_idempotent_and_never_return_uri(self):
        session = self._session()
        session.bytes_uploaded = session.total_bytes
        session.metadata = {"packaging": "auto", "fileId": "drive-file"}
        session.save(update_fields=["bytes_uploaded", "metadata"])
        plan = mock.Mock(mode="raw", package=False)
        with (
            mock.patch.object(studio_uploads, "has_perm", return_value=True),
            mock.patch.object(studio_uploads, "_plan", return_value=plan),
        ):
            first = studio_uploads.studio_upload_complete(
                self.request(
                    "post",
                    "/api/studio/uploads/session-test/complete",
                    data={},
                    format="json",
                ),
                "session-test",
            )
            second = studio_uploads.studio_upload_complete(
                self.request(
                    "post",
                    "/api/studio/uploads/session-test/complete",
                    data={},
                    format="json",
                ),
                "session-test",
            )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertNotIn("upload_uri", repr(first.data))
        self.assertEqual(second.data["status"], "ready")
        self.assertEqual(second.data["playbackMode"], "raw")
        self.assertEqual(second.data["protection"], "gated")
