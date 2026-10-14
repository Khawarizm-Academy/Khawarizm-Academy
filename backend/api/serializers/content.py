"""Chamber and flexible-content serializers."""

from __future__ import annotations

from typing import Any

from academy.models import (
    ArenaLeader,
    ArenaLanguage,
    ClassroomCodeLine,
    ClassroomMessage,
    DashboardContentBlock,
    ScholarshipCheck,
    WorkspaceLesson,
)


def workspace_lesson(row: WorkspaceLesson) -> dict[str, Any]:
    return {
        "id": row.lesson_id,
        "title": row.title,
        "duration": row.duration,
        "isCompleted": row.is_completed,
    }


def classroom_message(row: ClassroomMessage) -> dict[str, Any]:
    payload = {
        "id": row.message_id,
        "sender": row.sender,
        "text": row.text,
        "time": row.time,
    }
    if row.is_instructor:
        payload["isInstructor"] = True
    return payload


def classroom_code_line(row: ClassroomCodeLine) -> dict[str, Any]:
    return {"tone": row.tone, "indent": row.indent, "text": row.text}


def arena_language(row: ArenaLanguage) -> dict[str, Any]:
    return {"id": row.lang_id, "label": row.label}


def arena_leader(row: ArenaLeader) -> dict[str, Any]:
    return {"name": row.name, "score": row.score, "tone": row.tone}


def scholarship_check(row: ScholarshipCheck) -> dict[str, Any]:
    payload: dict[str, Any] = {"kind": row.kind}
    if row.icon:
        payload["icon"] = row.icon
    if row.label:
        payload["label"] = row.label
    if row.status:
        payload["status"] = row.status
    return payload


def content_block_payload(key: str) -> Any:
    """Return the raw camelCase payload stored for a content block."""
    block = DashboardContentBlock.objects.filter(key=key).first()
    return block.payload if block else None
