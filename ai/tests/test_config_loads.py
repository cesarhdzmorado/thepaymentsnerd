import unittest
from collections import Counter
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).resolve().parents[2] / "ai" / "config.yml"

REQUIRED_TREND_FIELDS = {
    "name", "weight", "description", "signals",
    "companies_to_watch", "watch_for",
    "last_reviewed", "added", "status",
}

VALID_STATUSES = {"active", "sunsetting", "archived"}


class TestConfigLoads(unittest.TestCase):
    """Sanity tests for ai/config.yml. Cheap, runs fast, catches the dumb failures."""

    @classmethod
    def setUpClass(cls):
        with open(CONFIG_PATH) as f:
            cls.config = yaml.safe_load(f)
        cls.trends = cls.config.get("current_trends", [])

    def test_config_parses(self):
        self.assertIsInstance(self.config, dict)
        self.assertIn("current_trends", self.config)
        self.assertIn("newsletters", self.config)

    def test_at_least_one_trend(self):
        self.assertGreater(len(self.trends), 0, "current_trends must not be empty")

    def test_every_trend_has_required_fields(self):
        for i, trend in enumerate(self.trends):
            missing = REQUIRED_TREND_FIELDS - set(trend.keys())
            self.assertFalse(
                missing,
                f"Trend #{i} ({trend.get('name', '?')}) missing fields: {missing}",
            )

    def test_weights_in_range(self):
        for trend in self.trends:
            w = trend["weight"]
            self.assertIsInstance(w, int, f"Weight must be int: {trend['name']}")
            self.assertGreaterEqual(w, 1, f"Weight < 1: {trend['name']}")
            self.assertLessEqual(w, 10, f"Weight > 10: {trend['name']}")

    def test_no_duplicate_trend_names(self):
        names = [t["name"] for t in self.trends]
        dupes = [n for n, count in Counter(names).items() if count > 1]
        self.assertFalse(dupes, f"Duplicate trend names: {dupes}")

    def test_status_values(self):
        for trend in self.trends:
            self.assertIn(
                trend["status"], VALID_STATUSES,
                f"Trend '{trend['name']}' has invalid status: {trend['status']}",
            )

    def test_signals_are_short_keywords(self):
        """Signals should be short keywords for regex matching, not descriptive sentences."""
        MAX_WORDS = 4
        offenders = []
        for trend in self.trends:
            for signal in trend.get("signals", []):
                if len(signal.split()) > MAX_WORDS:
                    offenders.append(f"{trend['name']!r}: {signal!r}")
        self.assertFalse(
            offenders,
            f"Signals must be ≤{MAX_WORDS} words (will not regex-match well):\n  "
            + "\n  ".join(offenders),
        )

    def test_weight_rubric_caps(self):
        """Weight rubric (header comment in config.yml): max 1 @ weight 10, 3 @ 8, 5 @ 6."""
        weights = [t["weight"] for t in self.trends if t["status"] == "active"]
        self.assertLessEqual(
            sum(1 for w in weights if w == 10), 1,
            "At most 1 trend may be at weight 10 (the rubric cap)",
        )
        self.assertLessEqual(
            sum(1 for w in weights if w >= 8), 3,
            "At most 3 trends may be at weight 8+ (the rubric cap)",
        )

    def test_signals_non_empty(self):
        for trend in self.trends:
            self.assertGreater(
                len(trend.get("signals", [])), 0,
                f"Trend '{trend['name']}' has no signals — won't fire in eval harness",
            )


if __name__ == "__main__":
    unittest.main()
