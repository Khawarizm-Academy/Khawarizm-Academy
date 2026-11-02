# Provider contract <- the one place a hosting provider is defined.
# One record per host, defined in its own provider module. A spec answers
# everything the rest of the app asks — identity for the registry, ingest
# hooks for the pipeline, staged checks for diagnostics, and the segment
# redirect for the public control plane — so no other module ever branches
# on a provider code. Adding a provider = one module in providers/ + one
# SPECS entry in providers/__init__.py.
from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from ipaddress import AddressValueError, IPv4Address, IPv6Address
from typing import Any
from urllib.parse import SplitResult, urlsplit, urlunsplit


class ProviderUploadError(RuntimeError):
    """A provider upload operation failed without exposing provider secrets."""


class ProviderUploadUnavailable(ProviderUploadError):
    """The provider cannot currently authenticate or accept an upload."""


@dataclass(frozen=True, slots=True)
class ProviderUploadStart:
    """Server-side state returned when a provider upload session is opened."""

    upload_uri: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ProviderUploadState:
    """Authoritative provider state after probing or writing a chunk."""

    next_offset: int
    file_id: str = ""
    complete: bool = False


@dataclass(frozen=True, slots=True)
class ProviderUploadCompletion:
    """Provider-specific completion changes and optional asynchronous work."""

    asset_updates: dict[str, Any] = field(default_factory=dict)
    session_status: str = "complete"
    session_progress: int = 100
    background: Callable[[], None] | None = None


UploadStart = Callable[[str, str, int, str], ProviderUploadStart]
UploadProbe = Callable[[Any], ProviderUploadState]
UploadWrite = Callable[[Any, bytes, int], ProviderUploadState]
UploadComplete = Callable[[Any, Any, Any], ProviderUploadCompletion]
UploadCancel = Callable[[Any], None]
UploadSpoolReady = Callable[[], bool]
DownloadSource = Callable[[Any, str], None]


def _upload_ready() -> bool:
    return True


@dataclass(frozen=True, slots=True)
class ProviderUpload:
    """The data-driven upload protocol exposed by a storage provider.

    Hooks receive the upload session as opaque application state. The Studio
    handlers enforce authentication, quota, offsets, magic sniffing, and
    response shaping; providers only implement their transport mechanics here.
    """

    start_session: UploadStart | None = None
    probe_offset: UploadProbe | None = None
    write_chunk: UploadWrite | None = None
    complete: UploadComplete | None = None
    cancel: UploadCancel | None = None
    spool_ready: UploadSpoolReady = _upload_ready
    download_source: DownloadSource | None = None


SEVERITY_OK = "info"  # the check passed
SEVERITY_WARN = "warn"  # degraded but not blocking (e.g. no stream bot)
SEVERITY_ERROR = "error"  # blocking — this provider or the pipeline cannot serve

type Reference = tuple[str, str, str]
MAX_REFERENCE_LENGTH = 500
HOSTNAME_CHARS = frozenset("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-")


def _split_https_url(value: str, allowed_hosts: frozenset[str]) -> SplitResult | None:
    """Parse an ASCII HTTPS URL without accepting ambiguous authority syntax."""
    if not isinstance(value, str) or not value or len(value) > MAX_REFERENCE_LENGTH:
        return None
    if not value.isascii() or any(character.isspace() or ord(character) < 32 for character in value):
        return None
    if "\\" in value:
        return None
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    host = parsed.hostname
    if parsed.scheme.lower() != "https" or not host or parsed.username or parsed.password or port is not None:
        return None
    host = host.lower()
    if host not in allowed_hosts or parsed.netloc.lower() != host:
        return None
    if not parsed.path.startswith("/"):
        return None
    return parsed


def _canonical_url(parsed: SplitResult) -> str:
    """Normalize scheme and host while preserving the provider-owned path/query."""
    return urlunsplit(("https", parsed.hostname.lower(), parsed.path, parsed.query, ""))


def _is_public_hostname(host: str) -> bool:
    """Reject literal and reserved local hosts before an external URL is stored."""
    if not host or host.endswith(".") or host == "localhost" or host.endswith(".localhost"):
        return False
    if not host.isascii() or "xn--" in host.lower() or any(character not in HOSTNAME_CHARS for character in host):
        return False
    labels = host.split(".")
    if any(not label or label.startswith("-") or label.endswith("-") for label in labels):
        return False
    for address_type in (IPv4Address, IPv6Address):
        try:
            address_type(host)
        except AddressValueError:
            continue
        return False
    return True


@dataclass
class Check:
    """One named validation with the reason and the fix when it fails."""

    id: str
    label: str
    ok: bool
    detail: str
    # Only failing checks carry severity; "warn" never fails the overall verdict.
    severity: str = SEVERITY_ERROR

    def payload(self, hints: dict[str, str]) -> dict[str, Any]:
        hint = "" if self.ok else hints.get(self.id, "")
        severity = SEVERITY_OK if self.ok else self.severity
        return {
            "id": self.id,
            "label": self.label,
            "ok": self.ok,
            "severity": severity,
            "detail": self.detail,
            "hint": hint,
        }


