"""Pure resolution of provider playback and FFmpeg packaging plans."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

PACKAGE_CHOICES = frozenset({"auto", "always", "never"})
PACKAGE_ALIASES = {"force": "always"}
PROVIDER_REQUIRES_PACKAGING = "provider_requires_packaging"

_MISSING = object()


@dataclass(frozen=True, slots=True)
class Plan:
    """The playback mode and packaging action selected for one upload."""

    mode: str
    package: bool
    reason: str


def resolve_playback_plan(spec, requested, host, config, provider_row) -> Plan:
    """Resolve a provider plan without reading settings, the database, or a network."""
    if _field(spec, "kind", default="storage") == "link":
        return Plan(_link_mode(spec), False, "link_provider")

    request_choice = _choice(requested, allow_none=True)
    policy_choice = _choice(_field(provider_row, "packaging_policy", default="auto"))
    global_enabled = _global_ffmpeg(config)

    choice, source = _effective_choice(request_choice, policy_choice, global_enabled)
    package_target = _supports_package_target(spec)
    raw_supported = _supports_raw(spec)

    if not package_target:
        return _raw_or_refusal(raw_supported, "no_package_target")

    if choice == "never":
        reason = "packaging_disabled" if source != "global" else "ffmpeg_disabled"
        return _raw_or_refusal(raw_supported, reason)

    if _host_can_package(spec, host):
        return Plan("hls", True, "ffmpeg")

    if source == "global" and raw_supported:
        return Plan("raw", False, "host_capability_missing")

    return Plan("refused", False, PROVIDER_REQUIRES_PACKAGING)


def _effective_choice(requested: str | None, policy: str, global_enabled: bool) -> tuple[str, str]:
    """Apply the documented upload, provider, global, then host precedence."""
    if requested in {"always", "never"}:
        return requested, "request"
    if policy in {"always", "never"}:
        return policy, "provider"
    return ("always", "global") if global_enabled else ("never", "global")


def _choice(value: Any, *, allow_none: bool = False) -> str | None:
    if value is None and allow_none:
        return None
    if isinstance(value, bool):
        value = "always" if value else "never"
    value = PACKAGE_ALIASES.get(str(value).lower(), str(value).lower())
    if value not in PACKAGE_CHOICES:
        raise ValueError(f"Unsupported packaging choice: {value!r}")
    return value


def _global_ffmpeg(config: Any) -> bool:
    if isinstance(config, bool):
        return config
    return bool(_field(config, "use_ffmpeg", "useFfmpeg", default=False))


def _host_can_package(spec: Any, host: Any) -> bool:
    if not _truthy(_field(host, "ffmpeg", "ffmpeg_available", "ffmpegAvailable", default=False)):
        return False
    needs = _field(spec, "needs", default=frozenset()) or frozenset()
    for need in needs:
        names = {
            "ffmpeg": ("ffmpeg", "ffmpeg_available", "ffmpegAvailable"),
            "persistent_host": ("persistent_host", "persistentHost"),
        }.get(need, (need,))
        if not _truthy(_field(host, *names, default=False)):
            return False
    return True


def _supports_package_target(spec: Any) -> bool:
    ingest = _field(spec, "ingest", default=None)
    store_package = _field(ingest, "store_package", default=None)
    if store_package is not None:
        return _target_value(store_package)

    direct = _field(spec, "package_target", "packageTarget", default=_MISSING)
    if direct is not _MISSING:
        return _target_value(direct)

    capabilities = _field(spec, "capabilities", default={})
    target = _field(
        capabilities,
        "package_target",
        "packageTarget",
        "supports_packaging",
        "supportsPackaging",
        "packaging",
        "hls",
        default=_MISSING,
    )
    return target is not _MISSING and _target_value(target)


def _supports_raw(spec: Any) -> bool:
    if callable(_field(spec, "raw_stream", default=None)):
        return True

    direct = _field(spec, "raw_playback", "rawPlayback", "supports_raw", "supportsRaw", default=_MISSING)
    if direct is not _MISSING:
        return _truthy(direct)

    capabilities = _field(spec, "capabilities", default={})
    raw = _field(
        capabilities,
        "raw_playback",
        "rawPlayback",
        "supports_raw",
        "supportsRaw",
        "raw",
        default=_MISSING,
    )
    if raw is not _MISSING:
        return _truthy(raw)
    return _field(capabilities, "playback", default="") in {"raw", "provider_managed_or_limited"}


def _link_mode(spec: Any) -> str:
    capabilities = _field(spec, "capabilities", default={})
    playback = _field(spec, "playback", "playback_mode", "playbackMode", default=_MISSING)
    if playback is _MISSING:
        playback = _field(capabilities, "playback", "playback_mode", "playbackMode", default="")
    if str(playback).lower() in {"external", "file", "url"}:
        return "external"
    if _field(spec, "embed_url", "embedUrl", default=None) is not None:
        return "embed"
    if _truthy(_field(capabilities, "external", "external_url", "externalUrl", default=False)):
        return "external"
    return "embed"


def _raw_or_refusal(raw_supported: bool, reason: str) -> Plan:
    if raw_supported:
        return Plan("raw", False, reason)
    return Plan("refused", False, PROVIDER_REQUIRES_PACKAGING)


def _target_value(value: Any) -> bool:
    if isinstance(value, Mapping):
        return _truthy(_field(value, "supported", "available", "enabled", "target", default=False))
    return callable(value) or _truthy(value)


def _truthy(value: Any) -> bool:
    return bool(value)


def _field(source: Any, *names: str, default: Any = _MISSING) -> Any:
    if source is None:
        return default
    for name in names:
        if isinstance(source, Mapping) and name in source:
            return source[name]
        if hasattr(source, name):
            return getattr(source, name)
    return default
