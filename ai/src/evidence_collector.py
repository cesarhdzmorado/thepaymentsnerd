"""In-process capture of the RSS observations already fetched by the researcher.

The newsletter agent calls ``rss_tool`` for discovery. Recording those entries here
avoids a second network pass and, critically, preserves observations that never make
the published top five.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, Iterable, List


_observations: Dict[str, dict] = {}


def clear_observations() -> None:
    _observations.clear()


def record_rss_entries(
    feed_url: str,
    entries: Iterable[dict],
    *,
    feed_title: str = "",
) -> None:
    """Record normalized RSS metadata without retaining full article bodies."""
    for entry in entries:
        url = str(entry.get("link", "") or "").strip()
        title = str(entry.get("title", "") or "").strip()
        if not url and not title:
            continue
        key = url or f"{feed_url}::{title.lower()}"
        _observations[key] = {
            "feed_url": feed_url,
            "feed_title": feed_title,
            "title": title,
            "source_url": url,
            "summary": str(entry.get("summary", "") or "").strip(),
            "published": str(entry.get("published", "") or entry.get("updated", "") or "").strip(),
        }


def get_observations() -> List[dict]:
    return deepcopy(list(_observations.values()))
