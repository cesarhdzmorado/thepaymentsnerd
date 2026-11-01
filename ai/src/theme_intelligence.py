"""Evidence retention and deterministic analysis for the theme compiler."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from supabase import create_client

from .tools import (
    _extract_entities,
    _normalize_url,
    consolidate_story_sources,
    source_authority_tier,
)


STOPWORDS = {
    "about", "after", "again", "against", "could", "from", "have", "into",
    "more", "new", "over", "payments", "payment", "says", "than", "that",
    "their", "this", "through", "under", "with", "will", "would",
}


def _clean_html(value: str, limit: int = 1200) -> str:
    return BeautifulSoup(value or "", "lxml").get_text(" ", strip=True)[:limit]


def _publication_date(value: str, fallback: date) -> str:
    if value:
        try:
            return parsedate_to_datetime(value).date().isoformat()
        except (TypeError, ValueError, OverflowError):
            pass
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except (TypeError, ValueError):
            pass
    return fallback.isoformat()


def _event_key(url: str, title: str) -> str:
    stable = _normalize_url(url) or re.sub(r"\W+", " ", title.lower()).strip()
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def _signal_matches(text: str, signals: Sequence[str]) -> List[str]:
    lowered = text.lower()
    matches = []
    for signal in signals or []:
        phrase = str(signal).strip().lower()
        if phrase and re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", lowered):
            matches.append(signal)
    return matches


def match_themes(record: dict, trends: Sequence[dict]) -> List[dict]:
    text = f"{record.get('title', '')} {record.get('summary', '')}"
    matched = []
    for trend in trends:
        signals = _signal_matches(text, trend.get("signals", []))
        if signals:
            matched.append({"name": trend["name"], "signals": signals})
    return matched


def build_evidence_records(
    observations: Sequence[dict],
    config: dict,
    *,
    researched_candidates: Sequence[dict] | None = None,
    published_news: Sequence[dict] | None = None,
    observed_at: datetime | None = None,
) -> List[dict]:
    """Turn raw RSS observations into private, auditable market evidence rows."""
    observed_at = observed_at or datetime.now(timezone.utc)
    researched_candidates = researched_candidates or []
    published_news = published_news or []
    by_url = {
        _normalize_url(item.get("source_url", "")): item
        for item in researched_candidates
        if _normalize_url(item.get("source_url", ""))
    }
    published_urls = {
        _normalize_url(item.get("source_url", "") or (item.get("source") or {}).get("url", ""))
        for item in published_news
    }
    trends = config.get("current_trends", [])
    candidates = [
        {
            **observation,
            "body": _clean_html(str(observation.get("summary", "") or "")),
            "source_name": str(observation.get("feed_title", "") or ""),
            "final_score": 0,
        }
        for observation in observations
    ]
    canonical_observations, _ = consolidate_story_sources(
        candidates, ranking=config.get("source_ranking")
    )
    records = []
    for observation in canonical_observations:
        title = str(observation.get("title", "") or "").strip()
        url = str(observation.get("source_url", "") or "").strip()
        summary = _clean_html(str(observation.get("summary", "") or ""))
        normalized_url = _normalize_url(url)
        researched = by_url.get(normalized_url, {})
        combined = f"{title} {summary}"
        entities = _extract_entities(combined)
        record = {
            "event_key": _event_key(url, title),
            "observed_at": observed_at.isoformat(),
            "publication_date": _publication_date(
                str(observation.get("published", "") or ""), observed_at.date()
            ),
            "title": title,
            "summary": summary,
            "source_url": url,
            "source_name": str(researched.get("source_name") or observation.get("feed_title") or ""),
            "feed_url": str(observation.get("feed_url", "") or ""),
            "source_candidates": list(observation.get("source_candidates", []) or []),
            "source_tier": source_authority_tier(
                {"source_url": url}, config.get("source_ranking")
            ),
            "entities": {
                "companies": sorted(entities.get("companies", set())),
                "event_types": sorted(entities.get("events", set())),
            },
            "theme_matches": [],
            "researched": bool(researched),
            "published": normalized_url in published_urls,
            "research_score": float(researched.get("final_score", 0) or 0),
            "research_gate": str(researched.get("gate", "") or ""),
        }
        record["theme_matches"] = match_themes(record, trends)
        records.append(record)
    return records


def write_evidence_artifact(records: Sequence[dict], path: str | Path) -> Path:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(list(records), indent=2) + "\n", encoding="utf-8")
    return output


def persist_evidence_records(records: Sequence[dict], *, strict: bool = False) -> int:
    """Upsert evidence into the private Supabase ledger when configured."""
    if not records:
        return 0
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        if strict:
            raise RuntimeError("Supabase credentials are required for evidence persistence")
        print("⚠️ Theme evidence was written locally; Supabase credentials are unavailable")
        return 0
    try:
        client = create_client(url, key)
        client.table("theme_evidence").upsert(
            list(records), on_conflict="event_key"
        ).execute()
        return len(records)
    except Exception as exc:
        if strict:
            raise
        print(f"⚠️ Theme evidence persistence unavailable: {exc}")
        return 0


def load_evidence_from_supabase(days: int = 90) -> List[dict]:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Supabase credentials are required to compile themes")
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    client = create_client(url, key)
    rows = []
    page_size = 1000
    for offset in range(0, 100_000, page_size):
        response = (
            client.table("theme_evidence")
            .select("*")
            .gte("publication_date", cutoff)
            .order("publication_date", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        page = list(response.data or [])
        rows.extend(page)
        if len(page) < page_size:
            break
    return rows


def load_evidence_files(paths: Iterable[str | Path]) -> List[dict]:
    by_key: Dict[str, dict] = {}
    for raw_path in paths:
        payload = json.loads(Path(raw_path).read_text(encoding="utf-8"))
        for row in payload:
            by_key[row["event_key"]] = row
    return list(by_key.values())


def canonicalize_evidence_records(
    records: Sequence[dict], ranking: dict | None = None
) -> List[dict]:
    """Collapse cross-run source rewrites into one canonical market event."""
    candidates = [
        {
            **record,
            "body": record.get("summary", ""),
            "final_score": record.get("research_score", 0),
        }
        for record in records
    ]
    canonical, _ = consolidate_story_sources(candidates, ranking=ranking)
    by_url = {
        _normalize_url(record.get("source_url", "")): record
        for record in records
        if _normalize_url(record.get("source_url", ""))
    }
    output = []
    for winner in canonical:
        original = dict(by_url.get(_normalize_url(winner.get("source_url", "")), winner))
        original["source_candidates"] = winner.get("source_candidates", [])
        output.append(original)
    return output


def _event_weight(record: dict) -> float:
    tier = int(record.get("source_tier", 3) or 3)
    return {1: 1.0, 2: 0.75, 3: 0.45}.get(tier, 0.35)


def _tokens(record: dict) -> set[str]:
    text = f"{record.get('title', '')} {record.get('summary', '')}".lower()
    return {
        token for token in re.findall(r"[a-z0-9][a-z0-9.-]+", text)
        if len(token) > 3 and token not in STOPWORDS
    }


def _cluster_unmatched(records: Sequence[dict], minimum_size: int = 2) -> List[dict]:
    clusters: List[List[dict]] = []
    for record in records:
        record_tokens = _tokens(record)
        best_index = None
        best_score = 0.0
        for index, cluster in enumerate(clusters):
            cluster_tokens = set().union(*(_tokens(item) for item in cluster))
            union = record_tokens | cluster_tokens
            score = len(record_tokens & cluster_tokens) / len(union) if union else 0.0
            if score > best_score:
                best_index, best_score = index, score
        if best_index is not None and best_score >= 0.16:
            clusters[best_index].append(record)
        else:
            clusters.append([record])

    output = []
    for cluster in clusters:
        if len(cluster) < minimum_size:
            continue
        common = Counter(token for item in cluster for token in _tokens(item))
        output.append({
            "label_terms": [token for token, _ in common.most_common(6)],
            "event_count": len(cluster),
            "source_count": len({
                source.get("url", "")
                for item in cluster
                for source in (item.get("source_candidates") or [{"url": item.get("source_url", "")}])
                if source.get("url")
            }),
            "event_keys": [item["event_key"] for item in cluster],
            "examples": [item.get("title", "") for item in cluster[:5]],
        })
    return sorted(output, key=lambda item: (-item["event_count"], -item["source_count"]))


def compile_theme_audit(config: dict, records: Sequence[dict], *, as_of: date | None = None) -> dict:
    as_of = as_of or date.today()
    recent_cutoff = as_of - timedelta(days=7)
    previous_cutoff = as_of - timedelta(days=14)
    audits = []
    matched_keys = set()
    for trend in config.get("current_trends", []):
        matching = []
        for record in records:
            matches = match_themes(record, [trend])
            if matches:
                matching.append(record)
                matched_keys.add(record["event_key"])
        recent = [row for row in matching if date.fromisoformat(row["publication_date"]) >= recent_cutoff]
        previous = [
            row for row in matching
            if previous_cutoff <= date.fromisoformat(row["publication_date"]) < recent_cutoff
        ]
        recent_weight = sum(_event_weight(row) for row in recent)
        previous_weight = sum(_event_weight(row) for row in previous)
        if not matching:
            momentum = 0
        else:
            acceleration = (recent_weight - previous_weight) / (recent_weight + previous_weight + 1.0)
            momentum = round(max(0, min(100, 50 + 35 * acceleration + 15 * min(recent_weight / 4, 1))))
        domains = {urlparse(row.get("source_url", "")).netloc for row in matching if row.get("source_url")}
        companies = {
            company
            for row in matching
            for company in (row.get("entities") or {}).get("companies", [])
        }
        authority = (
            sum(_event_weight(row) for row in matching) / len(matching)
            if matching else 0
        )
        confidence = round(100 * (
            0.4 * authority
            + 0.2 * min(len(domains) / 3, 1)
            + 0.2 * min(len(companies) / 3, 1)
            + 0.2 * min(len(matching) / 5, 1)
        )) if matching else 0
        delta = 0
        if confidence >= 40:
            if momentum >= 85:
                delta = 2
            elif momentum >= 70:
                delta = 1
            elif momentum <= 20:
                delta = -1
        effective_priority = max(1, min(10, int(trend["weight"]) + delta))
        audits.append({
            "name": trend["name"],
            "structural_importance": trend["weight"],
            "momentum": momentum,
            "confidence": confidence,
            "effective_priority": effective_priority,
            "events_7d": len(recent),
            "events_previous_7d": len(previous),
            "events_total": len(matching),
            "source_breadth": len(domains),
            "company_breadth": len(companies),
            "event_keys": [row["event_key"] for row in matching[:20]],
        })
    unmatched = [row for row in records if row["event_key"] not in matched_keys]
    return {
        "as_of": as_of.isoformat(),
        "lookback_events": len(records),
        "matched_events": len(records) - len(unmatched),
        "unmatched_events": len(unmatched),
        "themes": audits,
        "emerging_clusters": _cluster_unmatched(unmatched),
    }