def check(cid: str, label: str, ok: bool, detail: str, severity: str = SEVERITY_ERROR) -> Check:
    """Build one Check — a passing check is always info-severity."""
    return Check(id=cid, label=label, ok=ok, detail=detail, severity=severity)


@dataclass
class CheckGroup:
    """A provider or the pipeline, with its staged checks."""

    id: str
    label: str
    provider: str  # "" for the pipeline group
    checks: list[Check] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        """No error-severity check is failing."""
        return not any(c.severity == SEVERITY_ERROR and not c.ok for c in self.checks)

    def payload(self, hints: dict[str, str]) -> dict[str, Any]:
        blocking = [c for c in self.checks if not c.ok and c.severity == SEVERITY_ERROR]
        warnings = [c for c in self.checks if not c.ok and c.severity == SEVERITY_WARN]
        return {
            "id": self.id,
            "label": self.label,
            "provider": self.provider,
            "ok": not blocking,
            "warningCount": len(warnings),
            "checks": [c.payload(hints) for c in self.checks],
        }


def blocking_checks(checks: list[Check]) -> list[Check]:
    """The failing checks that make their group unavailable."""
    return [c for c in checks if not c.ok and c.severity == SEVERITY_ERROR]


def first_reason(checks: list[Check]) -> str:
    """The first blocking check as one Arabic sentence for the select tooltip."""
    blocking = blocking_checks(checks)
    if not blocking:
        return ""
    first = blocking[0]
    return f"{first.label}: {first.detail}"


def _identity(path: str) -> str:
    """The do-nothing redirect — a provider whose stored paths are already URLs."""
    return path


# A provider's staged checks: shallow (offline env) and deep (live API probes),
# built here so diagnostics can ask any spec without branching on its code.
EnvChecks = Callable[[], list[Check]]
DeepChecks = Callable[[], list[Check]]


def _none_checks() -> list[Check]:
    return []


@dataclass(frozen=True)
class ProviderIngest:
    """The provider's network legs of an ingest — every ORM write stays out.

    `store_source` keeps the original file retrievable and returns its row
    fields; `store_package` exists only for providers that can publish a
    packaged HLS ladder (staged-only providers leave it None). The spans say
    what share of the admin progress bar each leg reports into.
    """

    store_source: Callable[..., Awaitable[dict[str, Any]]]
    store_package: Callable[..., Awaitable[list[dict[str, Any]]]] | None = None
    source_span: tuple[int, int] = (0, 50)
    publish_span: tuple[int, int] = (75, 99)


@dataclass(frozen=True)
class ProviderSpec:
    """A hosting provider: identity, ingest hooks, diagnostics, stream redirect."""

    code: str
    name: str
    is_enabled: bool
    is_default: bool
    capabilities: dict[str, object] = field(default_factory=dict)
    ingest: ProviderIngest | None = None
    env_checks: EnvChecks = _none_checks
    deep_checks: DeepChecks = _none_checks
    hints: dict[str, str] = field(default_factory=dict)
    # The public control plane's one redirect per segment — where a stored
    # file path becomes the URL the player actually fetches bytes from.
    segment_redirect: Callable[[str], str] = _identity
    # Optional callable that refreshes a stored file_id into a current file_path;
    # identity by default means the file_id itself can be used directly.
    file_path_refresher: Callable[[str], str] = _identity
    # Raw-serving leg for un-packaged assets: (file_id, range_header) →
    # (status, byte_iterator, headers). None means raw mode is unsupported.
    raw_stream: Callable[[str, str], tuple[int, Any, dict[str, str]]] | None = None
    kind: str = "storage"
    needs: frozenset[str] = frozenset()
    parse_reference: Callable[[str], Reference | None] | None = None
    embed_url: Callable[[str], str] | None = None
    delete_remote: Callable[[Any], None] | None = None
    upload: ProviderUpload | None = None

    def row_defaults(self) -> dict[str, object]:
        """The VideoProvider column values this spec always enforces."""
        return {
            "name": self.name,
            "is_enabled": self.is_enabled,
            "is_default": self.is_default,
            "capabilities": self.capabilities,
        }

    def check_group(self, deep: bool) -> CheckGroup:
        """The provider's staged diagnostics group, shallow by default."""
        group = CheckGroup(id=self.code, label=self.name, provider=self.code, checks=self.env_checks())
        if deep:
            group.checks.extend(self.deep_checks())
        return group

    def available(self, deep: bool = False) -> bool:
        """Selectable when none of its blocking checks fail."""
        return not blocking_checks(self.check_group(deep).checks)

    def reason(self) -> str:
        """Why the provider is not selectable, or "" when it is."""
        return first_reason(self.env_checks())
