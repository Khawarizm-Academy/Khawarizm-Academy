"""Parity compactor — strips volatile keys, keeps everything else.

Rows are recreated between captures, so timestamps and minted-token fields
differ by nature. Payload shape and row identity are what parity means.

Usage: python diff.py <before-dir> <after-dir> [file ...]
"""

import json
import sys
from pathlib import Path

VOLATILE = {
    "createdAt",
    "updatedAt",
    "revokedAt",
    "lastSeenAt",
    "expiresAt",
    "issuedAt",
    "deletedAt",
    "completedAt",
    "joinedAt",
    "appliedAt",
}

# The parity user row is deleted + recreated between captures, so its UUID PK
# shifts with every run; user-scoped payloads legitimately embed it.
USER_SCOPED = VOLATILE | {"id"}


def walk(node, volatile):
    # objects: drop volatile keys; everything else recurses
    if isinstance(node, dict):
        return {k: walk(v, volatile) for k, v in node.items() if k not in volatile}
    if isinstance(node, list):
        return [walk(v, volatile) for v in node]
    return node


def load(path: Path):
    return json.loads(path.read_text()) if path.exists() else None


def main() -> int:
    base, other = Path(sys.argv[1]), Path(sys.argv[2])
    names = sys.argv[3:] or sorted(p.name for p in base.glob("*.json"))
    bad = 0
    for name in names:
        old, new = load(base / name), load(other / name)
        if old is None or new is None:
            missing = name if old is None else f"(missing in {other})"
            print(f"SKIP {name} {missing}")
            continue
        keys = USER_SCOPED if name in {"auth-me.json", "auth-sessions.json", "profile.json"} else VOLATILE
        if walk(old, keys) != walk(new, keys):
            bad += 1
            print(f"DIFF {name}")
        else:
            print(f"OK   {name}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
