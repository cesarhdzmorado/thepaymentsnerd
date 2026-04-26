"""Eval harness for ai/config.yml trend changes.

Reads the last N days of web/public/newsletter.json snapshots from git
history. For each newsletter, regex-matches story text against trend
signals under both old and new config files. Prints a delta table showing
which trends fire more or less under the new config.

Usage:
    # Compare current working tree vs main (no backup file needed):
    python ai/scripts/trend_diff.py --old git:main --new ai/config.yml

    # Compare against a backup file:
    python ai/scripts/trend_diff.py --old /tmp/config-before-edit.yml --new ai/config.yml

    # Custom history window:
    python ai/scripts/trend_diff.py --old git:main --new ai/config.yml --days 60

A trend "fires" for a newsletter if at least one of its signals appears
in the news/perspective/whats_hot text. Counts are newsletters-where-fired,
not total signal matches.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import yaml

CONFIG_REF_PREFIX = "git:"
NEWSLETTER_PATH = "web/public/newsletter.json"


def load_trends(config_spec: str) -> list[dict]:
    """Load current_trends from either a file path or a git:<ref> spec."""
    if config_spec.startswith(CONFIG_REF_PREFIX):
        ref = config_spec[len(CONFIG_REF_PREFIX):]
        result = subprocess.run(
            ["git", "show", f"{ref}:ai/config.yml"],
            capture_output=True,
            text=True,
            check=True,
        )
        config = yaml.safe_load(result.stdout)
    else:
        with open(config_spec) as f:
            config = yaml.safe_load(f)
    return config.get("current_trends", [])


def get_newsletter_snapshots(days: int) -> list[tuple[str, dict]]:
    """Return (commit_sha, newsletter_dict) for the last `days` days. Skips bad parses."""
    log = subprocess.run(
        ["git", "log", f"--since={days}.days.ago", "--format=%H", "--", NEWSLETTER_PATH],
        capture_output=True,
        text=True,
        check=True,
    )
    commits = [c for c in log.stdout.strip().split("\n") if c]

    snapshots = []
    for commit in commits:
        try:
            show = subprocess.run(
                ["git", "show", f"{commit}:{NEWSLETTER_PATH}"],
                capture_output=True,
                text=True,
                check=True,
            )
            snapshots.append((commit, json.loads(show.stdout)))
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue
    return snapshots


def extract_text(newsletter: dict) -> str:
    """Concatenate searchable story/perspective/whats_hot text, lowercased."""
    parts = []
    for story in newsletter.get("news", []) or []:
        parts.append(story.get("title", "") or "")
        parts.append(story.get("body", "") or "")
    parts.append(newsletter.get("perspective", "") or "")
    for hot in newsletter.get("whats_hot", []) or []:
        parts.append(hot.get("description", "") or "")
        parts.append(hot.get("company", "") or "")
    return " ".join(parts).lower()


def trend_fired(text: str, signals: list[str]) -> bool:
    """True if at least one signal appears as a whole-word match in text."""
    for signal in signals:
        pattern = re.escape(signal.lower())
        if re.search(rf"\b{pattern}\b", text):
            return True
    return False


def tally(snapshots: list[tuple[str, dict]], trends: list[dict]) -> tuple[dict, int]:
    """Return ({trend_name: fire_count}, n_snapshots_with_zero_matches)."""
    totals: dict[str, int] = defaultdict(int)
    zero_match = 0
    for _, nl in snapshots:
        text = extract_text(nl)
        any_fired = False
        for trend in trends:
            if trend_fired(text, trend.get("signals", []) or []):
                totals[trend.get("name", "Unknown")] += 1
                any_fired = True
        if not any_fired:
            zero_match += 1
    return dict(totals), zero_match


def print_table(old_tot: dict, new_tot: dict, n: int) -> None:
    all_names = set(old_tot) | set(new_tot)
    rows = []
    for name in all_names:
        o = old_tot.get(name, 0)
        nu = new_tot.get(name, 0)
        rows.append((name, o, nu, nu - o))
    rows.sort(key=lambda r: -abs(r[3]))

    print(f"\n## Trend-fire diff over {n} newsletters\n")
    print(f"{'TREND':<55} | {'OLD':>5} | {'NEW':>5} | {'DELTA':>6}")
    print("-" * 82)
    for name, o, nu, d in rows:
        if name not in old_tot and nu > 0:
            label = f"➕ NEW: {name}"
        elif name not in new_tot and o > 0:
            label = f"➖ REMOVED: {name}"
        else:
            label = name
        sign = f"+{d}" if d > 0 else str(d)
        print(f"{label[:55]:<55} | {o:>5} | {nu:>5} | {sign:>6}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Trend diff: old vs new config.yml")
    parser.add_argument("--old", required=True,
                        help="Old config: path/to/config.yml or git:<ref>")
    parser.add_argument("--new", required=True,
                        help="New config: path/to/config.yml or git:<ref>")
    parser.add_argument("--days", type=int, default=30,
                        help="Days of newsletter history (default 30)")
    args = parser.parse_args()

    old_trends = load_trends(args.old)
    new_trends = load_trends(args.new)

    print(f"Old config: {len(old_trends)} trends from {args.old}", file=sys.stderr)
    print(f"New config: {len(new_trends)} trends from {args.new}", file=sys.stderr)
    print(f"Loading newsletters from last {args.days} days...", file=sys.stderr)
    snapshots = get_newsletter_snapshots(args.days)
    print(f"Loaded {len(snapshots)} newsletter snapshots\n", file=sys.stderr)

    if not snapshots:
        print("ERROR: no newsletters found. Run from a git repo with history.",
              file=sys.stderr)
        return 1

    old_tot, old_zero = tally(snapshots, old_trends)
    new_tot, new_zero = tally(snapshots, new_trends)

    print_table(old_tot, new_tot, len(snapshots))

    print("\n## Coverage")
    print(f"Newsletters with zero trend matches under OLD config: "
          f"{old_zero}/{len(snapshots)}")
    print(f"Newsletters with zero trend matches under NEW config: "
          f"{new_zero}/{len(snapshots)}")
    if new_zero > old_zero:
        print(f"⚠️  Coverage dropped by {new_zero - old_zero} newsletters. "
              f"New config may be too narrow.")
    elif new_zero < old_zero:
        print(f"✅ Coverage improved by {old_zero - new_zero} newsletters.")

    print("\nNote: case-insensitive whole-word regex. "
          "A trend fires once per newsletter if any signal matches.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
