# Dev image — Django plus the ingest toolchain (FFmpeg, compiler bits) in the box.
# Code, .env* profile files, and the SQLite db ride the compose bind mount —
# never baked in, so edits and data updates need no rebuild.
# Downloads use BuildKit cache mounts: a rebuild re-downloads nothing the host
# already fetched. The full runbook and the low-wifi modes live in DOCKER.md.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ffmpeg powers the HLS packaging (the one thing this image adds that a bare
# venv never had locally); gcc + python3-dev compile TgCrypto (no cp314 wheel);
# curl serves the compose healthcheck. The archives cache mount keeps a rebuild
# offline: apt re-fetches only metadata, never a package it already holds.
RUN --mount=type=cache,target=/var/cache/apt/archives,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg gcc python3-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
# The pip cache mount keeps every wheel + sdist on the host across builds, so
# unchanged requirements re-install from the cache — only brand-new pins hit PyPI.
RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    pip install -r /tmp/requirements.txt

WORKDIR /app
EXPOSE 8000
