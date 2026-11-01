import unittest

from ai.scripts.theme_compiler import (
    apply_approved_proposals,
    attach_dynamic_state,
    backtest_config,
    validate_trends,
)


def trend(name="Merchant Acquiring", weight=7):
    return {
        "name": name,
        "weight": weight,
        "description": "A specific payments market thesis.",
        "signals": ["merchant acquiring"],
        "companies_to_watch": ["Adyen"],
        "watch_for": "Pricing and margins.",
        "last_reviewed": "2026-10-27",
        "added": "2026-04-26",
        "status": "active",
    }


class TestThemeCompiler(unittest.TestCase):
    def test_reweight_requires_critic_approval_and_two_evidence_events(self):
        config = {"trend_radar": {}, "current_trends": [trend()]}
        proposal = {
            "proposals": [{
                "id": "p1",
                "action": "reweight",
                "target": "Merchant Acquiring",
                "rationale": "Economics became more material.",
                "evidence_event_keys": ["one", "two"],
                "changes": {"weight": 8},
            }]
        }
        candidate, applied = apply_approved_proposals(
            config,
            proposal,
            {"approved_ids": ["p1"]},
            {"one", "two"},
            as_of="2026-11-01",
        )
        self.assertEqual(candidate["current_trends"][0]["weight"], 8)
        self.assertEqual(candidate["current_trends"][0]["last_reviewed"], "2026-11-01")
        self.assertEqual([item["id"] for item in applied], ["p1"])

    def test_unapproved_change_is_not_applied(self):
        config = {"trend_radar": {}, "current_trends": [trend()]}
        proposal = {"proposals": [{
            "id": "p1", "action": "archive", "target": "Merchant Acquiring",
            "evidence_event_keys": ["one", "two"], "changes": {"status": "archived"},
        }]}
        candidate, applied = apply_approved_proposals(
            config, proposal, {"approved_ids": []}, {"one", "two"}, as_of="2026-11-01"
        )
        self.assertEqual(candidate["current_trends"][0]["status"], "active")
        self.assertEqual(applied, [])

    def test_dynamic_state_does_not_replace_structural_weight(self):
        config = {"current_trends": [trend(weight=7)]}
        audit = {"themes": [{
            "name": "Merchant Acquiring", "momentum": 91,
            "confidence": 75, "effective_priority": 9,
        }]}
        attach_dynamic_state(config, audit)
        item = config["current_trends"][0]
        self.assertEqual(item["weight"], 7)
        self.assertEqual(item["effective_priority"], 9)

    def test_validator_blocks_weight_inflation(self):
        trends = [trend("A", 10), trend("B", 10)]
        self.assertIn("more than one active weight-10 trend", validate_trends(trends))

    def test_backtest_reports_coverage_delta(self):
        config = {"current_trends": [trend()]}
        candidate = {"current_trends": [trend()]}
        candidate["current_trends"][0]["signals"] = ["merchant acquiring", "new rail"]
        records = [{
            "event_key": "one", "publication_date": "2026-11-01",
            "title": "A new rail launches", "summary": "", "source_url": "https://example.com",
        }]
        result = backtest_config(config, candidate, records)
        self.assertEqual(result["unmatched_before"], 1)
        self.assertEqual(result["unmatched_after"], 0)
        self.assertEqual(result["coverage_delta"], 1)


if __name__ == "__main__":
    unittest.main()
