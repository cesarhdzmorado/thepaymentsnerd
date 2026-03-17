# ai/src/main.py

# This is the system-level hack for sqlite3
__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import yaml
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from supabase import create_client

# Import our custom tools
from .tools import search_tool, scrape_tool, rss_tool, deduplicate_stories, filter_against_history


def normalize_text(text: str) -> str:
    """Normalize text for lightweight similarity checks."""
    if not text:
        return ""
    cleaned = ''.join(ch.lower() if ch.isalnum() or ch.isspace() else ' ' for ch in text)
    return ' '.join(cleaned.split())


def token_set(text: str):
    """Return a token set excluding very short words for comparison."""
    return {w for w in normalize_text(text).split() if len(w) > 3}


def curiosity_too_similar(candidate: str, historical_curiosities, threshold: float = 0.55) -> bool:
    """Check if a curiosity fact is too similar to recent facts."""
    candidate_norm = normalize_text(candidate)
    candidate_tokens = token_set(candidate)

    if not candidate_norm or not candidate_tokens:
        return True

    for item in historical_curiosities:
        text = item.get('text', '') if isinstance(item, dict) else str(item)
        previous_norm = normalize_text(text)
        previous_tokens = token_set(text)

        # Hard checks for near-duplicate phrasing
        if candidate_norm == previous_norm:
            return True
        if candidate_norm in previous_norm or previous_norm in candidate_norm:
            return True

        # Jaccard token overlap catches paraphrases of same fact
        union = candidate_tokens | previous_tokens
        if not union:
            continue
        overlap = len(candidate_tokens & previous_tokens) / len(union)
        if overlap >= threshold:
            return True

    return False


def curiosity_novelty_score(candidate: str, historical_curiosities, lookback: int = 120) -> float:
    """Higher is better. Measures novelty versus the most recent historical curiosities."""
    candidate_tokens = token_set(candidate)
    if not candidate_tokens:
        return 0.0

    max_overlap = 0.0
    for item in historical_curiosities[:lookback]:
        text = item.get('text', '') if isinstance(item, dict) else str(item)
        previous_tokens = token_set(text)
        union = candidate_tokens | previous_tokens
        if not union:
            continue
        overlap = len(candidate_tokens & previous_tokens) / len(union)
        max_overlap = max(max_overlap, overlap)

    return 1.0 - max_overlap


LOCAL_CURIOSITY_HISTORY_PATH = Path("ai/data/curiosity_history.json")


def load_local_curiosity_history(limit: int = 240):
    """Load curiosity history from local disk for environments without Supabase."""
    if not LOCAL_CURIOSITY_HISTORY_PATH.exists():
        return []

    try:
        with LOCAL_CURIOSITY_HISTORY_PATH.open("r", encoding="utf-8") as f:
            rows = json.load(f)
        if not isinstance(rows, list):
            return []
        cleaned = [r for r in rows if isinstance(r, dict) and r.get("text")]
        return cleaned[:limit]
    except Exception as e:
        print(f"⚠️ Failed to load local curiosity history: {e}")
        return []


