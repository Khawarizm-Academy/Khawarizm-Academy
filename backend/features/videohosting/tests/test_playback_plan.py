"""Pure playback-plan matrix tests."""

from __future__ import annotations

from types import SimpleNamespace
from unittest import TestCase

from features.videohosting.playback_plan import Plan, resolve_playback_plan

HOST_READY = {"serverless": False, "ffmpeg": True, "persistentHost": True}
HOST_FFMPEG_SERVERLESS = {"serverless": True, "ffmpeg": True, "persistentHost": False}
HOST_NO_FFMPEG = {"serverless": False, "ffmpeg": False, "persistentHost": True}
HOST_SERVERLESS_NO_FFMPEG = {"serverless": True, "ffmpeg": False, "persistentHost": False}

DRIVE = SimpleNamespace(
    code="google_drive",
    kind="storage",
    capabilities={"playback": "provider_managed_or_limited"},
    ingest=SimpleNamespace(store_package=None),
    raw_stream=lambda *_args: None,
    needs=frozenset(),
)
TELEGRAM = SimpleNamespace(
    code="telegram",
    kind="storage",
    capabilities={"playback": "hls_token"},
    ingest=SimpleNamespace(store_package=lambda *_args: None),
    raw_stream=None,
    needs=frozenset({"ffmpeg", "persistent_host"}),
)
YOUTUBE = SimpleNamespace(
    code="youtube",
    kind="link",
    capabilities={"playback": "embed"},
    embed_url=lambda external_id: f"https://youtube.example/{external_id}",
)
EXTERNAL = SimpleNamespace(
    code="external",
    kind="link",
    capabilities={"playback": "external"},
)


def _row(name, spec, requested, policy, global_ffmpeg, host, expected):
    return (
        name,
        spec,
        requested,
        host,
        SimpleNamespace(use_ffmpeg=global_ffmpeg),
        SimpleNamespace(packaging_policy=policy),
        expected,
    )


