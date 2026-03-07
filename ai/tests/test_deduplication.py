import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.tools import (
    _calculate_similarity,
    _normalize_url,
    _story_source_url,
    deduplicate_stories,
    filter_against_history,
)


class TestDeduplicationEngine(unittest.TestCase):
    def test_calculate_similarity_ignores_case_and_punctuation(self):
        text1 = "Visa launches new B2B payment API!!!"
        text2 = "visa launches new b2b payment api"
        self.assertEqual(_calculate_similarity(text1, text2), 1.0)

    def test_deduplicate_stories_removes_semantic_duplicate(self):
        stories = [
            {"title": "Stripe launches card product", "summary": "New issuing tools for startups."},
            {"title": "Stripe launches card product!", "summary": "New issuing tools for startups"},
            {"title": "PayPal expands in Europe", "summary": "New local partnerships."},
        ]

        deduped = deduplicate_stories(stories, similarity_threshold=0.7)
        self.assertEqual(len(deduped), 2)

    def test_filter_against_history_detects_normalized_url_match(self):
        historical = [
            {
                "title": "Brex raises new funding",
                "source_url": "https://www.example.com/news/brex-funding?utm_source=foo",
            }
        ]
        new = [
            {
                "title": "Brex secures funding round",
                "source": {"url": "http://example.com/news/brex-funding#section"},
            }
        ]

        filtered, removed = filter_against_history(new, historical)

        self.assertEqual(filtered, [])
        self.assertEqual(len(removed), 1)
        self.assertIn("Same source URL", removed[0]["reason"])

    def test_story_source_url_supports_nested_source(self):
        story = {"source": {"url": "https://payments.example/story"}}
        self.assertEqual(_story_source_url(story), "https://payments.example/story")

    def test_normalize_url_strips_protocol_www_query_fragment(self):
        url = "https://www.example.com/path/to/story/?utm=abc#headline"
        self.assertEqual(_normalize_url(url), "example.com/path/to/story")


if __name__ == "__main__":
    unittest.main()
