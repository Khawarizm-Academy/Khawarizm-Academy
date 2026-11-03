"""Phase 13 §13.2 — p95 latency tripwire against the dev SQLite database.

Runs the routes the plan names (catalog, course detail, playback grant, quiz
start, studio course list, roster) and prints p50/p95 server time. The numbers
are a regression tripwire, not a promise: warm public GETs target < 50 ms,
authenticated reads < 150 ms, writes < 250 ms.

    python -m scripts.p95_latency                 # 30 samples per route
    python -m scripts.p95_latency --samples 60

Everything runs in-process against the REAL dev database (the plan's budget is
"SQLite dev with the seed"). Each sample executes inside a transaction that is
rolled back, so fixtures this script needs — a ready asset on the sample lesson,
a published quiz — never survive the run. A route that cannot answer 2xx even
with its fixture is reported as `blocked` with the API's own reason instead of
being silently counted as passing.
"""

from __future__ import annotations

import argparse
import os
import statistics
import sys
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.conf import settings  # noqa: E402
from django.db import transaction  # noqa: E402
from django.urls import reverse  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

# The in-process test client talks to `testserver`; this script only ever runs
# locally, so that host is allowed for the duration of the run.
settings.ALLOWED_HOSTS = [*settings.ALLOWED_HOSTS, "testserver"]

from features.auth.models import User  # noqa: E402
from features.auth.services import open_session  # noqa: E402
from features.courses.models import Course  # noqa: E402
from features.quizzes.models import Quiz  # noqa: E402
from features.videohosting.models import VideoAsset  # noqa: E402

TARGETS = {"public": 50.0, "read": 150.0, "write": 250.0}
ALLOWED_ORIGIN = "http://localhost:5173"
# The playback route needs an entitled caller; `videos.watch_any` is the rule
# that never depends on enrollment rows the dev seed may or may not have.
STUDENT_EMAIL = "parity@example.com"
INSTRUCTOR_EMAIL = "ahmad.q@example.com"
VIDEO_WATCHER_EMAIL = "admin@khawarizm.dev"


class FakeRequest:
    """The only slice of a request the session service reads."""

    META = {"HTTP_USER_AGENT": "p95-latency-script", "REMOTE_ADDR": "127.0.0.1"}


@dataclass
class Sample:
    label: str
    bucket: str
    method: str
    url: str
    token: str = ""
    body: dict = field(default_factory=dict)
    # Called inside the rolled-back transaction to create whatever row the route
    # needs. Returns a note shown in the report, or raises to skip the sample.
    prepare: Callable[[], str] | None = None
    # Called after every accepted iteration so each sample times the same branch
    # (a second quiz start would otherwise return the live attempt).
    reset: Callable[[], None] | None = None
    # Throttle ceiling for this route (`SCOPED_RATES`): sampling past it measures
    # the throttle, not the endpoint. 0 means "no cap".
    throttle_per_minute: int = 0


@dataclass
class Result:
    label: str
    bucket: str
    p50: float
    p95: float
    status: int
    note: str = ""
    blocked: bool = False
    fixture: str = ""

    @property
    def target(self) -> float:
        return TARGETS[self.bucket]

    @property
    def within_budget(self) -> bool:
        return self.p95 <= self.target


# Opening a session signs the user's other devices out (single-device rule), so
# the probe remembers what it displaced and puts it back on the way out.
_probe_sessions: list = []
_displaced_sessions: list = []


def _token_for(email: str) -> str:
    from features.auth.models import UserSession

    user = User.objects.filter(email=email).first()
    if user is None:
        raise SystemExit(f"dev database has no {email!r} — run `manage.py seed_demo` first")
    _displaced_sessions.extend(UserSession.objects.filter(user=user, is_active=True))
    session, access, _refresh = open_session(user, FakeRequest(), "p95")
    _probe_sessions.append(session.pk)
    return access


def _close_probe_sessions() -> None:
    from features.auth.models import UserSession
    from features.common.choices import SessionRevokeReason

    UserSession.objects.filter(pk__in=_probe_sessions).update(
        is_active=False, revoked_reason=SessionRevokeReason.EXPIRED
    )
    UserSession.objects.filter(pk__in=[session.pk for session in _displaced_sessions]).update(
        is_active=True, revoked_reason=""
    )


def _attach_ready_asset(lesson, watcher_id) -> str:
    """Give the sample lesson a ready asset so the grant path is what we time."""
    asset = VideoAsset.objects.create(
        slug=f"p95-{uuid.uuid4().hex[:12]}",
        status="ready",
        playback_mode="hls",
        created_by_id=watcher_id,
    )
    lesson.video_asset = asset
    lesson.save(update_fields=["video_asset", "updated_at"])
    return f"temp asset {asset.slug}"


def _prepare_quiz_start(sample: Sample, course, student_id) -> str:
    """A temp quiz + enrollment so the *fresh start* path is what we time.

    Reusing a seeded quiz would measure the "attempt already exists" branch, and
    a seeded learner may already have used their attempts. Every row is created
    inside the caller's transaction and rolled back.
    """
    from features.dashboard.models import Enrollment
    from features.quizzes.models import Attempt, Option, Question

    quiz = Quiz.objects.create(title="p95 probe quiz", course=course, kind="practice", is_published=True, order=999)
    question = Question.objects.create(quiz=quiz, kind="single", prompt="1 + 1 = ?", order=0)
    Option.objects.create(question=question, label="2", is_correct=True, order=0)
    Option.objects.create(question=question, label="3", order=1)
    Enrollment.objects.get_or_create(user_id=student_id, course=course)
    sample.url = reverse("quiz-attempt-start", kwargs={"quiz_id": str(quiz.pk)})
    sample.reset = lambda: Attempt.objects.filter(quiz_id=quiz.pk).delete()
    return f"temp quiz {quiz.pk} + enrollment"


