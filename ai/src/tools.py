# ai/src/tools.py

# This is the correct import for the stable LangChain environment we built.
from langchain_core.tools import tool
import time
import os
import re
from typing import Dict, Tuple, List, Set, Optional

import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
import feedparser
from openai import OpenAI

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

@tool
def search_tool(query: str) -> str:
    """Performs a web search to find relevant URLs."""
    try:
        cached = _get_cached(("search", query))
        if cached is not None:
            return cached
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=10)]
            output = str(results) if results else "No results found."
            _set_cached(("search", query), output)
            return output
    except Exception as e:
        return f"Error searching: {e}"

@tool
def scrape_tool(url: str) -> str:
    """Scrapes the text content of a single webpage with retry logic."""
    cached = _get_cached(("scrape", url))
    if cached is not None:
        return cached

    # Retry logic for failed scrapes
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = _session.get(url, headers=headers, timeout=10)
            response.raise_for_status()  # Raise error for bad status codes

            soup = BeautifulSoup(response.text, 'lxml')
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
            # Increased from 4000 to 12000 chars to capture full article content
            # 12000 chars ≈ 3000 tokens, prevents losing critical details at end of articles
            output = soup.get_text(strip=True)[:12000]
            _set_cached(("scrape", url), output)
            return output

        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
                continue

    return f"Error scraping {url} after {MAX_RETRIES} attempts: {last_error}"

@tool
def rss_tool(rss_feed_url: str) -> str:
    """Fetches articles from an RSS feed with retry logic for reliability."""
    cached = _get_cached(("rss", rss_feed_url))
    if cached is not None:
        return cached

    # Retry logic for failed feeds
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            feed = feedparser.parse(rss_feed_url)

            # Check if feed parsed successfully
            if hasattr(feed, 'bozo_exception'):
                raise feed.bozo_exception

            # Increased from 10 to 15 entries to capture more stories from high-volume feeds
            # Prevents missing important stories from feeds that publish 20+ articles/day
            entries = _filter_recent_entries(feed.entries, hours=48)[:15]
            if not entries:
                return f"No recent articles found in {rss_feed_url}"

            summaries = [
                # Truncate summary to 1000 chars to prevent runaway RSS feeds that include full article text
                # This prevents token overflow while preserving key information
                f"Title: {e.get('title', 'N/A')}\nLink: {e.get('link', 'N/A')}\nSummary: {BeautifulSoup(e.get('summary', ''), 'lxml').get_text(strip=True)[:1000]}"
                for e in entries
            ]
            output = "\n\n".join(summaries)
            _set_cached(("rss", rss_feed_url), output)
            return output

        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
                continue

    return f"Error reading RSS feed {rss_feed_url} after {MAX_RETRIES} attempts: {last_error}"


_CACHE_TTL_SECONDS = 6 * 60 * 60
_cache: Dict[Tuple[str, str], Tuple[float, str]] = {}
_session = requests.Session()


def _get_cached(key: Tuple[str, str]) -> str | None:
    cached = _cache.get(key)
    if not cached:
        return None
    timestamp, value = cached
    if (time.time() - timestamp) > _CACHE_TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return value


def _set_cached(key: Tuple[str, str], value: str) -> None:
    _cache[key] = (time.time(), value)


def _filter_recent_entries(entries, hours: int) -> list:
    """Filter RSS entries to only include recent ones within specified hours."""
    cutoff = time.time() - (hours * 60 * 60)
    recent = []
    for entry in entries:
        published = entry.get("published_parsed") or entry.get("updated_parsed")
        if published:
            published_ts = time.mktime(published)
            if published_ts >= cutoff:
                recent.append(entry)
    return recent or list(entries)