MATRIX = [
    # Link providers never consult packaging choices or host capabilities.
    _row(
        "youtube request auto policy auto off",
        YOUTUBE,
        "auto",
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("embed", False, "link_provider"),
    ),
    _row(
        "youtube request always policy never on",
        YOUTUBE,
        "always",
        "never",
        True,
        HOST_READY,
        Plan("embed", False, "link_provider"),
    ),
    _row(
        "youtube request never policy always on",
        YOUTUBE,
        "never",
        "always",
        True,
        HOST_FFMPEG_SERVERLESS,
        Plan("embed", False, "link_provider"),
    ),
    _row(
        "youtube no request policy auto on",
        YOUTUBE,
        None,
        "auto",
        True,
        HOST_READY,
        Plan("embed", False, "link_provider"),
    ),
    _row(
        "external request auto policy auto off",
        EXTERNAL,
        "auto",
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("external", False, "link_provider"),
    ),
    _row(
        "external request always policy never on",
        EXTERNAL,
        "always",
        "never",
        True,
        HOST_READY,
        Plan("external", False, "link_provider"),
    ),
    _row(
        "external request never policy always on",
        EXTERNAL,
        "never",
        "always",
        True,
        HOST_FFMPEG_SERVERLESS,
        Plan("external", False, "link_provider"),
    ),
    _row(
        "external no request policy auto on",
        EXTERNAL,
        None,
        "auto",
        True,
        HOST_READY,
        Plan("external", False, "link_provider"),
    ),
    # Drive has a raw serving hook but no packaging target, so it stays raw.
    _row(
        "drive auto policy auto toggle off",
        DRIVE,
        "auto",
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive auto policy auto toggle on",
        DRIVE,
        "auto",
        "auto",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive no request policy auto on",
        DRIVE,
        None,
        "auto",
        True,
        HOST_FFMPEG_SERVERLESS,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive no request policy auto off",
        DRIVE,
        None,
        "auto",
        False,
        HOST_SERVERLESS_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive request always policy auto on",
        DRIVE,
        "always",
        "auto",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive request always policy auto off",
        DRIVE,
        "always",
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive request never policy always on",
        DRIVE,
        "never",
        "always",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive request never policy auto off",
        DRIVE,
        "never",
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive provider always policy on",
        DRIVE,
        None,
        "always",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive provider always policy off",
        DRIVE,
        None,
        "always",
        False,
        HOST_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive provider never policy on",
        DRIVE,
        None,
        "never",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive provider never policy off",
        DRIVE,
        None,
        "never",
        False,
        HOST_NO_FFMPEG,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive legacy raw mode with toggle off",
        DRIVE,
        "auto",
        "auto",
        False,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive ffmpeg on without target remains raw",
        DRIVE,
        "auto",
        "auto",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive legacy never remains raw",
        DRIVE,
        "never",
        "auto",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    _row(
        "drive explicit force alias remains raw",
        DRIVE,
        "force",
        "auto",
        True,
        HOST_READY,
        Plan("raw", False, "no_package_target"),
    ),
    # Telegram can only publish HLS when FFmpeg and a persistent host are present.
    _row("telegram auto global on ready", TELEGRAM, "auto", "auto", True, HOST_READY, Plan("hls", True, "ffmpeg")),
    _row(
        "telegram auto global off ready",
        TELEGRAM,
        "auto",
        "auto",
        False,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row("telegram no request global on ready", TELEGRAM, None, "auto", True, HOST_READY, Plan("hls", True, "ffmpeg")),
    _row(
        "telegram no request global off ready",
        TELEGRAM,
        None,
        "auto",
        False,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram policy always overrides global off",
        TELEGRAM,
        None,
        "always",
        False,
        HOST_READY,
        Plan("hls", True, "ffmpeg"),
    ),
    _row(
        "telegram policy never refuses despite global on",
        TELEGRAM,
        None,
        "never",
        True,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram request always overrides policy never",
        TELEGRAM,
        "always",
        "never",
        False,
        HOST_READY,
        Plan("hls", True, "ffmpeg"),
    ),
    _row(
        "telegram request never overrides policy always",
        TELEGRAM,
        "never",
        "always",
        True,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram request force alias packages",
        TELEGRAM,
        "force",
        "never",
        False,
        HOST_READY,
        Plan("hls", True, "ffmpeg"),
    ),
    _row(
        "telegram request auto defers provider always",
        TELEGRAM,
        "auto",
        "always",
        False,
        HOST_READY,
        Plan("hls", True, "ffmpeg"),
    ),
    _row(
        "telegram request auto defers provider never",
        TELEGRAM,
        "auto",
        "never",
        True,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram ffmpeg serverless is refused",
        TELEGRAM,
        "auto",
        "auto",
        True,
        HOST_FFMPEG_SERVERLESS,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram no ffmpeg persistent is refused",
        TELEGRAM,
        "auto",
        "auto",
        True,
        HOST_NO_FFMPEG,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram serverless no ffmpeg is refused",
        TELEGRAM,
        "auto",
        "auto",
        True,
        HOST_SERVERLESS_NO_FFMPEG,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram policy always no ffmpeg is refused",
        TELEGRAM,
        None,
        "always",
        True,
        HOST_NO_FFMPEG,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram request always serverless is refused",
        TELEGRAM,
        "always",
        "auto",
        True,
        HOST_FFMPEG_SERVERLESS,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram request never serverless is refused",
        TELEGRAM,
        "never",
        "auto",
        False,
        HOST_FFMPEG_SERVERLESS,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram global off no ffmpeg is refused",
        TELEGRAM,
        None,
        "auto",
        False,
        HOST_NO_FFMPEG,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row("telegram legacy force packages", TELEGRAM, "force", "auto", False, HOST_READY, Plan("hls", True, "ffmpeg")),
    _row(
        "telegram legacy never is not staged",
        TELEGRAM,
        "never",
        "auto",
        True,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram legacy auto missing ffmpeg is not staged",
        TELEGRAM,
        "auto",
        "auto",
        True,
        HOST_NO_FFMPEG,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row(
        "telegram legacy auto toggle off is not staged",
        TELEGRAM,
        "auto",
        "auto",
        False,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
    _row("telegram all prerequisites package", TELEGRAM, None, "always", True, HOST_READY, Plan("hls", True, "ffmpeg")),
    _row(
        "telegram explicit package wins every lower choice",
        TELEGRAM,
        "always",
        "never",
        False,
        HOST_READY,
        Plan("hls", True, "ffmpeg"),
    ),
    _row(
        "telegram explicit never wins every lower choice",
        TELEGRAM,
        "never",
        "always",
        True,
        HOST_READY,
        Plan("refused", False, "provider_requires_packaging"),
    ),
]


class PlaybackPlanTests(TestCase):
    def test_resolver_matrix(self):
        self.assertGreaterEqual(len(MATRIX), 40)
        for name, spec, requested, host, config, provider_row, expected in MATRIX:
            with self.subTest(name=name):
                self.assertEqual(resolve_playback_plan(spec, requested, host, config, provider_row), expected)

    def test_resolver_accepts_mapping_inputs_without_io(self):
        spec = {
            "kind": "storage",
            "needs": {"ffmpeg", "persistent_host"},
            "capabilities": {"supportsPackaging": True},
            "ingest": {"store_package": lambda *_args: None},
        }
        provider_row = {"packaging_policy": "auto"}
        plan = resolve_playback_plan(spec, None, HOST_READY, {"use_ffmpeg": True}, provider_row)
        self.assertEqual(plan, Plan("hls", True, "ffmpeg"))

    def test_invalid_packaging_choice_fails_before_any_provider_work(self):
        with self.assertRaisesRegex(ValueError, "Unsupported packaging choice"):
            resolve_playback_plan(TELEGRAM, "later", HOST_READY, SimpleNamespace(use_ffmpeg=True), None)
