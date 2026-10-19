# Deploy the API on a host with a real, persistent disk (Railway, Render, Fly,
# any Docker platform) so SQLite stays a single durable file — no database
# server required. Mount a volume at /data and the file survives restarts.
#
#   docker build -t khawarizm-api .
#   docker run -p 8000:8000 -v khawarizm-data:/data \
#     -e DJANGO_ENV=production -e DJANGO_SECRET_KEY=<a-long-random-string> \
#     -e DJANGO_ALLOWED_HOSTS=<your-host> \
#     khawarizm-api
#
# On these hosts Vercel's per-instance read-only bundle does not apply, and
# SQLITE_PATH pins the database to the mounted volume.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_ENV=production \
    SQLITE_PATH=/data/db.sqlite3

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Migrate on boot (creates the file on first run), then serve with gunicorn.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 60"]
