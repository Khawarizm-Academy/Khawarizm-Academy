from __future__ import annotations

from typing import Any

from features.common.serializers import compact


def _author(user: Any) -> dict[str, Any]:
    return compact(
        id=str(user.pk),
        name=getattr(user, "full_name", "") or "متعلّم",
        avatarUrl=getattr(user, "avatar_url", ""),
    )


def review_payload(row: Any, *, include_moderation: bool = False) -> dict[str, Any]:
    payload = {
        "id": str(row.pk),
        "courseSlug": row.course.slug,
        "rating": row.rating,
        "title": row.title,
        "body": row.body,
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
        "isHidden": bool(row.is_hidden),
        "author": _author(row.user),
        "reply": compact(
            body=row.reply_body,
            createdAt=row.reply_created_at.isoformat() if row.reply_created_at else None,
            author=_author(row.reply_author) if row.reply_author_id else None,
        ),
    }
    if include_moderation:
        payload["hiddenReason"] = row.hidden_reason
    return payload


def review_page_payload(result: dict[str, Any], *, include_moderation: bool = False) -> dict[str, Any]:
    page = result["page"]
    return {
        "summary": {
            "rating": float(result["average"]) if result["average"] is not None else None,
            "reviewCount": result["total"],
            "distribution": result["distribution"],
        },
        "items": [review_payload(row, include_moderation=include_moderation) for row in result["items"]],
        "page": page.number,
        "pageSize": page.paginator.per_page,
        "totalPages": page.paginator.num_pages,
        "totalResults": page.paginator.count,
        "eligibility": result["eligibility"],
        "ownReview": review_payload(result["own"], include_moderation=True) if result["own"] else None,
    }


def studio_page_payload(result: dict[str, Any]) -> dict[str, Any]:
    page = result["page"]
    return {
        "items": [
            {
                **review_payload(row),
                "courseTitle": row.course.title,
            }
            for row in result["items"]
        ],
        "page": page.number,
        "pageSize": page.paginator.per_page,
        "totalPages": page.paginator.num_pages,
        "totalResults": page.paginator.count,
    }