def _build_samples() -> list[Sample]:
    course = Course.objects.filter(status="published").first()
    if course is None:
        raise SystemExit("dev database has no published course — run `manage.py seed_demo` first")
    student = _token_for(STUDENT_EMAIL)
    student_id = User.objects.get(email=STUDENT_EMAIL).pk
    instructor = _token_for(INSTRUCTOR_EMAIL)
    watcher = _token_for(VIDEO_WATCHER_EMAIL)
    watcher_id = User.objects.get(email=VIDEO_WATCHER_EMAIL).pk
    slug = course.slug
    module = course.modules.first()
    lesson = module.lessons.first() if module else None

    samples = [
        Sample("catalog (20 items)", "public", "GET", f"{reverse('catalog-list')}?page_size=20"),
        Sample("course detail", "public", "GET", reverse("course-detail", kwargs={"slug": slug})),
        Sample("roster (dashboard enrolled)", "read", "GET", reverse("dashboard-enrolled"), token=student),
        Sample("studio course list", "read", "GET", reverse("studio-courses"), token=instructor),
    ]

    if lesson is not None:
        samples.append(
            Sample(
                "playback grant",
                "read",
                "POST",
                reverse("lesson-playback", kwargs={"slug": slug, "lesson_id": lesson.lesson_id}),
                token=watcher,
                prepare=lambda: _attach_ready_asset(lesson, watcher_id),
            )
        )

    quiz_sample = Sample(
        "quiz start (write)",
        "write",
        "POST",
        # The URL is filled in by `prepare`, once the fixture quiz has a pk.
        url="",
        token=student,
        # `QUIZ_ATTEMPT_RATE` is 30/min; stay under it so the sample times the
        # service layer instead of the throttle.
        throttle_per_minute=30,
    )
    quiz_sample.prepare = lambda: _prepare_quiz_start(quiz_sample, course, student_id)
    samples.append(quiz_sample)
    return samples


def _measure(sample: Sample, iterations: int) -> Result:
    """Time one route, resetting the throttle once if the load itself trips it.

    Sampling above a route's scoped-throttle rate measures the throttle, so the
    harness caps the loop there; a 429 that still happens (shared cache, another
    test run) clears the throttle store and takes the sample once more.
    """
    if sample.throttle_per_minute:
        iterations = min(iterations, sample.throttle_per_minute - 5)
    result = _measure_once(sample, iterations)
    if result.blocked and result.status == 429:
        from django.core.cache import cache

        cache.clear()
        result = _measure_once(sample, iterations)
        result.note = (result.note + " [throttle reset]").strip()
    return result


def _measure_once(sample: Sample, iterations: int) -> Result:
    from django.core.cache import cache

    cache.clear()
    client = APIClient(headers={"origin": ALLOWED_ORIGIN})
    if sample.token:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {sample.token}")
    times: list[float] = []
    status = 0
    note = ""
    fixture = ""
    with transaction.atomic():
        if sample.prepare is not None:
            try:
                fixture = sample.prepare() or ""
            except Exception as exc:  # a missing fixture is a skip, never a crash
                transaction.set_rollback(True)
                return Result(sample.label, sample.bucket, 0.0, 0.0, 0, note=f"fixture failed: {exc}", blocked=True)
        if not sample.url:
            transaction.set_rollback(True)
            return Result(sample.label, sample.bucket, 0.0, 0.0, 0, note="no url", blocked=True)
        for _ in range(iterations):
            start = time.perf_counter()
            if sample.method == "POST":
                response = client.post(sample.url, data=sample.body or {}, format="json")
            else:
                response = client.get(sample.url)
            elapsed_ms = (time.perf_counter() - start) * 1000
            status = response.status_code
            if status >= 400:
                body = response.json() if response["Content-Type"].startswith("application/json") else {}
                note = str(body.get("detail", "")) or str(body.get("code", ""))
                transaction.set_rollback(True)
                return Result(sample.label, sample.bucket, 0.0, 0.0, status, note=note, blocked=True, fixture=fixture)
            times.append(elapsed_ms)
            if sample.reset is not None:
                sample.reset()
        times = times[1:]  # the first accepted sample warms the caches
        # Nothing this script wrote may survive the measurement.
        transaction.set_rollback(True)
    if len(times) < 3:
        return Result(sample.label, sample.bucket, 0.0, 0.0, status, note="not enough samples", blocked=True)
    times.sort()
    return Result(
        sample.label,
        sample.bucket,
        p50=round(statistics.median(times), 1),
        p95=round(times[max(0, int(len(times) * 0.95) - 1)], 1),
        status=status,
        fixture=fixture,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Measure p95 server time on the plan's budgeted routes.")
    parser.add_argument("--samples", type=int, default=30, help="iterations per route (default 30)")
    args = parser.parse_args(argv)

    try:
        results = [_measure(sample, args.samples) for sample in _build_samples()]
    finally:
        _close_probe_sessions()

    print(f"{'route':26} {'bucket':7} {'p50':>8} {'p95':>8} {'target':>8}  result")
    failures = 0
    for result in results:
        if result.blocked:
            verdict = f"blocked {result.status} — {result.note}"
        else:
            failures += 0 if result.within_budget else 1
            verdict = "ok" if result.within_budget else f"OVER BUDGET (target {result.target:.0f} ms)"
        if result.fixture and not result.blocked:
            verdict += f"  [{result.fixture}]"
        p50 = f"{result.p50:7.1f}ms" if not result.blocked else "—"
        p95 = f"{result.p95:7.1f}ms" if not result.blocked else "—"
        print(f"{result.label:26} {result.bucket:7} {p50:>8} {p95:>8} {result.target:7.0f}ms  {verdict}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
