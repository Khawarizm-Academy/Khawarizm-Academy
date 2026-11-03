"""Phase 13 §13.1.2 — the denial matrix.

Table-driven straight off `config/route_access.py`: every route the manifest
marks `PERMISSIONED` or `METHOD_SCOPED` is called three ways —

    anonymous            → must be rejected with 401
    a plain student      → the role that lacks the permission → 403
    an administrator     → the role that has it → anything but 401/403

so a route whose decorator was forgotten can never pass silently. Adding an
endpoint to the manifest automatically adds it to this matrix; there is nothing
to hand-write per route.

Object-level ownership (the IDOR half of the plan) is deliberately out of scope
here: the dummy ids below do not exist, so a granted caller is expected to reach
the view and answer 404/400 — the point is only that the *permission layer* no
longer stands in the way.
"""

from __future__ import annotations

import uuid

from django.test import TestCase
from django.urls import reverse

from config import route_access
from features.common.testing import api_client, authenticate, make_admin, make_user

# No request in the matrix may mutate state: DRF evaluates `permission_classes`
# before any handler body runs, so a read on the same path proves exactly what a
# write would about the gate, without touching the database.


def _dummy_kwargs(route: str) -> dict[str, str]:
    """Placeholder converters so `reverse()` can build a URL for an absent row."""
    kwargs: dict[str, str] = {}
    for segment in route.split("/"):
        if not segment.startswith("<"):
            continue
        converter, _, param = segment[1:-1].rpartition(":")
        if converter == "uuid":
            kwargs[param] = str(uuid.uuid4())
        elif converter == "int":
            kwargs[param] = "1"
        else:
            kwargs[param] = "phase13-missing"
    return kwargs


def _matrix() -> list[tuple[str, str, tuple[str, ...]]]:
    """`(url_name, method, permission_keys)` for every guarded route."""
    rows: list[tuple[str, str, tuple[str, ...]]] = []
    for name in sorted(route_access.PERMISSIONED):
        rows.append((name, "GET", route_access.PERMISSIONED[name]))
    for name in sorted(route_access.METHOD_SCOPED):
        rows.append((name, "GET", (f"<method-scoped:{_route_for(name)}>",)))
    return rows


def _route_for(url_name: str) -> str:
    from django.urls import get_resolver

    from config.tests import _walk_api_urls

    for name, route in _walk_api_urls(get_resolver().url_patterns):
        if name == url_name:
            return route
    raise AssertionError(f"{url_name} is in the manifest but not in the resolver")


class DenialMatrixTests(TestCase):
    """Anonymous 401 / unauthorized 403 / authorized passes the permission gate."""

    def _url(self, name: str) -> str:
        return reverse(name, kwargs=_dummy_kwargs(_route_for(name)))

    def test_anonymous_callers_are_rejected_on_every_guarded_route(self):
        client = api_client()
        failures: list[str] = []
        for name, method, _keys in _matrix():
            response = client.generic(method, self._url(name))
            if response.status_code != 401:
                failures.append(f"{name} [{method}] -> {response.status_code}, expected 401")
        self.assertEqual(failures, [])

    def test_a_student_is_forbidden_on_every_guarded_route(self):
        # `student` is the default role and holds none of the catalog keys the
        # matrix guards, so it stands in for "a role lacking only that permission".
        client = api_client()
        authenticate(client, make_user(email="matrix-student@example.com"))
        failures: list[str] = []
        for name, method, keys in _matrix():
            response = client.generic(method, self._url(name))
            if response.status_code != 403:
                failures.append(
                    f"{name} [{method}] required {keys or 'a method permission'} "
                    f"-> {response.status_code}, expected 403"
                )
        self.assertEqual(failures, [])

    def test_a_granted_role_reaches_the_view(self):
        client = api_client()
        authenticate(client, make_admin(email="matrix-admin@example.com"))
        failures: list[str] = []
        for name, method, _keys in _matrix():
            response = client.generic(method, self._url(name))
            if response.status_code in (401, 403):
                failures.append(
                    f"{name} [{method}] -> {response.status_code}; an administrator must clear the permission gate"
                )
        self.assertEqual(failures, [])

    def test_matrix_covers_the_whole_guarded_surface(self):
        guarded = set(route_access.PERMISSIONED) | set(route_access.METHOD_SCOPED)
        covered = {name for name, _method, _keys in _matrix()}
        self.assertEqual(sorted(guarded - covered), [])
        self.assertEqual(len(_matrix()), len(guarded))
