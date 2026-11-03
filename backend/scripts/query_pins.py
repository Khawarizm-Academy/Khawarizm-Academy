"""Phase 13 §13.2 — index every `assertNumQueries` pin into `plan/query-pins.md`.

The plan wants the pins "listed in one place" so a reviewer can see the whole
query-budget surface without grepping the test suite. The script reads the test
files (source, not the database), so it is cheap enough to run in CI.

    python -m scripts.query_pins            # print the table
    python -m scripts.query_pins --write    # rewrite plan/query-pins.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# `with self.assertNumQueries(3):  # auth + touch + the device list`
PIN = re.compile(r"assertNumQueries\(\s*(\d+|None)\s*\)\s*:?.*?(?:#\s*(.+))?$")
TEST_DEF = re.compile(r"^\s*def (test_\w+)")
ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent / "plan" / "query-pins.md"

HEADER = """# Query pins (generated)

Every `assertNumQueries` in the backend test suite, in one place. Regenerate
after adding or changing a pin:

    cd backend && python -m scripts.query_pins --write

A pin is a budget: raising one is a review conversation, not a test edit.
"""


def _test_name(lines: list[str], index: int) -> str:
    for line in reversed(lines[: index + 1]):
        match = TEST_DEF.match(line)
        if match:
            return match.group(1)
    return "(module level)"


def collect() -> list[tuple[str, int, str, str, str]]:
    """`(file, line, test, queries, note)` for every pin in the suite."""
    rows: list[tuple[str, int, str, str, str]] = []
    paths = (
        sorted(ROOT.glob("features/**/test*.py"))
        + sorted(ROOT.glob("features/**/tests/*.py"))
        + sorted(ROOT.glob("config/test*.py"))
    )
    for path in dict.fromkeys(paths):  # a file can match two globs; index it once
        lines = path.read_text(encoding="utf-8").splitlines()
        for number, line in enumerate(lines):
            match = PIN.search(line)
            if match is None:
                continue
            rows.append(
                (
                    str(path.relative_to(ROOT)),
                    number + 1,
                    _test_name(lines, number),
                    match.group(1),
                    (match.group(2) or "").strip(),
                )
            )
    return rows


def render(rows: list[tuple[str, int, str, str, str]]) -> str:
    body = [
        HEADER.rstrip(),
        "",
        f"_{len(rows)} pins across the suite._",
        "",
        "| file | line | test | queries | why |",
        "| :--- | ---: | :--- | ---: | :--- |",
    ]
    body += [
        f"| `{file}` | {line} | `{test}` | {queries} | {note or '—'} |" for file, line, test, queries, note in rows
    ]
    return "\n".join(body) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Index the assertNumQueries pins.")
    parser.add_argument("--write", action="store_true", help="write plan/query-pins.md instead of printing it")
    args = parser.parse_args(argv)

    document = render(collect())
    if args.write:
        OUTPUT.write_text(document, encoding="utf-8")
        print(f"query pins written to {OUTPUT}")
    else:
        sys.stdout.write(document)
    return 0


if __name__ == "__main__":
    sys.exit(main())
