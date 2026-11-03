"""Private-safe announcement payloads and Markdown sanitization."""

from __future__ import annotations

import html
import re
from typing import Any

from features.common.serializers import compact

_HTML_TAG = re.compile(r"<!--.*?-->|</?[A-Za-z][^>]*>", re.DOTALL)
_MARKDOWN_LINK = re.compile(r"(!?\[[^\]]*\])\(([^)\s]+)(?:\s+[^)]*)?\)")


def sanitize_markdown(value: str | None) -> str:
    """Keep Markdown text while removing raw HTML and non-HTTPS link sinks.

    The client applies the same allow-list when rendering. Sanitizing at the
    API boundary means every response is safe for clients that display the
    Markdown as text or pass it to a renderer of their own.
    """
    value = html.unescape(value or "")
    value = _HTML_TAG.sub("", value)

    def link_replacement(match: re.Match[str]) -> str:
        label, target = match.groups()
        if re.match(r"https://", target, re.IGNORECASE):
            return match.group(0)
        return label if not label.startswith("!") else ""

    return _MARKDOWN_LINK.sub(link_replacement, value).strip()


def _author_payload(user: Any) -> dict[str, Any]:
    """Expose only public profile fields; never expose an author email."""
    name = getattr(user, "full_name", "") or ""
    if not name:
        name = "فريق الدورة"
    return compact(id=str(user.pk), name=name, avatarUrl=getattr(user, "avatar_url", ""))


def announcement_payload(row: Any) -> dict[str, Any]:
    """The shared Studio/learner contract, with sanitized Markdown in ``body``."""
    return {
        "id": str(row.pk),
        "courseId": str(row.course_id),
        "title": row.title,
        "body": sanitize_markdown(row.body),
        "pinned": bool(row.pinned),
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
        "author": _author_payload(row.author),
    }
