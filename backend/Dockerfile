# Dev image - Django + the full ingest toolchain in one box.
# Code, .env.* profile files, and the SQLite db are NOT baked in: they arrive
# via the compose bind mount, so edits, config, and data never need a rebuild.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg powers the HLS packaging (the one thing this image adds that a bare
# venv never had locally); gcc + python3-dev compile TgCrypto (no cp314 wheel);
# curl serves the compose healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg gcc python3-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

WORKDIR /app
EXPOSE 8000
