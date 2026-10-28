"""Structured logging: one JSON object per line, request id everywhere.

The middleware (`config.middleware.RequestIDMiddleware` /
`RequestMetricsMiddleware`) owns the request id and the per-request metrics;
this module owns the shape of every log line and the filter that decorates
records with the request context.
"""

from __future__ import annotations

import contextvars
import json
import logging
import time
from datetime import UTC, datetime

# The per-request identity: set at the edge, read by the log filter. Contextvars
# are safe across the async runserver threads and the ingest worker alike.
_request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
_user_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default="")

# Log lines never carry secrets or request bodies (be-observability §2): the
# formatter whitelists fields, so nothing sensitive can leak by accident.
_FIELDS = (
    "ts",
    "level",
    "msg",
    "logger",
    "request_id",
    "user_id",
    "path",
    "status",
    "duration_ms",
    "db_ms",
    "queries",
)


def set_request_id(request_id: str) -> contextvars.Token:
    """Bind the request id for the current context; returns the reset token."""
    return _request_id_ctx.set(request_id)


def reset_request_id(token: contextvars.Token) -> None:
    _request_id_ctx.reset(token)


def reset_user_id(token: contextvars.Token) -> None:
    _user_id_ctx.reset(token)


def set_user_id(user_id: str) -> contextvars.Token:
    """Bind the (optional) acting user id; empty means anonymous."""
    return _user_id_ctx.set(user_id)


def current_request_id() -> str:
    return _request_id_ctx.get()


class RequestContextFilter(logging.Filter):
    """Decorate every record with the request context (empty when absent)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get()
        record.user_id = _user_id_ctx.get()
        return True


class JsonConsoleFormatter(logging.Formatter):
    """One JSON object per line: ts, level, msg, logger + request context."""

    def format(self, record: logging.LogRecord) -> str:
        line = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "msg": record.getMessage(),
            "logger": record.name,
        }
        for name in ("request_id", "user_id", "path", "status", "duration_ms", "db_ms", "queries"):
            value = getattr(record, name, None)
            if value not in (None, ""):
                line[name] = value
        if record.exc_info:
            line["exc"] = self.formatException(record.exc_info)
        return json.dumps(line, ensure_ascii=False)


# Loggers whose chatter only drowns the JSON line (dev runserver already logs
# each request through our metrics middleware; pyrogram logs protocol noise).
NOISY_LOGGERS: dict[str, str] = {
    "django.server": "WARNING",
    "django.db.backends": "WARNING",
    "pyrogram": "WARNING",
}


def build_logging_config(debug: bool, *, formatter: str = "json_console") -> dict:
    """The LOGGING dict: JSON console for everything, one level to rule them all."""
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"request_context": {"()": RequestContextFilter}},
        "formatters": {"json_console": {"()": JsonConsoleFormatter}},
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "filters": ["request_context"],
                "formatter": formatter,
                "stream": "ext://sys.stdout",
            }
        },
        "root": {"handlers": ["console"], "level": "DEBUG" if debug else "INFO"},
        "loggers": {name: {"level": level} for name, level in NOISY_LOGGERS.items()},
    }
    return config


# The request-metrics thresholds (seconds / query count) above which the
# middleware escalates to WARNING — the N+1 tripwire for everything the
# catalog/query-health phases fix. Named here so tests and settings agree.
SLOW_DB_SECONDS = 0.3
MANY_QUERIES = 25


class QueryCounter:
    """Counts queries and DB time inside `connection.execute_wrapper`."""

    def __init__(self) -> None:
        self.queries = 0
        self.db_seconds = 0.0

    def __call__(self, execute, sql, params, many, context):
        start = time.perf_counter()
        try:
            return execute(sql, params, many, context)
        finally:
            self.queries += 1
            self.db_seconds += time.perf_counter() - start
