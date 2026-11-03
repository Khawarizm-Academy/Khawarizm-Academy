"""Signals/hooks for live-session side effects.

Phase 10 emits a stable event contract; Phase 11 can connect notification
fan-out without coupling the course API to dashboard storage.
"""

from __future__ import annotations

from typing import Any

from django.dispatch import Signal

live_session_changed = Signal()


def emit_live_session_hook(session: Any, action: str) -> None:
    """Emit after a successful API mutation; listeners must enqueue, not block."""
    live_session_changed.send(
        sender=session.__class__,
        session=session,
        action=action,
        course=session.course,
    )
