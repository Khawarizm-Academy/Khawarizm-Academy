"""Small helpers to keep list responses simple and serializable."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaginatedResponse:
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate(items: list, page: int, page_size: int) -> PaginatedResponse:
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10
    total = len(items)
    total_pages = (total + page_size - 1) // page_size if total else 0
    start = (page - 1) * page_size
    end = start + page_size
    return PaginatedResponse(
        items=items[start:end],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages or 1 if total > 0 else 0,
    )
