import json
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from ai.src.theme_intelligence import (
    build_evidence_records,
    compile_theme_audit,
    load_evidence_files,
    match_themes,
    write_evidence_artifact,
)


CONFIG = {
    "source_ranking": {"tiers": [], "default_tier": 3},
    "current_trends": [
        {
            "name": "Merchant Acquiring",
            "weight": 7,
            "signals": ["merchant acquiring", "payment orchestration"],
        },
        {
            "name": "Stablecoins",
            "weight": 8,
            "signals": ["stablecoin", "deposit token"],
        },
    ],
}


class TestThemeIntelligence(unittest.TestCase):
    def test_build_records_preserves_unmatched_observations(self):
        observations = [
            {
                "feed_url": "https://feed.example/rss",
                "feed_title": "Payments Wire",
                "title": "Processor launches payment orchestration service",
                "source_url": "https://example.com/orchestration",
                "summary": "A new merchant routing product.",
                "published": "Sun, 01 Nov 2026 08:00:00 GMT",
            },
            {
                "feed_url": "https://feed.example/rss",
                "feed_title": "Payments Wire",
                "title": "Unrelated fintech office opens",
                "source_url": "https://example.com/office",
                "summary": "No configured signal appears here.",
                "published": "Sun, 01 Nov 2026 08:00:00 GMT",
            },
        ]
        rows = build_evidence_records(
            observations,
            CONFIG,
            observed_at=datetime(2026, 11, 1, tzinfo=timezone.utc),
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["theme_matches"][0]["name"], "Merchant Acquiring")
        self.assertEqual(rows[1]["theme_matches"], [])

    def test_match_uses_phrase_boundaries(self):
        record = {"title": "Stablecoin settlement expands", "summary": ""}
        self.assertEqual(match_themes(record, CONFIG["current_trends"])[0]["name"], "Stablecoins")

    def test_repeated_reporting_becomes_one_canonical_event(self):
        observations = [
            {
                "feed_url": "https://one.example/rss",
                "feed_title": "One",
                "title": "Stripe launches payment orchestration product",
                "source_url": "https://one.example/stripe-launch",
                "summary": "Stripe launches merchant routing controls.",
                "published": "Sun, 01 Nov 2026 08:00:00 GMT",
            },
            {
                "feed_url": "https://two.example/rss",
                "feed_title": "Two",
                "title": "Stripe launches new orchestration platform",
                "source_url": "https://two.example/stripe-launch",
                "summary": "Stripe launches merchant routing controls.",
                "published": "Sun, 01 Nov 2026 08:05:00 GMT",
            },
        ]
        rows = build_evidence_records(
            observations,
            CONFIG,
            observed_at=datetime(2026, 11, 1, tzinfo=timezone.utc),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(rows[0]["source_candidates"]), 2)

    def test_artifact_round_trip_deduplicates_by_event_key(self):
        row = {
            "event_key": "abc",
            "publication_date": "2026-11-01",
            "title": "Example",
            "summary": "",
            "source_url": "https://example.com",
            "source_tier": 2,
            "entities": {"companies": [], "event_types": []},
        }
        with tempfile.TemporaryDirectory() as directory:
            path = write_evidence_artifact([row, row], Path(directory) / "evidence.json")
            loaded = load_evidence_files([path])
        self.assertEqual(loaded, [row])

    def test_audit_separates_structural_importance_from_momentum(self):
        records = [
            {
                "event_key": "one",
                "publication_date": "2026-10-31",
                "title": "Merchant acquiring margins tighten",
                "summary": "Payment orchestration expands.",
                "source_url": "https://one.example/story",
                "source_tier": 1,
                "entities": {"companies": ["adyen"], "event_types": []},
            },
            {
                "event_key": "two",
                "publication_date": "2026-10-30",
                "title": "Payment orchestration adoption grows",
                "summary": "Merchant acquiring competition rises.",
                "source_url": "https://two.example/story",
                "source_tier": 2,
                "entities": {"companies": ["stripe"], "event_types": []},
            },
        ]
        audit = compile_theme_audit(CONFIG, records, as_of=date(2026, 11, 1))
        acquiring = audit["themes"][0]
        self.assertEqual(acquiring["structural_importance"], 7)
        self.assertGreater(acquiring["momentum"], 50)
        self.assertGreater(acquiring["confidence"], 0)
        self.assertEqual(audit["unmatched_events"], 0)


if __name__ == "__main__":
    unittest.main()
