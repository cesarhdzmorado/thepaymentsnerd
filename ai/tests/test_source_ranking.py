import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.tools import (
    consolidate_story_sources,
    source_authority_tier,
    source_conflict_errors,
    unverified_output_errors,
    validate_canonical_sources,
)


class TestSourceRanking(unittest.TestCase):
    def test_release_gate_rejects_unverified_editorial_caveat(self):
        stories = [{
            "title": "Bank fine remains unverified",
            "body": "The article text was not supplied for verification.",
        }]
        self.assertTrue(unverified_output_errors(stories))

    def test_release_gate_allows_attributed_uncertainty(self):
        stories = [{
            "title": "Visa applies for domestic clearing approval",
            "body": "The regulator has not announced a commercial launch date.",
        }]
        self.assertEqual(unverified_output_errors(stories), [])

    def setUp(self):
        self.banking_dive = {
            "title": "BofA Hit With $1.21B OCC Fine for Lapses in AML Transaction Monitoring",
            "body": "Bank of America was fined $1.21 billion by the OCC for AML failures.",
            "source_name": "Banking Dive",
            "source_url": "https://www.bankingdive.com/news/bofa-fined-1-21-billion/832915/",
            "final_score": 24,
        }
        self.ft = {
            "title": "Bank of America fined $1.2bn over money laundering failures",
            "body": (
                "The US Treasury action combined penalties involving FinCEN, the OCC and OFAC "
                "after more than $5bn in suspicious transactions went unreported."
            ),
            "source_name": "Financial Times",
            "source_url": "https://www.ft.com/content/bofa-money-laundering-fine",
            "final_score": 22,
        }

    def test_bofa_regression_prefers_ft_over_trade_press(self):
        stories, decisions = consolidate_story_sources([self.banking_dive, self.ft])

        self.assertEqual(len(stories), 1)
        self.assertEqual(stories[0]["source_name"], "Financial Times")
        self.assertIn("FinCEN", stories[0]["body"])
        self.assertEqual(decisions[0]["rejected"][0]["name"], "Banking Dive")
        self.assertEqual(source_conflict_errors(decisions), [])
        self.assertTrue(decisions[0]["resolved_lower_tier_conflicts"])

    def test_source_choice_is_independent_of_feed_order(self):
        forward, _ = consolidate_story_sources([self.banking_dive, self.ft])
        reverse, _ = consolidate_story_sources([self.ft, self.banking_dive])

        self.assertEqual(forward[0]["source_url"], reverse[0]["source_url"])
        self.assertEqual(forward[0]["source_url"], self.ft["source_url"])

    def test_official_source_beats_ft(self):
        official = dict(self.ft)
        official.update({
            "source_name": "Office of the Comptroller of the Currency",
            "source_url": "https://www.occ.gov/news-issuances/news-releases/2026/example.html",
        })

        stories, _ = consolidate_story_sources([self.ft, official])

        self.assertEqual(source_authority_tier(stories[0]), 0)
        self.assertEqual(stories[0]["source_name"], "Office of the Comptroller of the Currency")

    def test_specialist_exclusive_is_not_suppressed(self):
        exclusive = {
            "title": "Regional PSP launches instant-settlement API",
            "body": "A regional payments provider launched a new instant-settlement API.",
            "source_name": "Finextra",
            "source_url": "https://www.finextra.com/newsarticle/12345/example",
        }

        stories, decisions = consolidate_story_sources([exclusive])

        self.assertEqual(stories, [dict(exclusive, source_candidates=[{
            "name": "Finextra",
            "url": exclusive["source_url"],
            "tier": 2,
        }])])
        self.assertEqual(decisions, [])

    def test_distinct_events_about_same_company_remain_separate(self):
        product_story = {
            "title": "Bank of America launches a real-time payments API",
            "body": "Bank of America launched a new treasury API for corporate clients.",
            "source_name": "Financial Times",
            "source_url": "https://www.ft.com/content/bofa-api",
        }

        stories, _ = consolidate_story_sources([self.ft, product_story])

        self.assertEqual(len(stories), 2)

    def test_attached_source_candidates_are_ranked_with_their_own_facts(self):
        story = dict(self.banking_dive)
        story["source_candidates"] = [
            {
                "name": "Financial Times",
                "url": self.ft["source_url"],
                "title": self.ft["title"],
                "summary": self.ft["body"],
            }
        ]

        stories, _ = consolidate_story_sources([story])

        self.assertEqual(stories[0]["source_name"], "Financial Times")
        self.assertEqual(stories[0]["title"], self.ft["title"])
        self.assertIn("OFAC", stories[0]["body"])

    def test_release_gate_rejects_writer_source_substitution(self):
        canonical, _ = consolidate_story_sources([self.banking_dive, self.ft])
        final_news = [{
            "title": "BofA enforcement action",
            "body": "Summary",
            "source": {
                "name": "Banking Dive",
                "url": self.banking_dive["source_url"],
            },
        }]

        errors = validate_canonical_sources(final_news, canonical)

        self.assertEqual(len(errors), 1)
        self.assertIn("Non-canonical source", errors[0])

    def test_same_tier_material_conflict_blocks_release(self):
        reuters = dict(self.ft)
        reuters.update({
            "title": "Bank of America faces $900mn money-laundering penalty",
            "body": "The OCC imposed a $900 million penalty on Bank of America.",
            "source_name": "Reuters",
            "source_url": "https://www.reuters.com/business/finance/bofa-penalty-2026-10-13/",
        })

        _, decisions = consolidate_story_sources([self.ft, reuters])
        errors = source_conflict_errors(decisions)

        self.assertTrue(errors)
        self.assertIn("Conflicting headline amounts", errors[0])


if __name__ == "__main__":
    unittest.main()
