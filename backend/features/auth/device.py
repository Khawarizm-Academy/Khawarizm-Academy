"""Parses the request footprint: the OS/browser a session signed in from."""

from __future__ import annotations

from django.http import HttpRequest

from features.common.choices import DeviceType

# (needle in the User-Agent, display name). First hit wins.
_OS = (
    ("windows nt 10", "Windows 10/11"),
    ("windows", "Windows"),
    ("iphone", "iOS"),
    ("ipad", "iPadOS"),
    ("mac os x", "macOS"),
    ("android", "Android"),
    ("cros", "ChromeOS"),
    ("linux", "Linux"),
)

_BROWSERS = (
    ("edg/", "Edge"),
    ("opr/", "Opera"),
    ("chrome/", "Chrome"),
    ("firefox/", "Firefox"),
    ("safari/", "Safari"),
)


def _first(user_agent: str, table: tuple[tuple[str, str], ...], fallback: str) -> str:
    for needle, name in table:
        if needle in user_agent:
            return name
    return fallback


def _device_type(user_agent: str) -> str:
    if "ipad" in user_agent or "tablet" in user_agent:
        return DeviceType.TABLET
    if "mobi" in user_agent or "iphone" in user_agent or "android" in user_agent:
        return DeviceType.MOBILE
    if any(marker in user_agent for marker in ("windows", "mac os", "linux", "cros")):
        return DeviceType.DESKTOP
    return DeviceType.UNKNOWN


def parse_user_agent(raw: str) -> dict[str, str]:
    """Split a User-Agent into os / browser / device_type / device_label."""
    user_agent = (raw or "").lower()
    os_name = _first(user_agent, _OS, "Unknown OS")
    browser = _first(user_agent, _BROWSERS, "Unknown browser")
    return {
        "os": os_name,
        "browser": browser,
        "device_type": _device_type(user_agent),
        "device_label": f"{browser} على {os_name}",
    }


def client_ip(request: HttpRequest) -> str | None:
    """The real client IP, honouring a proxy's X-Forwarded-For."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
