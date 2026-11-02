"""Offline tests for post-delete provider cleanup and orphan auditing."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest import mock

from django.db import transaction
from django.test import SimpleTestCase

from features.access.models import AuditEvent
from features.common.choices import AuditAction
from features.common.testing import ApiTestCase, FakeRequest, make_user
from features.videohosting import remote_cleanup
from features.videohosting.models import VideoProvider, VideoRendition, VideoSegment
from features.videohosting.providers import google_drive, telegram
from features.videohosting.tests.helpers import make_asset


class RemoteCleanupSnapshotTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        VideoProvider.objects.get_or_create(
            code="google_drive",
            defaults={"name": "Google Drive", "is_enabled": True, "is_default": True},
        )
        VideoProvider.objects.get_or_create(code="telegram", defaults={"name": "Telegram"})

    def test_snapshot_collects_drive_file_id_before_cascade(self):
        provider = VideoProvider.objects.get(code="google_drive")
        asset = make_asset(provider=provider, source_file_id="DRIVE-FILE-1")

        snapshot = remote_cleanup.snapshot_remote_references(asset)

        self.assertEqual(snapshot.provider_code, "google_drive")
        self.assertEqual(snapshot.source_file_id, "DRIVE-FILE-1")
        self.assertEqual(snapshot.telegram_message_ids, ())
        with self.assertRaises(AttributeError):
            snapshot.source_file_id = "changed"

    def test_snapshot_collects_source_and_all_telegram_segment_messages(self):
        provider = VideoProvider.objects.get(code="telegram")
        asset = make_asset(provider=provider, source_message_id=101)
        second = VideoRendition.objects.create(
            asset=asset,
            quality="720p",
            playlist="",
            aes_key_hex="00112233445566778899aabbccddeeff",
        )
        VideoSegment.objects.create(rendition=second, index=0, message_id=303)
        VideoSegment.objects.create(rendition=second, index=1, message_id=304)

        snapshot = remote_cleanup.snapshot_remote_references(asset)

        self.assertEqual(snapshot.source_message_id, 101)
        self.assertEqual(snapshot.segment_message_ids, (11, 303, 304))
        self.assertEqual(snapshot.telegram_message_ids, (101, 11, 303, 304))
        self.assertEqual(snapshot.reference_count, 4)

    def test_cleanup_runs_only_after_commit_and_receives_immutable_snapshot(self):
        provider = VideoProvider.objects.get(code="telegram")
        asset = make_asset(provider=provider, source_message_id=101)
        fake_delete = mock.Mock()
        fake_spec = SimpleNamespace(delete_remote=fake_delete)

        with mock.patch.object(remote_cleanup, "spec_for", return_value=fake_spec):
            with self.captureOnCommitCallbacks(execute=False) as callbacks:
                with transaction.atomic():
                    snapshot = remote_cleanup.schedule_remote_delete(asset)
                    asset.delete()
                    fake_delete.assert_not_called()
            self.assertEqual(len(callbacks), 1)
            callbacks[0]()

        fake_delete.assert_called_once_with(snapshot)
        self.assertEqual(snapshot.telegram_message_ids, (101, 11))
        self.assertFalse(AuditEvent.objects.filter(action=AuditAction.REMOTE_ORPHAN).exists())

    def test_failure_is_swallowed_and_audit_detail_contains_no_secret_or_url(self):
        provider = VideoProvider.objects.get(code="google_drive")
        asset = make_asset(provider=provider, source_file_id="DRIVE-FILE-2")
        asset_id = str(asset.pk)
        actor = make_user(email="cleanup-actor@example.com")
        failure = RuntimeError("OAuth token session secret at https://evil.example/delete?token=raw")
        fake_spec = SimpleNamespace(delete_remote=mock.Mock(side_effect=failure))

        with mock.patch.object(remote_cleanup, "spec_for", return_value=fake_spec):
            with self.captureOnCommitCallbacks(execute=True):
                with transaction.atomic():
                    remote_cleanup.schedule_remote_delete(asset, actor=actor, request=FakeRequest())
                    asset.delete()

        event = AuditEvent.objects.get(action=AuditAction.REMOTE_ORPHAN)
        serialized = json.dumps(event.detail)
        self.assertEqual(event.target_type, "video_asset")
        self.assertEqual(event.target_id, asset_id)
        self.assertEqual(event.actor_id, actor.pk)
        self.assertEqual(event.detail["provider"], "google_drive")
        self.assertEqual(event.detail["referenceCount"], 1)
        self.assertNotIn("OAuth", serialized)
        self.assertNotIn("token", serialized.lower())
        self.assertNotIn("https://", serialized)


class ProviderRemoteDeleteTests(SimpleTestCase):
    def test_drive_delete_uses_oauth_bearer_and_bounded_timeout(self):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        snapshot = SimpleNamespace(source_file_id="file/with spaces")
        with (
            mock.patch.object(google_drive, "access_token", return_value=(True, "BEARER", "")),
            mock.patch.object(google_drive.urllib.request, "urlopen", return_value=response) as urlopen,
        ):
            google_drive.delete_remote(snapshot)

        request = urlopen.call_args.args[0]
        self.assertEqual(request.method, "DELETE")
        self.assertEqual(request.headers["Authorization"], "Bearer BEARER")
        self.assertIn("file%2Fwith%20spaces", request.full_url)
        self.assertEqual(urlopen.call_args.kwargs["timeout"], google_drive.REMOTE_DELETE_SECONDS)

    def test_telegram_delete_uses_fake_client_and_captured_channel_messages(self):
        calls = []

        class FakeTelegramService:
            def __init__(self):
                self.closed = False

            async def delete_messages(self, message_ids):
                calls.append(tuple(message_ids))

            async def _drop_client(self):
                self.closed = True

        snapshot = SimpleNamespace(telegram_message_ids=(17, 18, 19))
        with mock.patch.object(telegram, "TelegramMediaService", FakeTelegramService):
            telegram.delete_remote(snapshot)

        self.assertEqual(calls, [(17, 18, 19)])
