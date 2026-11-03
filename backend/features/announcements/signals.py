"""Signals emitted by announcements without coupling to a notification backend."""

from django.dispatch import Signal

on_announcement_created = Signal()
"""Sent after commit with ``announcement``, ``course``, and ``actor`` kwargs."""
