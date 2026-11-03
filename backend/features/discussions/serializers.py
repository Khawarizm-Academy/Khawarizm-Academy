"""Private-safe discussion payloads and Markdown sanitization."""

from __future__ import annotations

import html
import re
from typing import Any

from features.common.serializers import compact

_HTML_TAG = re.compile(r"<!--.*?-->|</?[A-Za-z][^>]*>", re.DOTALL)
_MARKDOWN_LINK = re.compile(r"(!?\[[^\]]*\])\(([^)\s]+)(?:\s+[^)]*)?\)")


def sanitize_markdown(value: str | None) -> str:
    """Keep plain Markdown while removing HTML, image attachments, and URL sinks."""
    value = html.unescape(value or "")
    value = _HTML_TAG.sub("", value)

    def link_replacement(match: re.Match[str]) -> str:
        label, target = match.groups()
        if label.startswith("!"):
            return ""
        if re.match(r"https://", target, re.IGNORECASE):
            return match.group(0)
        return label

    return _MARKDOWN_LINK.sub(link_replacement, value).strip()


def _author_payload(user: Any) -> dict[str, Any]:
    """Expose public profile fields only; author email never crosses this boundary."""
    name = (getattr(user, "full_name", "") or "").strip() or "عضو في الدورة"
    return compact(
        id=str(user.pk),
        name=name,
        avatarUrl=getattr(user, "avatar_url", ""),
    )


def post_payload(row: Any, *, accepted_id: Any = None) -> dict[str, Any]:
    return {
        "id": str(row.pk),
        "threadId": str(row.thread_id),
        "body": sanitize_markdown(row.body),
        "isInstructorAnswer": bool(row.is_instructor_answer),
        "isAccepted": accepted_id is not None and row.pk == accepted_id,
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
        "author": _author_payload(row.author),
    }


def thread_payload(row: Any, *, include_posts: bool = True) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": str(row.pk),
        "courseId": str(row.course_id),
        "courseSlug": row.course.slug if getattr(row, "course", None) else "",
        "courseTitle": row.course.title if getattr(row, "course", None) else "",
        "lessonId": row.lesson.lesson_id if getattr(row, "lesson", None) else None,
        "lessonTitle": row.lesson.title if getattr(row, "lesson", None) else None,
        "title": row.title,
        "body": sanitize_markdown(row.body),
        "status": row.status,
        "pinned": bool(row.pinned),
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
        "author": _author_payload(row.author),
    }
    if include_posts:
        payload["posts"] = [post_payload(post, accepted_id=row.accepted_post_id) for post in row.posts.all()]
    return compact(**payload)