def _calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two texts using a simple word overlap metric.
    Returns a score between 0 (completely different) and 1 (identical).
    """
    # Simple word-based similarity
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    if not words1 or not words2:
        return 0.0

    intersection = words1.intersection(words2)
    union = words1.union(words2)

    return len(intersection) / len(union) if union else 0.0


# =============================================================================
# HYBRID DEDUPLICATION SYSTEM
# Combines: 1) Entity extraction, 2) Word similarity, 3) Semantic embeddings
# =============================================================================

# Known payments/fintech companies for entity extraction
# This list covers major players; entities not in this list are extracted via pattern matching
KNOWN_COMPANIES = {
    # Card networks & processors
    "visa", "mastercard", "american express", "amex", "discover", "jcb", "unionpay",
    "fiserv", "fis", "global payments", "worldpay", "adyen", "stripe", "square", "block",
    "paypal", "venmo", "braintree", "checkout.com", "mollie", "razorpay", "payu",
    # Banks
    "jpmorgan", "jp morgan", "chase", "bank of america", "wells fargo", "citibank", "citi",
    "capital one", "goldman sachs", "morgan stanley", "hsbc", "barclays", "bnp paribas",
    "deutsche bank", "santander", "ing", "revolut", "monzo", "n26", "chime", "nubank",
    # BNPL
    "klarna", "affirm", "afterpay", "clearpay", "sezzle", "zip", "splitit",
    # Crypto/blockchain
    "coinbase", "binance", "kraken", "circle", "ripple", "chainalysis", "fireblocks",
    # B2B / spend management
    "brex", "ramp", "airbase", "divvy", "coupa", "bill.com", "tipalti", "melio",
    # Infrastructure
    "plaid", "mx", "yodlee", "finicity", "tink", "truelayer", "marqeta", "galileo",
    "synapse", "unit", "treasury prime", "column", "increase", "modern treasury",
    # Other notable
    "apple", "google", "amazon", "meta", "microsoft", "shopify", "toast", "lightspeed",
    "clover", "zettle", "sumup", "paytm", "phonepe", "grab", "gojek", "mercado pago",
}

# Event type patterns for extraction
EVENT_PATTERNS = {
    "acquisition": r"\b(acqui(?:res?|red?|sition)|buy(?:s|ing)?|bought|purchase[sd]?|take(?:s|ing)?\s+over|takeover)\b",
    "merger": r"\b(merg(?:es?|ed?|ing|er)|combin(?:es?|ed?|ing))\b",
    "partnership": r"\b(partner(?:s|ed|ship|ing)?|collaborat(?:es?|ed?|ion|ing)|team(?:s|ed|ing)?\s+(?:up|with)|alliance|joint\s+venture)\b",
    "launch": r"\b(launch(?:es|ed|ing)?|introduc(?:es?|ed?|ing)|unveil(?:s|ed|ing)?|roll(?:s|ed|ing)?\s+out|debut(?:s|ed|ing)?|announce[sd]?\s+(?:new|a\s+new))\b",
    "funding": r"\b(rais(?:es?|ed?|ing)|secur(?:es?|ed?|ing)|funding|series\s+[a-z]|seed\s+round|investment|invest(?:s|ed|ing)?)\b",
    "ipo": r"\b(ipo|initial\s+public\s+offering|go(?:es|ing)?\s+public|public\s+listing)\b",
    "expansion": r"\b(expand(?:s|ed|ing)?|expansion|enter(?:s|ed|ing)?|growth|grow(?:s|ing)?|scale[sd]?|scaling)\b",
    "regulation": r"\b(regulat(?:es?|ed?|ion|ory|ing)|compliance|fine[sd]?|penalt(?:y|ies)|enforcement|licens(?:e[sd]?|ing)|approv(?:es?|ed?|al|ing))\b",
}


def _extract_entities(text: str) -> Dict[str, Set[str]]:
    """
    Extract key entities from text: companies and event types.

    Returns:
        Dict with 'companies' (set of company names) and 'events' (set of event types)
    """
    text_lower = text.lower()

    # Extract known companies
    companies = set()
    for company in KNOWN_COMPANIES:
        # Use word boundary matching for accurate detection
        pattern = r'\b' + re.escape(company) + r'\b'
        if re.search(pattern, text_lower):
            companies.add(company)

    # Extract event types
    events = set()
    for event_type, pattern in EVENT_PATTERNS.items():
        if re.search(pattern, text_lower, re.IGNORECASE):
            events.add(event_type)

    return {"companies": companies, "events": events}


def _entities_overlap(entities1: Dict[str, Set[str]], entities2: Dict[str, Set[str]]) -> Tuple[bool, str, bool]:
    """
    Check if two entity sets indicate the same story.

    Returns:
        Tuple of (is_same_story: bool, reason: str, high_confidence: bool)
        - high_confidence=True means entity match alone is sufficient (no similarity check needed)
    """
    companies1 = entities1.get("companies", set())
    companies2 = entities2.get("companies", set())
    events1 = entities1.get("events", set())
    events2 = entities2.get("events", set())

    # Find overlapping companies and events
    common_companies = companies1.intersection(companies2)
    common_events = events1.intersection(events2)

    # High-confidence events that are unlikely to repeat with same companies
    high_confidence_events = {"acquisition", "merger", "ipo"}

    # Rule: If 2+ companies overlap AND high-confidence event -> HIGH CONFIDENCE DUPLICATE
    # Example: "Capital One acquires Brex" - this specific acquisition only happens once
    if len(common_companies) >= 2 and common_events.intersection(high_confidence_events):
        return True, f"Same companies ({common_companies}) + high-confidence event ({common_events.intersection(high_confidence_events)})", True

    # Rule: If 2+ companies overlap -> needs similarity check (with or without a recognized event type)
    # This catches stories where the verb isn't in our event patterns, e.g. "Santander and Mastercard
    # Complete Europe's First Live Agentic AI Transaction" — "complete" isn't acquisition/merger/etc.
    if len(common_companies) >= 2:
        event_note = f"+ same event ({common_events})" if common_events else "(no recognized event type)"
        return True, f"Same companies ({common_companies}) {event_note}", False

    # Rule: If 1 company + specific event -> needs similarity check
    specific_events = {"acquisition", "merger", "ipo", "funding"}
    if len(common_companies) >= 1 and common_events.intersection(specific_events):
        return True, f"Company ({common_companies}) + specific event ({common_events})", False

    return False, "No significant entity overlap", False


# Embedding cache to avoid redundant API calls
_embedding_cache: Dict[str, List[float]] = {}
_openai_client: Optional[OpenAI] = None


def _get_openai_client() -> OpenAI:
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


def _get_embedding(text: str) -> List[float]:
    """
    Get embedding vector for text using OpenAI's text-embedding-3-small.
    Uses caching to avoid redundant API calls.
    """
    # Create a cache key from first 500 chars (sufficient for dedup purposes)
    cache_key = text[:500]

    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    try:
        client = _get_openai_client()
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000]  # Model limit is 8191 tokens
        )
        embedding = response.data[0].embedding
        _embedding_cache[cache_key] = embedding
        return embedding
    except Exception as e:
        print(f"⚠️ Embedding API error: {e}")
        return []


def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


def _calculate_embedding_similarity(text1: str, text2: str) -> float:
    """Calculate semantic similarity using embeddings."""
    emb1 = _get_embedding(text1)
    emb2 = _get_embedding(text2)
    return _cosine_similarity(emb1, emb2)


def is_duplicate_hybrid(
    story1_text: str,
    story2_text: str,
    word_threshold: float = 0.3,
    embedding_threshold: float = 0.8,
    use_embeddings: bool = True
) -> Tuple[bool, Dict]:
    """
    Hybrid duplicate detection combining entities, word similarity, and embeddings.

    Logic:
    - HIGH CONFIDENCE: If 2+ companies + acquisition/merger/ipo -> duplicate (no similarity needed)
      Example: "Capital One acquires Brex" - this specific event only happens once
    - MEDIUM CONFIDENCE: If entities match, check word OR embedding similarity
    - LOW/NO MATCH: Use strict word-only threshold (60%)

    Args:
        story1_text: Full text of first story (title + body)
        story2_text: Full text of second story (title + body)
        word_threshold: Jaccard similarity threshold when entities match (medium confidence)
        embedding_threshold: Cosine similarity threshold when entities match
        use_embeddings: Whether to use embedding similarity (can disable for speed)

    Returns:
        Tuple of (is_duplicate: bool, debug_info: dict)
    """
    debug_info = {
        "entities1": {},
        "entities2": {},
        "entity_match": False,
        "high_confidence": False,
        "entity_reason": "",
        "word_similarity": 0.0,
        "embedding_similarity": None,
        "decision_reason": ""
    }

    # Step 1: Extract entities
    entities1 = _extract_entities(story1_text)
    entities2 = _extract_entities(story2_text)
    debug_info["entities1"] = {k: list(v) for k, v in entities1.items()}
    debug_info["entities2"] = {k: list(v) for k, v in entities2.items()}

    # Step 2: Check entity overlap
    entity_match, entity_reason, high_confidence = _entities_overlap(entities1, entities2)
    debug_info["entity_match"] = entity_match
    debug_info["high_confidence"] = high_confidence
    debug_info["entity_reason"] = entity_reason

    # Step 3: Calculate word similarity
    word_sim = _calculate_similarity(story1_text, story2_text)
    debug_info["word_similarity"] = round(word_sim, 3)

    # HIGH CONFIDENCE: Entity match alone is sufficient
    # Example: Two stories about "Capital One acquires Brex" - same companies + acquisition
    if entity_match and high_confidence:
        debug_info["decision_reason"] = f"High-confidence entity match: {entity_reason}"
        return True, debug_info

    # If no entity match, use stricter word-only threshold (original behavior)
    if not entity_match:
        if word_sim > 0.6:  # Original threshold
            debug_info["decision_reason"] = f"No entity match, but high word similarity ({word_sim:.1%})"
            return True, debug_info
        debug_info["decision_reason"] = f"No entity match, low word similarity ({word_sim:.1%})"
        return False, debug_info

    # MEDIUM CONFIDENCE: Entity match found - use relaxed thresholds

    # Check word similarity first (cheaper)
    if word_sim > word_threshold:
        debug_info["decision_reason"] = f"Entity match + word similarity ({word_sim:.1%} > {word_threshold:.0%})"
        return True, debug_info

    # Check embedding similarity if enabled
    if use_embeddings:
        emb_sim = _calculate_embedding_similarity(story1_text, story2_text)
        debug_info["embedding_similarity"] = round(emb_sim, 3)

        if emb_sim > embedding_threshold:
            debug_info["decision_reason"] = f"Entity match + embedding similarity ({emb_sim:.1%} > {embedding_threshold:.0%})"
            return True, debug_info

    debug_info["decision_reason"] = f"Entity match but similarities below thresholds (word={word_sim:.1%}, emb={debug_info.get('embedding_similarity', 'N/A')})"
    return False, debug_info


def deduplicate_stories(stories: list, similarity_threshold: float = 0.4) -> list:
    """
    Remove duplicate or highly similar stories from a list.
    Each story should be a dict with 'title' and optionally 'summary' or 'body'.
    Returns deduplicated list of stories.
    """
    if not stories:
        return []

    deduplicated = []
    seen_content = []

    for story in stories:
        # Combine title and body/summary for comparison
        story_text = story.get('title', '') + ' ' + story.get('body', story.get('summary', ''))

        # Check against already seen stories
        is_duplicate = False
        for seen in seen_content:
            similarity = _calculate_similarity(story_text, seen)
            if similarity > similarity_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            deduplicated.append(story)
            seen_content.append(story_text)

    return deduplicated


def filter_against_history(
    new_stories: list,
    historical_stories: list,
    similarity_threshold: float = 0.6,
    use_hybrid: bool = True,
    use_embeddings: bool = True,
    verbose: bool = False
) -> Tuple[list, list]:
    """
    Filter out stories that are too similar to historical coverage.

    Uses hybrid detection by default: combines entity extraction, word similarity,
    and semantic embeddings to catch duplicates that word-only matching misses
    (e.g., "Capital One acquires Brex" written differently by two sources).

    Args:
        new_stories: List of story dicts to filter (today's stories)
        historical_stories: List of story dicts to compare against (recent coverage)
        similarity_threshold: Jaccard similarity threshold (0-1) for word-only mode.
            Default 0.6. Ignored when use_hybrid=True.
        use_hybrid: Use hybrid detection (entities + words + embeddings). Default True.
        use_embeddings: Include embedding similarity in hybrid mode. Default True.
        verbose: Print detailed matching info for debugging. Default False.

    Returns:
        Tuple of (filtered_stories, removed_stories_with_reasons)
        - filtered_stories: Stories that are NOT duplicates
        - removed_stories: List of dicts with 'story' and 'reason' for each removed story
    """
    if not new_stories:
        return [], []

    if not historical_stories:
        return new_stories, []

    # Pre-compute text representations for historical stories
    historical_texts = []
    for story in historical_stories:
        text = story.get('title', '') + ' ' + story.get('body', story.get('summary', ''))
        historical_texts.append(text)

    filtered = []
    removed = []

    for story in new_stories:
        story_text = story.get('title', '') + ' ' + story.get('body', story.get('summary', ''))
        story_title = story.get('title', 'Untitled')

        is_duplicate = False
        duplicate_reason = ""

        for i, historical_text in enumerate(historical_texts):
            if use_hybrid:
                # Use hybrid detection
                is_dup, debug_info = is_duplicate_hybrid(
                    story_text,
                    historical_text,
                    word_threshold=0.3,
                    embedding_threshold=0.8,
                    use_embeddings=use_embeddings
                )
                if is_dup:
                    is_duplicate = True
                    historical_title = historical_stories[i].get('title', 'Unknown')
                    duplicate_reason = f"Matched '{historical_title[:50]}...' - {debug_info['decision_reason']}"
                    if verbose:
                        print(f"  🔴 DUPLICATE: {story_title[:40]}...")
                        print(f"     Matched: {historical_title[:40]}...")
                        print(f"     Reason: {debug_info['decision_reason']}")
                        print(f"     Entities: {debug_info['entities1']} vs {debug_info['entities2']}")
                    break
            else:
                # Original word-only detection
                similarity = _calculate_similarity(story_text, historical_text)
                if similarity > similarity_threshold:
                    is_duplicate = True
                    historical_title = historical_stories[i].get('title', 'Unknown')
                    duplicate_reason = f"Word similarity {similarity:.1%} with '{historical_title[:50]}...'"
                    break

        if is_duplicate:
            removed.append({"story": story, "reason": duplicate_reason})
        else:
            filtered.append(story)
            if verbose:
                print(f"  🟢 KEPT: {story_title[:50]}...")

    return filtered, removed
