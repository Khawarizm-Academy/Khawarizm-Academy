"""Model, packaging-host, serializer, and token-mint tests."""

from __future__ import annotations

import hashlib
from datetime import timedelta
from unittest import mock

from django.db import IntegrityError
from django.utils import timezone

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase
from features.videohosting import packaging, tokens
from features.videohosting.models import StreamToken, VideoRendition
from features.videohosting.serializers import asset_meta
from features.videohosting.tests.helpers import KEY_HEX, make_asset


class AssetModelTests(ApiTestCase):
    def test_status_default_is_uploading(self):
        from features.videohosting.models import VideoAsset

        asset = VideoAsset.objects.create(slug="draft")
        self.assertEqual(asset.status, VideoStatus.UPLOADING)

    def test_rendition_quality_is_unique_per_asset(self):
        asset = make_asset()
        with self.assertRaises(IntegrityError):
            VideoRendition.objects.create(asset=asset, quality="360p", aes_key_hex=KEY_HEX)


class PackagingHostTests(ApiTestCase):
    def test_guard_blocks_vercel_with_instructions(self):
        with mock.patch.object(packaging.settings, "IS_VERCEL", True):
            with self.assertRaises(packaging.PackagingError) as ctx:
                packaging.require_packaging_host()
        self.assertIn("cannot run on Vercel", str(ctx.exception))

    def test_guard_reports_missing_ffmpeg_off_vercel(self):
        with mock.patch.object(packaging.settings, "IS_VERCEL", False):
            with mock.patch.object(packaging, "ffmpeg_available", return_value=False):
                with self.assertRaises(packaging.PackagingError) as ctx:
                    packaging.require_packaging_host()
        self.assertIn("Install FFmpeg", str(ctx.exception))

    def test_guard_passes_when_ffmpeg_present(self):
        with mock.patch.object(packaging, "ffmpeg_available", return_value=True):
            packaging.require_packaging_host()  # must not raise


class AssetMetaTests(ApiTestCase):
    def test_meta_shape_is_camel_case(self):
        payload = asset_meta(make_asset())
        self.assertEqual(payload["id"], "course-1--lesson-1")
        self.assertEqual(payload["durationSeconds"], 120)
        self.assertEqual(payload["qualities"][0]["bandwidthBps"], 800_000)


class TokenTests(ApiTestCase):
    def test_mint_stores_only_a_hash(self):
        asset = make_asset()
        raw, row = tokens.mint(asset, None, "10.0.0.1")
        self.assertEqual(row.token_hash, hashlib.sha256(raw.encode()).hexdigest())
        self.assertNotIn(raw, row.token_hash)

    def test_resolve_rejects_other_ip(self):
        asset = make_asset()
        raw, _ = tokens.mint(asset, None, "10.0.0.1")
        self.assertIsNone(tokens.resolve(raw, "10.0.0.2"))

    def test_resolve_rejects_expired_and_deletes_it(self):
        asset = make_asset()
        raw, row = tokens.mint(asset, None, "10.0.0.1")
        StreamToken.objects.filter(pk=row.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertIsNone(tokens.resolve(raw, "10.0.0.1"))
        self.assertFalse(StreamToken.objects.filter(pk=row.pk).exists())

    def test_resolve_accepts_bound_ip(self):
        asset = make_asset()
        raw, _ = tokens.mint(asset, None, "10.0.0.1")
        self.assertIsNotNone(tokens.resolve(raw, "10.0.0.1"))
