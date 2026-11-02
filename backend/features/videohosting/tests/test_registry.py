"""Registry + default-provider tests."""

from __future__ import annotations

from django.conf import settings

from features.common.testing import ApiTestCase
from features.videohosting import providers
from features.videohosting.models import VideoProvider


class RegistryTests(ApiTestCase):
    def test_specs_upsert_every_provider_row(self):
        providers.ensure_defaults()
        codes = set(VideoProvider.objects.values_list("code", flat=True))
        self.assertEqual(codes, {"google_drive", "telegram", "youtube", "vimeo", "external"})
        # Enablement matches the specs: Drive is live, Telegram waits on its infra.
        self.assertTrue(VideoProvider.objects.get(code="google_drive").is_enabled)
        self.assertFalse(VideoProvider.objects.get(code="telegram").is_enabled)
        self.assertTrue(VideoProvider.objects.get(code="youtube").is_enabled)
        self.assertTrue(VideoProvider.objects.get(code="vimeo").is_enabled)
        self.assertTrue(VideoProvider.objects.get(code="external").is_enabled)

    def test_a_hand_toggled_row_is_resynced_to_its_spec(self):
        providers.ensure_defaults()
        VideoProvider.objects.filter(code="telegram").update(is_enabled=True)
        providers.ensure_defaults()  # specs, not hand-edited rows, are the source of truth
        self.assertFalse(VideoProvider.objects.get(code="telegram").is_enabled)

    def test_spec_for_is_a_record_lookup(self):
        self.assertEqual(providers.spec_for("google_drive").code, "google_drive")
        self.assertIsNone(providers.spec_for("nope"))

    def test_link_specs_have_pure_reference_and_embed_hooks(self):
        for code in ("youtube", "vimeo"):
            spec = providers.spec_for(code)
            self.assertIsNotNone(spec)
            self.assertEqual(spec.kind, "link")
            self.assertEqual(spec.needs, frozenset())
            self.assertIsNotNone(spec.parse_reference)
            self.assertIsNotNone(spec.embed_url)

        external = providers.spec_for("external")
        self.assertEqual(external.kind, "link")
        self.assertEqual(external.needs, frozenset())
        self.assertIsNotNone(external.parse_reference)
        self.assertIsNone(external.embed_url)

    def test_existing_storage_specs_keep_defaulted_fields(self):
        for code in ("google_drive", "telegram"):
            spec = providers.spec_for(code)
            self.assertEqual(spec.kind, "storage")
            self.assertEqual(spec.needs, frozenset())
            self.assertIsNone(spec.parse_reference)
            self.assertIsNone(spec.embed_url)
            self.assertIsNotNone(spec.delete_remote)

    def test_default_provider_matches_settings(self):
        providers.ensure_defaults()
        self.assertEqual(providers.default_code(), settings.VIDEO_HOSTING_DEFAULT_PROVIDER)