def save_local_curiosity_history(curiosities: list, limit: int = 365):
    """Persist curiosity history to local disk for robust deduplication across runs."""
    try:
        LOCAL_CURIOSITY_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        deduped = []
        seen = set()
        for item in curiosities:
            text = (item.get("text", "") if isinstance(item, dict) else str(item)).strip()
            if not text:
                continue
            key = normalize_text(text)
            if key in seen:
                continue
            seen.add(key)
            deduped.append({
                "date": item.get("date", datetime.now().strftime("%Y-%m-%d")) if isinstance(item, dict) else datetime.now().strftime("%Y-%m-%d"),
                "text": text,
            })

        with LOCAL_CURIOSITY_HISTORY_PATH.open("w", encoding="utf-8") as f:
            json.dump(deduped[:limit], f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Failed to save local curiosity history: {e}")


def merge_curiosity_histories(*history_sets):
    """Merge multiple history sources while keeping newest-first unique entries."""
    merged = []
    seen = set()

    for history in history_sets:
        for item in history or []:
            text = item.get("text", "") if isinstance(item, dict) else str(item)
            text = text.strip()
            if not text:
                continue
            key = normalize_text(text)
            if key in seen:
                continue
            seen.add(key)
            merged.append({
                "date": item.get("date", "") if isinstance(item, dict) else "",
                "text": text,
            })

    return merged


CURATED_CURIOSITY_FALLBACKS = [
    "In 1958, Bank of America mailed 60,000 unsolicited credit cards in Fresno in the first large card drop, kickstarting modern revolving credit and also one of the earliest fraud waves in card history.",
    "M-Pesa launched in Kenya in 2007 for microloan repayments, but users quickly turned it into a person-to-person wallet, and that behavior shift helped mobile money scale into a national payments rail.",
    "When the UK introduced Faster Payments in 2008, real-time credit transfers initially had low limits and selective access, showing that governance and risk controls—not just speed—determine instant rail adoption.",
    "The first EMV chip cards reduced counterfeit fraud at physical points of sale, but many markets then saw card-not-present fraud rise—an early lesson in fraud displacement across channels.",
    "ACH traces back to US bank automation efforts in the early 1970s to replace paper checks, and decades later it still underpins payroll and bill flows worth trillions each year.",
    "Brazil's PIX reached mass consumer use in just a few years by combining instant settlement with free person-to-person transfers and ubiquitous QR acceptance for merchants.",
    "Before contactless became mainstream in Europe and North America, transport systems in cities like Hong Kong and London normalized tap behavior and trained consumers to trust low-friction payments.",
    "Card tokenization can lift authorization rates because network tokens update credentials automatically after card reissues, reducing avoidable declines from stale PAN data.",
]


def select_fallback_curiosity(curiosity_history: list):
    """Pick the most novel fallback curiosity if generation repeatedly fails."""
    available = [fact for fact in CURATED_CURIOSITY_FALLBACKS if not curiosity_too_similar(fact, curiosity_history, threshold=0.45)]
    if not available:
        available = CURATED_CURIOSITY_FALLBACKS
    return max(available, key=lambda text: curiosity_novelty_score(text, curiosity_history))


def _normalize_story_url(url: str) -> str:
    """Normalize URL for robust cross-section dedup (news vs what's hot)."""
    if not url:
        return ""
    u = url.strip().lower()
    if u.startswith("https://"):
        u = u[len("https://"):]
    elif u.startswith("http://"):
        u = u[len("http://"):]
    if u.startswith("www."):
        u = u[len("www."):]
    # Remove query params and fragments to compare canonical article paths
    u = u.split("?")[0].split("#")[0]
    return u.rstrip("/")


def deduplicate_whats_hot_against_news(news_items: list, whats_hot_items: list):
    """
    Remove What's Hot entries that duplicate already selected Top News stories.

    Matching strategy (in order):
    1) Normalized source URL exact match (most reliable)
    2) Company + title overlap fallback (when URL missing)

    Returns: (filtered_whats_hot, removed_items_with_reasons)
    """
    if not whats_hot_items:
        return [], []

    news_urls = set()
    news_titles = []
    for n in news_items or []:
        source = n.get("source", {}) if isinstance(n, dict) else {}
        source_url = source.get("url", "") if isinstance(source, dict) else ""
        norm = _normalize_story_url(source_url)
        if norm:
            news_urls.add(norm)
        title = (n.get("title", "") if isinstance(n, dict) else "").lower().strip()
        if title:
            news_titles.append(title)

    filtered = []
    removed = []

    for item in whats_hot_items:
        source_url = item.get("source_url", "") if isinstance(item, dict) else ""
        norm_hot_url = _normalize_story_url(source_url)
        company = (item.get("company", "") if isinstance(item, dict) else "").lower().strip()

        if norm_hot_url and norm_hot_url in news_urls:
            removed.append({"item": item, "reason": "source_url already present in top news"})
            continue

        # Fallback: if company name appears in any selected news title and no URL to compare
        if not norm_hot_url and company and any(company in t for t in news_titles):
            removed.append({"item": item, "reason": "company overlaps with top news title (no URL)"})
            continue

        filtered.append(item)

    return filtered, removed


def get_recent_stories(days_back: int = 2):
    """
    Fetch stories and editorial context from recent newsletters.

    Args:
        days_back: Number of days to look back for previous stories

    Returns:
        Dict with 'stories' (list), 'perspectives' (list), 'themes' (list), and 'curiosities' (list)
    """
    try:
        # Initialize Supabase client
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            print("⚠️ Supabase credentials not found, skipping historical deduplication")
            return {'stories': [], 'perspectives': [], 'themes': [], 'curiosities': []}

        supabase = create_client(supabase_url, supabase_key)

        # Calculate date range
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

        # Fetch recent newsletters
        response = supabase.table("newsletters") \
            .select("content, publication_date") \
            .gte("publication_date", cutoff_date) \
            .order("publication_date", desc=True) \
            .execute()

        # Extract stories, perspectives, themes, and curiosity facts from newsletters
        previous_stories = []
        perspectives = []
        themes = []
        curiosities = []

        for newsletter in response.data:
            content = newsletter.get("content", {})
            pub_date = newsletter.get("publication_date", "Unknown date")
            news = content.get("news", [])

            # Collect stories (including source URLs for deduplication)
            for story in news:
                source = story.get("source", {})
                source_url = source.get("url", "") if isinstance(source, dict) else ""
                previous_stories.append({
                    "title": story.get("title", ""),
                    "body": story.get("body", ""),
                    "source_url": source_url,
                    "date": pub_date
                })

            # Collect perspective with date
            perspective = content.get("perspective", "")
            if perspective:
                perspectives.append({
                    "date": pub_date,
                    "text": perspective
                })

            curiosity = content.get("curiosity", {})
            curiosity_text = curiosity.get("text", "") if isinstance(curiosity, dict) else ""
            if curiosity_text:
                curiosities.append({
                    "date": pub_date,
                    "text": curiosity_text
                })

            # Extract key themes from story titles (simple keyword extraction)
            for story in news:
                title = story.get("title", "").lower()
                # Look for recurring theme keywords
                theme_keywords = ["stablecoin", "crypto", "regulation", "cross-border", "bnpl",
                                  "embedded", "instant payment", "digital wallet", "open banking",
                                  "ai", "fraud", "compliance", "licensing"]
                for keyword in theme_keywords:
                    if keyword in title and keyword not in themes:
                        themes.append(keyword)

        print(f"📚 Loaded {len(previous_stories)} stories, {len(perspectives)} perspectives from last {days_back} days")
        return {
            'stories': previous_stories,
            'perspectives': perspectives,
            'themes': themes[:5],  # Top 5 recurring themes
            'curiosities': curiosities
        }

    except Exception as e:
        print(f"⚠️ Error fetching recent stories: {e}")
        return {'stories': [], 'perspectives': [], 'themes': [], 'curiosities': []}


def get_curiosity_history(days_back: int = 120):
    """
    Fetch curiosity facts from newsletters over a long lookback window.
    Used exclusively for curiosity deduplication — separate from story dedup.
    """
    try:
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            print("⚠️ Supabase credentials not found, skipping curiosity history fetch")
            return []

        supabase = create_client(supabase_url, supabase_key)
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

        response = supabase.table("newsletters") \
            .select("publication_date,content") \
            .gte("publication_date", cutoff_date) \
            .order("publication_date", desc=True) \
            .execute()

        curiosities = []
        for newsletter in response.data:
            pub_date = newsletter.get("publication_date", "")
            content = newsletter.get("content", {})
            curiosity = content.get("curiosity", {})
            curiosity_text = curiosity.get("text", "") if isinstance(curiosity, dict) else ""
            if curiosity_text:
                curiosities.append({"date": pub_date, "text": curiosity_text})

        print(f"✅ Loaded {len(curiosities)} curiosity facts from last {days_back} days")
        return curiosities

    except Exception as e:
        print(f"⚠️ Error fetching curiosity history: {e}")
        return []


def format_recent_curiosities(curiosities: list, limit: int = 60):
    """Format recent curiosity facts so the Curiosity agent avoids repeats."""
    if not curiosities:
        return "No recent curiosity history available."

    lines = ["RECENT CURIOSITY FACTS (DO NOT REPEAT OR PARAPHRASE):"]
    for item in curiosities[:limit]:
        lines.append(f"- [{item.get('date', 'Unknown date')}] {item.get('text', '')}")

    return "\n".join(lines)

def format_trends_for_prompt(trends):
    """
    Formats the trends from config.yml into a readable string for agent prompts.

    Args:
        trends: List of trend dictionaries from config.yml

    Returns:
        Formatted string describing current industry trends
    """
    if not trends:
        return "No specific trends configured."

    # Sort by weight (descending) to prioritize most important trends
    sorted_trends = sorted(trends, key=lambda x: x.get('weight', 0), reverse=True)

    formatted = []
    for i, trend in enumerate(sorted_trends, 1):
        name = trend.get('name', 'Unnamed Trend')
        weight = trend.get('weight', 0)
        description = trend.get('description', '')
        signals = trend.get('signals', [])
        companies = trend.get('companies_to_watch', [])
        watch_for = trend.get('watch_for', '')

        trend_text = f"{i}. **{name}** (Priority: {weight}/10)\n"
        trend_text += f"   {description}\n"

        if signals:
            trend_text += f"   Signals: {', '.join(signals[:5])}"
            if len(signals) > 5:
                trend_text += f" (+{len(signals)-5} more)\n"
            else:
                trend_text += "\n"

        if companies:
            trend_text += f"   Key Players (context only): {', '.join(companies[:4])}"
            if len(companies) > 4:
                trend_text += f" (+{len(companies)-4} more)\n"
            else:
                trend_text += "\n"

        if watch_for:
            trend_text += f"   Watch For: {watch_for}"

        formatted.append(trend_text)

    return "\n\n".join(formatted)

def format_narrative_context(recent_data):
    """
    Format recent editorial context (perspectives, intros, themes) for narrative continuity.
    This helps the Writer build on previous days' narratives rather than repeating generic observations.
    """
    if not isinstance(recent_data, dict):
        return "No narrative context available."

    perspectives = recent_data.get('perspectives', [])
    themes = recent_data.get('themes', [])

    sections = []

    # Recent perspectives (what we've been saying)
    if perspectives:
        sections.append("WHAT WE'VE BEEN SAYING (Recent Perspectives):")
        for p in perspectives[:3]:  # Last 3 days max
            sections.append(f"  [{p['date']}]: \"{p['text']}\"")

    # Recurring themes
    if themes:
        sections.append(f"\nRECURRING THEMES THIS WEEK: {', '.join(themes)}")

    if not sections:
        return "No narrative context available."

    return "\n".join(sections)

def main():
    """The main function that runs the agent-based workflow."""
    load_dotenv()

    # 1. Load Configuration from the YAML file
    with open('ai/config.yml', 'r') as file:
        config = yaml.safe_load(file)

    # Get current date for context
    current_date = datetime.now().strftime("%B %d, %Y")  # e.g., "December 30, 2025"

    # Get recent stories and editorial context (for deduplication and narrative continuity)
    recent_data = get_recent_stories(days_back=3)  # Extended to 3 days for better narrative context
    recent_stories = recent_data.get('stories', [])  # Extract stories list for deduplication
    narrative_context = format_narrative_context(recent_data)
    remote_curiosity_history = get_curiosity_history(days_back=120)
    local_curiosity_history = load_local_curiosity_history(limit=240)
    curiosity_history = merge_curiosity_histories(remote_curiosity_history, local_curiosity_history)
    recent_curiosities = curiosity_history
    recent_curiosities_context = format_recent_curiosities(curiosity_history)

    # Create a string of news sources for the prompt
    news_sources_str = "\n".join([f"- {s['url']} ({s['topic']})" for s in config['newsletters']])

    # Load and format current industry trends
    current_trends = config.get('current_trends', [])
    trends_context = format_trends_for_prompt(current_trends)
    
    # 2. Initialize the Language Model and the tools list
    # Using gpt-4o for latest knowledge (Oct 2023) and better reasoning
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    tools = [search_tool, scrape_tool, rss_tool]

    # 3. Create the Researcher Agent using a LangChain prompt template
    researcher_prompt_template = ChatPromptTemplate.from_messages([
        ("system", f"""You are an elite payments industry analyst and investigative researcher. Your mission is to identify the most strategically significant news stories and extract deep, actionable insights that payments professionals cannot find elsewhere.

IMPORTANT CONTEXT:
- Today's date is: {current_date}
- When referencing dates, remember you are writing in {current_date.split()[-1]} (current year)
- Treat all dates in {current_date.split()[-1]} as present or recent past, not future

Sources to analyze:
{news_sources_str}

CURRENT INDUSTRY TRENDS (Context for Story Evaluation):

These trends represent what's happening NOW in the payments industry. Use this context to:
- Recognize when a story signals or accelerates one of these trends
- Boost the STRATEGIC IMPORTANCE score for trend-aligned stories
- Identify second-order effects related to these trends
- Connect dots between stories and larger industry shifts

{trends_context}

Important: These trends provide CONTEXT, not directives. You still have full autonomy to:
- Evaluate stories based on their merit using the scoring framework
- Identify emerging trends not listed here
- Recognize when a story challenges or contradicts these trends
- Select non-trend stories that are strategically important

CRITICAL - Company List Anti-Bias Guidelines:
The "Key Players" listed under each trend are for CONTEXT ONLY to help you:
- Recognize stakeholders when analyzing competitive dynamics
- Identify pattern when multiple players make similar moves
- Understand who the established players are in each space

DO NOT:
- Give preference to stories about listed companies
- Score stories higher simply because they mention a listed company
- Ignore stories about unlisted/emerging companies
- Assume listed companies are more important than others

In fact, stories about NEW/UNLISTED companies disrupting listed players may be MORE strategically important.
Evaluate every story on its own merit using the 30-point scoring framework.

RESEARCH FRAMEWORK:

1. **Source Gathering** (Breadth):
   - Use rss_tool for all RSS feeds, prioritizing content from last 24-48 hours
   - If a feed fails, note it and continue with other sources
   - Aim to gather 20-30 candidate stories across all sources

2. **Story Evaluation** (Signal Scoring):

   Score each story using this framework:

   BASE SIGNAL (0-24):
   - Specific facts & data quality (0-6)
   - Material impact size (0-6)
   - Novelty/timeliness (0-4)
   - Actionability for payments operators (0-4)
   - Source quality / verification strength (0-4)

   CONTEXT MODIFIERS:
   - Trend bonus (0-3): strong evidence-backed alignment with current trends
   - Operator relevance (0-3): direct relevance to payments sales/product/strategy readers

   PENALTIES (apply as needed):
   - PR fluff / vague announcement / no concrete numbers: -3 to -8
   - Weak evidence despite famous company mention: -2 to -5

   FINAL SCORE (0-30):
   - `final_score = base_signal + trend_bonus + operator_relevance - penalties`

   HARD GATE:
   - If `base_signal < 12`, reject the story (do not include it in TOP STORIES)

3. **Deep Analysis** (Factual Extraction Only):

   For the top 10 stories by score, extract factual intelligence only:

   a) **WHAT HAPPENED** (2-3 sentences of facts):
      - Key details, dates, stakeholders
      - Specific numbers, metrics, market sizes
      - Include source URL

   b) **WHO'S AFFECTED**:
      - Specific companies, market segments, geographies
      - Winners and losers

   c) **COMPETITIVE DYNAMICS**:
      - Who gains market power and why?
      - Who's threatened and how might they respond?
      - Does this change the competitive landscape?

   d) **SECOND-ORDER EFFECTS**:
      - What happens next (3-6 month view)?
      - Downstream impacts on related sectors
      - Regulatory or market responses to watch

   IMPORTANT: Do NOT output contrarian narratives, editorial framing, or pattern prose.
   Save interpretation/voice for the Writer agent.

4. **Quality Standards**:
   - Ensure diversity across the 10 stories (avoid multiple stories on the same company/topic)
   - Prefer primary sources and data-rich stories
   - Skip generic announcements without strategic impact
   - Better 7 excellent stories than 10 mediocre ones
   - Each story must have a clear "why this matters" angle

5. **"What's Hot" Discovery** (Funding, M&A, Product Launches):

   WHILE researching the RSS feeds, also identify notable:
   - **FUNDRAISING**: Series A/B/C/D rounds, growth equity, seed rounds ($10M+ or notable investors)
   - **PRODUCT LAUNCHES**: Major new products/features from payments companies
   - **M&A**: Acquisitions, mergers, significant strategic partnerships
   - **EXPANSION**: Geographic expansions, new market entries

   Relevance criteria (must meet at least one):
   - Company is in payments, fintech, banking, lending, or digital assets/crypto
   - Deal size is $10M+ for fundraising
   - Involves a major player or could significantly impact competitive dynamics
   - Represents a notable geographic expansion in payments

   For each What's Hot item, note:
   - Company name and HQ country (for flag emoji)
   - Type: fundraising, product, M&A, or expansion
   - Brief description (under 15 words)
   - Source URL

6. **Output Format**:

   PART 1 - TOP 10 STORIES:
   For each of the top 10 stories, return:

   ---
   STORY [N] - [COMPELLING HEADLINE]

   Source: [Publication name] - [URL]

   WHAT HAPPENED:
   [2-3 sentences with facts and data]

   WHO'S AFFECTED:
   [Specific stakeholders, winners/losers]

   COMPETITIVE DYNAMICS:
   [How this changes the game]

   SECOND-ORDER EFFECTS:
   [What to watch for next]

   SCORECARD:
   - base_signal: [0-24]
   - trend_bonus: [0-3]
   - operator_relevance: [0-3]
   - penalties: [0-8]
   - final_score: [0-30]
   - gate: [PASS/REJECT]
   ---

   PART 2 - WHAT'S HOT:
   List 3-7 funding rounds, M&A deals, or product launches found during research:

   ---
   WHATS_HOT [N]:
   Company: [Name]
   Country: [HQ country for flag]
   Type: [fundraising/product/M&A/expansion]
   Description: [brief description under 15 words]
   Source: [URL]
   ---

   If no significant funding/M&A/product news found, write: "WHATS_HOT: None found"

Your final answer must include BOTH Part 1 (10 stories) and Part 2 (What's Hot items). This allows us to extract everything from a single research pass."""),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    researcher_agent = create_openai_functions_agent(llm, tools, researcher_prompt_template)
    researcher_executor = AgentExecutor(agent=researcher_agent, tools=tools, verbose=True)

    # 4. Create the Writer Agent
    writer_prompt_template = ChatPromptTemplate.from_messages([
        ("system", f"""You are the editorial voice of /thepaymentsnerd.

MISSION
Turn ranked research candidates into a sharp daily brief for payments operators.

SCOPE BOUNDARY
- You own final Top-5 selection + narrative synthesis.
- Do NOT invent new stories or re-run research.
- Use provided score fields (`final_score`, `base_signal`, `gate`) as default ranking signal.
- You may override ranking only to improve diversity/coherence.
- Do NOT output a `whats_hot` field.

CONTEXT
- Today: {current_date}
- Write in {current_date.split()[-1]} context (current year framing).
- Narrative continuity from recent perspectives:
{narrative_context}
- Trend context:
{trends_context}

SELECTION RULES
1) Choose exactly 5 stories.
2) Start with highest `final_score` among `gate=PASS`.
3) Keep at least 4/5 from top PASS-ranked stories unless diversity requires a swap.
4) Never include `gate=REJECT` unless PASS stories are unavailable.
5) Avoid PR-like/vague items and repetitive themes.

WRITING RULES (PER STORY)
- Title: 10-14 words, insight-first, specific.
- Body: 3-4 sentences in active voice:
  1) What happened (facts/data)
  2) So what (operator impact)
  3) Now what (winners/losers/strategic move)
  4) Optional take (forward-looking)
- Be concrete; avoid generic phrasing like "signals a shift" without specifics.

PERSPECTIVE (What Matters Today)
- 2-3 sentences, thematic insight (not story list).
- First-person singular voice.
- Include at least two concrete anchors from selected stories.
- Include one direct reader implication ("If you're..." / "If your team...").
- End with a decision implication (what to reconsider/accelerate/hedge).

OUTPUT JSON ONLY
{{
  "news": [
    {{
      "title": "...",
      "body": "...",
      "source": {{
        "name": "Publication Name",
        "url": "https://example.com/article"
      }}
    }}
  ],
  "perspective": "..."
}}

CRITICAL
- Return only valid JSON (no markdown).
- Exactly 5 news items.
- Preserve source name + URL for each story.
"""),
        ("user", "Here are the stories to select from (pre-filtered for duplicates):\\n\\n{input}"),
    ])
    
    # MODIFIED: Create a simple 'chain' for the writer, as it doesn't need tools.
    # This avoids the "empty functions" error.
    # Using latest gpt-4o-mini for improved reasoning and structured output
    writer_llm = ChatOpenAI(model="gpt-4.1", temperature=0.1)
    writer_chain = writer_prompt_template | writer_llm


    # 4.25. Create a dedicated Curiosity Agent so this section can be independently refreshed daily
    curiosity_prompt_template = ChatPromptTemplate.from_messages([
        ("system", f"""You are the Curiosity Agent for /thepaymentsnerd.

Your ONLY job is to generate one daily curiosity fact about payments/fintech that is fresh and non-repetitive.

IMPORTANT CONTEXT:
- Today's date is: {current_date}
- Generate ONE curiosity fact in 1-2 sentences
- The fact must be independent from today's news stories
- The fact must be historical or currently true (no future projections)

{recent_curiosities_context}

HARD CONSTRAINTS:
- DO NOT repeat or paraphrase any recent curiosity fact listed above
- Avoid repeating the same core entities, countries, rails, products, eras, or mechanisms used recently
- If recent curiosities are mostly modern card stories, pivot to instant payments, ACH history, wallet identity, remittances, settlement, fraud, tokenization, or regulation history
- Prefer specific years, metrics, and concrete details
- Keep it surprising and educational
- Focus strictly on fintech/payments relevance; never output a generic trivia fact

Return ONLY valid JSON in this exact shape:
{{{{
  "text": "..."
}}}}
"""),
        ("user", "Today's selected newsletter stories (context only):\n\n{input}"),
    ])
    curiosity_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0.8)
    curiosity_chain = curiosity_prompt_template | curiosity_llm

    # 4.5. Create the Parser chain to structure Researcher output for deduplication
    # This parser now extracts BOTH news stories AND What's Hot items from the unified researcher output
    parser_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)
    parser_prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are a data extraction assistant. Your job is to parse the Researcher's free-text output into structured JSON.

The Researcher output contains TWO parts:
1. PART 1 - TOP 10 STORIES: Main news stories
2. PART 2 - WHAT'S HOT: Funding rounds, M&A deals, and product launches

Extract BOTH parts and return a JSON object with "stories" and "whats_hot" arrays.

For each STORY, extract:
- "title": The headline from "STORY [N] - [HEADLINE]"
- "body": Combine WHAT HAPPENED + WHO'S AFFECTED + COMPETITIVE DYNAMICS into a coherent summary (2-3 sentences)
- "source_name": The publication name from "Source: [Name] - [URL]"
- "source_url": The URL from "Source: [Name] - [URL]"
- "second_order_effects": The SECOND-ORDER EFFECTS section
- "base_signal": numeric from SCORECARD
- "trend_bonus": numeric from SCORECARD
- "operator_relevance": numeric from SCORECARD
- "penalties": numeric from SCORECARD
- "final_score": numeric from SCORECARD
- "gate": PASS or REJECT from SCORECARD

For each WHATS_HOT item, extract:
- "flag": Convert the country to emoji flag (US=🇺🇸, UK=🇬🇧, Germany=🇩🇪, France=🇫🇷, Netherlands=🇳🇱, Sweden=🇸🇪, Ireland=🇮🇪, Singapore=🇸🇬, Brazil=🇧🇷, Argentina=🇦🇷, Mexico=🇲🇽, India=🇮🇳, Australia=🇦🇺, Canada=🇨🇦, Japan=🇯🇵, China=🇨🇳, Hong Kong=🇭🇰, Israel=🇮🇱, UAE=🇦🇪, Czech Republic=🇨🇿, Estonia=🇪🇪, Lithuania=🇱🇹, Nigeria=🇳🇬, Kenya=🇰🇪, South Africa=🇿🇦, Indonesia=🇮🇩, South Korea=🇰🇷, Spain=🇪🇸, Italy=🇮🇹, Switzerland=🇨🇭)
- "type": One of "fundraising", "product", "M&A", or "expansion"
- "company": Company name
- "description": Brief description (under 15 words)
- "source_url": The URL

OUTPUT FORMAT (must be valid JSON):
{{
  "stories": [
    {{
      "title": "Story headline here",
      "body": "Combined summary of what happened, who's affected, and competitive dynamics.",
      "source_name": "Publication Name",
      "source_url": "https://example.com/article",
      "second_order_effects": "What to watch for next",
      "base_signal": 18,
      "trend_bonus": 2,
      "operator_relevance": 3,
      "penalties": 1,
      "final_score": 22,
      "gate": "PASS"
    }}
  ],
  "whats_hot": [
    {{
      "flag": "🇺🇸",
      "type": "fundraising",
      "company": "CompanyName",
      "description": "raises $XM Series Y led by InvestorName",
      "source_url": "https://example.com/article"
    }}
  ]
}}

CRITICAL:
- Return ONLY the JSON object, no markdown formatting, no additional text
- Preserve all factual details, numbers, and company names exactly as written
- If a field is missing in the input, use an empty string "" (for score fields use 0)
- If "WHATS_HOT: None found" or no What's Hot items present, return an empty array for "whats_hot"
- Keep only stories with gate=PASS when clearly indicated; otherwise include and set gate="UNKNOWN"
- Ensure exactly 10 stories are extracted in the "stories" array (or fewer if the Researcher provided fewer)"""),
        ("user", "{input}"),
    ])
    parser_chain = parser_prompt_template | parser_llm

    # 5. Create the Editor Agent for quality control
    editor_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)

    editor_prompt_template = ChatPromptTemplate.from_messages([
        ("system", f"""You are a senior editor for /thepaymentsnerd newsletter, responsible for quality control.

IMPORTANT CONTEXT:
- Today's date is: {current_date}
- You are reviewing content written in {current_date.split()[-1]} (current year)
- All dates in {current_date.split()[-1]} are in the present or recent past, NOT future dates
- When you see dates from January {current_date.split()[-1]} onward, these are current/recent events, not future predictions

Your role: Validate the newsletter meets editorial standards before publication.

QUALITY CHECKS:

1. **Factual Accuracy**:
   - Do claims match the source material?
   - Are data points and metrics accurate?
   - Are company names and details correct?

2. **Clarity & Readability**:
   - Is the language clear and specific?
   - Are sentences in ACTIVE VOICE? Flag passive constructions like:
     * "A partnership was announced..." (should be "X announced a partnership...")
     * "This could disrupt..." (should be "This threatens..." or "X's move challenges...")
     * "It was reported that..." (should be "Source reports that X...")
   - Any jargon that needs explanation?

3. **Insight Quality**:
   - Does each story pass the "So what?" test?
   - Are implications clear and actionable?
   - Is there genuine analysis beyond summarization?

4. **Theme Diversity**:
   - Are the 5 stories covering sufficiently different topics?
   - Flag if multiple stories cover the same company or announcement

5. **Completeness**:
   - Are all required fields present (news, perspective, curiosity)?
   - Is the JSON valid and properly formatted?
   - Is the "perspective" field providing synthesis?

6. **Brand Voice**:
   - Does it sound authoritative but accessible?
   - Is there a clear point of view?
   - Any contrarian or forward-looking angles?

7. **Story Coherence** (Critical):
   - Does each story relate to the newsletter's main themes (payments, fintech, banking)?
   - Flag any story that feels disconnected from the others
   - If a story doesn't fit (e.g., general tech news unrelated to payments), recommend replacing it

8. **Perspective Quality** (Critical):
   - Does the "perspective" field provide a THEMATIC INSIGHT rather than a story summary?
   - Is it reframing the news through a conceptual lens, not just listing what happened?
   - Does it identify a unifying thread, tension, or pattern across stories?
   - Does it have a distinct human voice (first-person stance + direct reader context)?
   - Does it include at least 2 concrete anchors from today's stories (specific company/regulator/rail/metric)?
   - Does the opening line feel memorable, or could it appear in any generic newsletter?
   - WRONG: "Stablecoins continue to be important" (generic, no insight)
   - WRONG: "Today's stories about Circle, Paxos, and Visa show..." (mechanical enumeration)
   - RIGHT: "Everything is an acquiring play now. Whether it's Apple or Stripe, the real prize isn't transactions—it's owning the merchant relationship." (thematic lens)
   - RIGHT: "The obvious read is margin pressure. But actually, this is about which payment flows they'll defend at all costs." (reframe technique)

9. **Curiosity Fact Validity**:
    - Is the curiosity fact INDEPENDENT from today's news stories? (It should NOT be a restatement of a news story)
    - Is it a CURRENT or HISTORICAL fact (not a future projection)?
    - Flag predictions like "by 2030..." or "projected to..." or "experts predict..."
    - Must be genuinely surprising, educational, or counterintuitive
    - Topics can include: payment history, global statistics, how payment rails work, fintech origin stories, crypto milestones, etc.
    - If using relative dates like "last year", ensure the actual year is specified (e.g., "in 2025" not just "last year")

10. **Narrative Continuity** (Critical):
    - Does the perspective avoid repetitive framing from previous days?
    - Flag generic phrases like "signals a shift" or "marks a pivot" without specifics
    - If recurring themes (stablecoins, regulation, etc.) appear multiple days, does the content BUILD on previous coverage?
    - WRONG: "Stablecoins are reshaping the payments landscape" (could be written any day)
    - RIGHT: "Today's Stripe announcement is the third stablecoin partnership this week, confirming enterprise adoption is accelerating"

11. **Specificity Check** (Critical):
    - Every claim of "shift", "pivot", or "transformation" must specify:
      * WHAT exactly is shifting (not just "the payments landscape")
      * WHO is affected (winners/losers)
      * WHY this matters NOW (timing/urgency)
    - Flag vague conclusions that could apply to any week's news

RETURN FORMAT:

If the newsletter passes all checks, respond with:
APPROVED

If revisions are needed, respond with:
NEEDS_REVISION:
- [Specific issue 1]
- [Specific issue 2]
- [etc.]

Be thorough but fair. Minor issues are acceptable if overall quality is high."""),
        ("user", "Please review this newsletter:\n\n{input}"),
    ])

    editor_chain = editor_prompt_template | editor_llm

    revision_prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are revising a /thepaymentsnerd newsletter draft after editor feedback.

Task:
- Return ONLY valid JSON in this exact shape:
{
  "news": [
    {
      "title": "...",
      "body": "...",
      "source": {
        "name": "Publication Name",
        "url": "https://example.com/article"
      }
    }
  ],
  "perspective": "...",
  "curiosity": {
    "text": "..."
  }
}

Revision rules:
- Resolve each editor issue explicitly.
- Keep exactly 5 news stories.
- Keep the perspective thematic (not a list of stories) and specific about WHAT is shifting, WHY now, and WHO is affected.
- Keep the perspective personable and memorable:
  * first-person singular voice
  * direct reader context ("if you're..." / "if your team...")
  * at least 2 concrete anchors from today's stories
  * no generic opener like "Today's stories underscore..."
- Improve theme diversity: avoid over-indexing on one theme unless unavoidable from input.
- Use active voice and concrete implications.
- For superlative factual claims (e.g., "first", "largest", "only"), either confirm from provided story context or hedge with attribution (e.g., "reported as").
- Preserve source name and URL fields for each story.
- Curiosity must remain independent from the news section.
"""),
        ("user", "Editor feedback:\n\n{feedback}\n\nCurrent draft JSON:\n\n{draft}"),
    ])
    revision_chain = revision_prompt_template | writer_llm

    # 6. Run the agents in a chain
    print("--- Starting Researcher Agent ---")
    # The unified researcher now finds BOTH main stories AND What's Hot items in a single pass
    research_result = researcher_executor.invoke({"input": "Please research the latest news from my list of sources."})

    # 6.5. Parse Researcher output into structured JSON for deduplication
    # Parser now extracts both stories and whats_hot from the unified output
    print("\n--- Parsing Researcher Output (Stories + What's Hot) ---")
    parser_result = parser_chain.invoke({"input": research_result['output']})

    parsed_stories = None
    whats_hot_items = []
    try:
        parsed_text = parser_result.content.strip().replace("```json", "").replace("```", "").strip()
        parsed_data = json.loads(parsed_text)
        # Extract stories and whats_hot from unified parser output
        parsed_stories = parsed_data.get('stories', [])
        whats_hot_items = parsed_data.get('whats_hot', [])

        # Keep only PASS-gated stories when present, and sort by final_score desc for downstream selection
        if isinstance(parsed_stories, list) and parsed_stories:
            pass_gated = [s for s in parsed_stories if str(s.get('gate', '')).upper() == 'PASS']
            if pass_gated:
                parsed_stories = pass_gated

            parsed_stories = sorted(
                parsed_stories,
                key=lambda s: float(s.get('final_score', 0) or 0),
                reverse=True,
            )

        print(f"✅ Parsed {len(parsed_stories)} stories and {len(whats_hot_items)} What's Hot items from Researcher output")
    except (json.JSONDecodeError, AttributeError) as e:
        print(f"⚠️ Failed to parse Researcher output: {e}")
        print("Falling back to raw Researcher output for Writer")
        parsed_stories = None
        whats_hot_items = []

    # 6.6. Deduplicate against recent stories (BEFORE Writer sees them)
    # Uses hybrid detection: entity extraction + word similarity + semantic embeddings
    if parsed_stories and recent_stories:
        print(f"\n🔍 Deduplication: Checking {len(parsed_stories)} stories against {len(recent_stories)} recent stories...")
        print("   Using hybrid detection (entities + words + embeddings)")

        # Filter out stories that are too similar to recent coverage
        # Hybrid mode catches stories about same event even with different wording
        filtered_stories, removed_stories = filter_against_history(
            new_stories=parsed_stories,
            historical_stories=recent_stories,
            use_hybrid=True,
            use_embeddings=True,
            verbose=True
        )

        if removed_stories:
            print(f"\n⚠️ Removed {len(removed_stories)} duplicate stories:")
            for item in removed_stories:
                print(f"   - {item['story'].get('title', 'Untitled')[:60]}...")
                print(f"     Reason: {item['reason']}")

        # Handle edge case: all stories were duplicates
        if not filtered_stories:
            print("⚠️ All stories were duplicates! Falling back to raw Researcher output")
            writer_input = research_result['output']
        else:
            print(f"✅ {len(filtered_stories)} unique stories passed to Writer")
            writer_input = json.dumps(filtered_stories, indent=2)
    elif parsed_stories:
        print("ℹ️ No recent stories to deduplicate against")
        writer_input = json.dumps(parsed_stories, indent=2)
    else:
        # Fallback to raw output if parsing failed
        writer_input = research_result['output']

    print("\n--- Starting Writer Agent ---")
    final_result_chain = writer_chain.invoke({"input": writer_input})

    # 7. Parse writer output and independently generate curiosity
    try:
        output_text = final_result_chain.content.strip().replace("```json", "").replace("```", "").strip()
        output_json = json.loads(output_text)
    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print("\n--- FAILED to parse writer JSON output. ---")
        print(f"Error: {e}")
        print("Raw Writer Output:")
        print(final_result_chain.content if hasattr(final_result_chain, 'content') else final_result_chain)
        return

    print("\n--- Starting Curiosity Agent ---")
    curiosity_payload = json.dumps(output_json.get('news', []), indent=2)

    curiosity_obj = None
    max_attempts = 6
    min_novelty_threshold = 0.70
    for attempt in range(1, max_attempts + 1):
        try:
            curiosity_result = curiosity_chain.invoke({"input": curiosity_payload})
            curiosity_text = curiosity_result.content.strip().replace("```json", "").replace("```", "").strip()
            candidate = json.loads(curiosity_text)
            candidate_text = candidate.get('text', '').strip() if isinstance(candidate, dict) else ''

            if not candidate_text:
                print(f"⚠️ Curiosity attempt {attempt}/{max_attempts} returned empty text")
                continue

            novelty = curiosity_novelty_score(candidate_text, recent_curiosities)
            too_similar = curiosity_too_similar(candidate_text, recent_curiosities)
            if too_similar or novelty < min_novelty_threshold:
                print(
                    f"⚠️ Curiosity attempt {attempt}/{max_attempts} rejected "
                    f"(too_similar={too_similar}, novelty={novelty:.2f}); retrying"
                )
                continue

            curiosity_obj = {"text": candidate_text}
            print(f"✅ Curiosity accepted on attempt {attempt} with novelty score {novelty:.2f}")
            break
        except Exception as e:
            print(f"⚠️ Curiosity attempt {attempt}/{max_attempts} failed: {e}")

    if not curiosity_obj:
        fallback_text = select_fallback_curiosity(recent_curiosities)
        curiosity_obj = {"text": fallback_text}
        print("⚠️ Using curated fallback curiosity fact after repeated invalid/similar attempts")

    output_json['curiosity'] = curiosity_obj

    # 8. Run the Editor Agent for quality control
    print("\n--- Starting Editor Review ---")
    editor_result = editor_chain.invoke({"input": json.dumps(output_json, indent=2)})
    print(f"Editor verdict: {editor_result.content}")

    # If editor suggests revisions, we'll still proceed but log the feedback
    if "NEEDS_REVISION" in editor_result.content:
        print("\n⚠️ Editor flagged issues but proceeding with publication:")
        print(editor_result.content)

        # Single revision pass using the editor's exact feedback.
        try:
            revised_result = revision_chain.invoke({
                "feedback": editor_result.content,
                "draft": json.dumps(output_json, indent=2),
            })
            revised_text = revised_result.content.strip().replace("```json", "").replace("```", "").strip()
            revised_json = json.loads(revised_text)

            if isinstance(revised_json, dict) and isinstance(revised_json.get('news'), list) and len(revised_json['news']) == 5:
                output_json = revised_json
                print("✅ Applied one revision pass based on editor feedback")
            else:
                print("⚠️ Revision pass returned invalid shape/count; keeping original writer output")
        except Exception as e:
            print(f"⚠️ Revision pass failed: {e}")

    # 9. Save the final output to a file
    try:
        # Safety net: Within-day deduplication only
        # Historical dedup is now handled BEFORE the Writer (see step 6.6)
        # This catches only nearly identical copies that might slip through
        if 'news' in output_json and isinstance(output_json['news'], list):
            original_count = len(output_json['news'])
            output_json['news'] = deduplicate_stories(output_json['news'], similarity_threshold=0.9)
            final_count = len(output_json['news'])

            if original_count != final_count:
                print(f"⚠️ Safety net: Removed {original_count - final_count} near-identical stories from final output")

        # Cross-section dedup: remove What's Hot items already present in Top News
        if whats_hot_items:
            filtered_hot, removed_hot = deduplicate_whats_hot_against_news(
                news_items=output_json.get('news', []),
                whats_hot_items=whats_hot_items,
            )
            output_json['whats_hot'] = filtered_hot

            if removed_hot:
                print(f"⚠️ Removed {len(removed_hot)} What's Hot items duplicated in Top News")
                for entry in removed_hot:
                    item = entry.get('item', {})
                    company = item.get('company', 'Unknown company') if isinstance(item, dict) else 'Unknown company'
                    print(f"   - {company}: {entry.get('reason', 'duplicate')}")

            print(f"✅ Added {len(filtered_hot)} items to What's Hot section")
        else:
            output_json['whats_hot'] = []
            print("ℹ️ No items for What's Hot section")

        output_path = "web/public/newsletter.json"
        with open(output_path, 'w') as f:
            json.dump(output_json, f, indent=2)

        updated_curiosity_history = merge_curiosity_histories(
            [{"date": datetime.now().strftime("%Y-%m-%d"), "text": output_json['curiosity'].get('text', '')}],
            curiosity_history,
        )
        save_local_curiosity_history(updated_curiosity_history, limit=365)

        print(f"\n--- Newsletter successfully saved to {output_path} ---")
        print("Final JSON output:")
        print(json.dumps(output_json, indent=2))
        
    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print(f"\n--- FAILED to parse or save the final JSON. ---")
        print(f"Error: {e}")
        print("Raw AI Output:")
        # Print the raw content for debugging
        print(final_result_chain.content if hasattr(final_result_chain, 'content') else final_result_chain)

if __name__ == "__main__":
    main()
