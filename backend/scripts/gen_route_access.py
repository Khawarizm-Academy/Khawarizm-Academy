"""Regenerate `config/route_access.py` from the live URL resolver.

Phase 13 §13.1.1 — run after adding a route or changing a view's
`@permission_classes` decorator. The generated file is checked in so a
diff-reveal is the review surface: any drift fails
`config.tests.RouteAccessManifestTests`.

Usage (from the backend project root):

    python -m scripts.gen_route_access
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

GENERATOR_SNIPPET = r"""
import django, os, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.urls import get_resolver
from features.access.registry import PERMISSIONS

_NAME_TO_KEY = {f"HasPermission_{k.replace('.', '_').replace('-', '_')}": k for k in PERMISSIONS}


def _find_perm_classes(callback):
    seen, stack = set(), [callback]
    while stack:
        node = stack.pop()
        if id(node) in seen:
            continue
        seen.add(id(node))
        perms = getattr(node, 'permission_classes', None)
        if perms:
            return list(perms)
        for attr in ('cls', '__wrapped__', 'view'):
            inner = getattr(node, attr, None)
            if inner is not None and inner is not node:
                stack.append(inner)
    return []


def classify(callback):
    perms = _find_perm_classes(callback)
    if not perms:
        return {'category': 'unknown', 'keys': []}
    names = [getattr(p, '__name__', str(p)) for p in perms]
    if any('AllowAny' in n for n in names):
        return {'category': 'public', 'keys': []}
    keys = []
    for n in names:
        if n in _NAME_TO_KEY:
            keys.append(_NAME_TO_KEY[n])
        elif n.startswith('HasAnyPermission_'):
            # Multi-key views keep their encoded suffix so the manifest is
            # still a stable fingerprint of the decorator set.
            keys.append(n[len('HasAnyPermission_'):])
    if not keys and any(n.startswith('HasMethodPermission_') for n in names):
        return {'category': 'method-scoped', 'keys': []}
    if not keys and any('IsAuthenticated' in n for n in names):
        return {'category': 'authenticated', 'keys': []}
    if keys:
        return {'category': 'permissioned', 'keys': sorted(set(keys))}
    return {'category': 'unclassified', 'keys': []}


result = {}


def walk(patterns, prefix=''):
    for p in patterns:
        if hasattr(p, 'url_patterns'):
            walk(p.url_patterns, prefix + str(p.pattern))
        else:
            name = getattr(p, 'name', None)
            if not name:
                continue
            route = (prefix + str(p.pattern)).rstrip('/') or '/'
            if route.startswith('api/'):
                result[name] = classify(p.callback)


walk(get_resolver().url_patterns)
print(json.dumps(result, ensure_ascii=False))
"""


def _tuple_literal(keys: list[str]) -> str:
    """Render the key tuple the way `ruff format` writes it, so a regeneration
    is byte-identical to the checked-in file and the format gate stays green."""
    inner = ", ".join(f'"{key}"' for key in keys)
    return f"({inner},)" if len(keys) == 1 else f"({inner})"


def _render(routes: dict[str, dict]) -> str:
    buckets: dict[str, list[tuple[str, list[str]]]] = {
        "public": [],
        "authenticated": [],
        "permissioned": [],
        "method-scoped": [],
    }
    for name, entry in routes.items():
        buckets.setdefault(entry["category"], []).append((name, entry["keys"]))

    lines = [
        '"""Phase 13 §13.1.1 — the route-permission manifest.',
        "",
        "Every URL name mounted under `/api/` is classified into exactly one of the four",
        "buckets below. `config.tests.RouteAccessManifestTests` walks `get_resolver()`,",
        "fails when a route is missing from the manifest, and rejects unknown permission",
        "keys. The rule the test enforces is the plan's structural fix: *adding an",
        "endpoint without declaring who may call it breaks CI*.",
        "",
        "The buckets describe the CURRENT view decorators (public=AllowAny / no",
        "decorator, authenticated=IsAuthenticated only, permissioned=a named catalog",
        "key, method-scoped=`permission_for_methods(...)`). Re-run",
        "`python -m scripts.gen_route_access` after adding or re-classifying a route.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "PUBLIC = frozenset(",
        "    {",
    ]
    for name, _ in sorted(buckets["public"]):
        lines.append(f'        "{name}",')
    lines.extend(["    }", ")", "", "AUTHENTICATED = frozenset(", "    {"])
    for name, _ in sorted(buckets["authenticated"]):
        lines.append(f'        "{name}",')
    lines.extend(["    }", ")", "", "PERMISSIONED: dict[str, tuple[str, ...]] = {"])
    for name, keys in sorted(buckets["permissioned"]):
        lines.append(f'    "{name}": {_tuple_literal(keys)},')
    lines.extend(["}", "", "METHOD_SCOPED = frozenset(", "    {"])
    for name, _ in sorted(buckets["method-scoped"]):
        lines.append(f'        "{name}",')
    lines.extend(
        [
            "    }",
            ")",
            "",
            "CLASSIFIED: frozenset[str] = PUBLIC | AUTHENTICATED | frozenset(PERMISSIONED) | METHOD_SCOPED",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    backend_root = os.path.abspath(os.path.join(here, ".."))
    output = subprocess.check_output(
        [sys.executable, "-c", GENERATOR_SNIPPET],
        cwd=backend_root,
        env={**os.environ, "PYTHONPATH": backend_root, "DJANGO_SETTINGS_MODULE": "config.settings"},
        text=True,
    )
    routes = json.loads(output)
    target = os.path.join(backend_root, "config", "route_access.py")
    with open(target, "w", encoding="utf-8") as fh:
        fh.write(_render(routes))
    print(f"Regenerated {target} with {len(routes)} routes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
