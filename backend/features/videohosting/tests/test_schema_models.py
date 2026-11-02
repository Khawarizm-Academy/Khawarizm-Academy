"""Focused tests for the additive Phase 4 video schema slice."""

from __future__ import annotations

from django.db import IntegrityError

from features.common.choices import PackagingPolicy, PlaybackMode, Protection
from features.common.testing import ApiTestCase, make_user
from features.videohosting.models import UploadSession, VideoAsset, VideoCaption, VideoProvider


class VideoSchemaModelTests(ApiTestCase):
    def test_phase_four_choice_values_are_canonical(self):
        self.assertEqual(PlaybackMode.values, ["hls", "raw", "embed", "external"])
        self.assertEqual(Protection.values, ["encrypted", "gated", "none"])
        self.assertEqual(PackagingPolicy.values, ["auto", "always", "never"])

    def test_provider_packaging_policy_defaults_to_auto(self):
        provider = VideoProvider.objects.create(code="drive", name="Drive")

        self.assertEqual(provider.packaging_policy, PackagingPolicy.AUTO)

    def test_asset_phase_four_metadata_defaults_to_blank(self):
        asset = VideoAsset.objects.create(slug="schema-asset")

        self.assertEqual(asset.playback_mode, "")
        self.assertEqual(asset.protection, "")
        self.assertEqual(asset.external_ref, "")
        self.assertEqual(asset.poster_url, "")
        self.assertEqual(asset.mime_type, "")
        self.assertEqual(asset.source_sha256, "")

    def test_caption_has_timestamps_and_is_unique_per_asset_language(self):
        asset = VideoAsset.objects.create(slug="captioned-asset")
        caption = VideoCaption.objects.create(
            asset=asset,
            language="ar",
            label="العربية",
            vtt="WEBVTT\n\n00:00.000 --> 00:01.000\nمرحبا",
        )

        self.assertIsNotNone(caption.created_at)
        self.assertIsNotNone(caption.updated_at)
        self.assertFalse(caption.is_default)
        self.assertEqual(asset.captions.get(), caption)
        with self.assertRaises(IntegrityError):
            VideoCaption.objects.create(
                asset=asset,
                language="ar",
                label="Arabic duplicate",
                vtt="WEBVTT\n",
            )

    def test_upload_session_accepts_nullable_user_and_blank_upload_metadata(self):
        asset = VideoAsset.objects.create(slug="upload-session-asset")
        provider = VideoProvider.objects.create(code="drive", name="Drive")
        anonymous_session = UploadSession.objects.create(
            asset=asset,
            provider=provider,
            session_key="anonymous-session",
        )

        self.assertIsNone(anonymous_session.user)
        self.assertEqual(anonymous_session.file_name, "")
        self.assertEqual(anonymous_session.mime_type, "")
        self.assertEqual(anonymous_session.source_sha256_partial, "")

        user = make_user(email="uploader@example.com")
        owned_session = UploadSession.objects.create(
            asset=asset,
            provider=provider,
            user=user,
            session_key="owned-session",
            file_name="lesson.mp4",
            mime_type="video/mp4",
            source_sha256_partial="a" * 64,
        )
        self.assertEqual(owned_session.user, user)
