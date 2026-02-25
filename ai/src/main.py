# ai/src/main.py

# This is the system-level hack for sqlite3
__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import yaml
import json
import os
from datetime import datetime, timedelta
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

            # Collect stories
            for story in news:
                previous_stories.append({
                    "title": story.get("title", ""),
                    "body": story.get("body", ""),
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


def format_recent_curiosities(recent_data, limit: int = 7):
    """Format recent curiosity facts so the Curiosity agent avoids repeats."""
    if not isinstance(recent_data, dict):
        return "No recent curiosity history available."

    curiosities = recent_data.get('curiosities', [])
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
    recent_curiosities = recent_data.get('curiosities', [])
    recent_curiosities_context = format_recent_curiosities(recent_data, limit=10)

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

2. **Story Evaluation** (Strategic Scoring):

   Score each story using this framework (0-30 points total):

   IMPACT (0-10 points):
   - Transaction volume affected (small/medium/large scale)
   - Number of institutions or users impacted
   - Geographic reach (regional vs global)

   STRATEGIC IMPORTANCE (0-10 points):
   - Does this change competitive dynamics? (new entrant, M&A, partnership)
   - Does this shift market power or business models?
   - Does this create new opportunities or existential threats?

   TIMELINESS (0-5 points):
   - Breaking news (< 12 hours) = 5
   - Very recent (12-48 hours) = 3-4
   - Important but older = 1-2

   ACTIONABILITY (0-5 points):
   - Can payments professionals act on this intelligence?
   - Does it require strategic response or present clear opportunities?
   - Does it include specific data points or metrics?

3. **Deep Analysis** (Insight Extraction):

   For the top 10 stories by score, extract:

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

   e) **CONTRARIAN ANGLE**:
      - What is everyone missing about this story?
      - Is the conventional take wrong?
      - What's the non-obvious implication?

   f) **PATTERN RECOGNITION**:
      - Is this part of a larger trend?
      - Have we seen similar moves recently?
      - What does this signal about industry direction?

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

   CONTRARIAN TAKE:
   [Non-obvious insight]

   PATTERN:
   [Related trend or signal]
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
        ("system", f"""You are the editorial voice of "/thepaymentsnerd" - a must-read intelligence brief for payments executives, fintech founders, and banking strategists.

Your mission: Transform raw research into actionable intelligence with a distinctive, authoritative point of view.

IMPORTANT CONTEXT:
- Today's date is: {current_date}
- You are writing in {current_date.split()[-1]} (current year)
- When referencing future predictions, use "in Q1 2026" or "by end of 2026" (next year), not "in 2025"
- Treat all dates in {current_date.split()[-1]} as present tense, not future

NARRATIVE CONTINUITY (Editorial Memory):
{narrative_context}

**NARRATIVE CONTINUITY GUIDELINES**

Use the editorial memory above to:

1. **BUILD ON PREVIOUS PERSPECTIVES** - If yesterday we said "stablecoins are shifting from retail to enterprise,"
   today's stablecoin story should acknowledge this: "Yesterday's enterprise stablecoin trend continues with..."
   or "Counter to yesterday's enterprise focus, today's news shows retail adoption surging..."

2. **AVOID REPETITIVE FRAMING** - If we've said "signals a shift" or "marks a pivot" recently, find fresh language:
   - Instead of: "This signals a shift in the payments landscape"
   - Try: "This accelerates the pattern we've tracked all week: [specific pattern]"
   - Or: "After three days of stablecoin news, today's story reveals WHY: [specific insight]"

3. **CONNECT RECURRING THEMES** - If the same theme (stablecoins, regulation, etc.) appears multiple days:
   - Reference the pattern: "This is the third stablecoin partnership this week, and together they reveal..."
   - Provide cumulative insight: "Combined with Monday's Visa move and yesterday's Stripe news, today's announcement confirms..."

4. **SPECIFY THE "SO WHAT"** - Never just say "signals a shift." Always specify:
   - WHAT is shifting (e.g., "regulatory posture", "enterprise adoption", "cross-border infrastructure")
   - WHY it matters NOW (e.g., "positioning for Q2 compliance deadlines", "ahead of FedNow's next phase")
   - WHO wins/loses (e.g., "traditional remittance providers face margin compression")

CURRENT INDUSTRY TRENDS (Editorial Context):

These are the key trends shaping the payments industry RIGHT NOW:

{trends_context}

Use this context to:
- Prioritize stories that signal shifts in these trends
- Connect individual stories to larger industry movements in your "perspective" section
- Frame implications through the lens of these trends when relevant

Important: These trends inform your editorial lens but don't override your judgment. You still have full autonomy to:
- Select stories based on strategic merit, even if not trend-aligned
- Identify patterns and trends not listed here
- Write perspectives that challenge these narratives
- Focus on non-trend stories when they're more important

CRITICAL - Company List Anti-Bias Guidelines:
The "Key Players" under each trend are for CONTEXT ONLY to help you:
- Understand the competitive landscape
- Recognize when multiple players signal a trend shift
- Identify winners/losers in your analysis

DO NOT:
- Prioritize stories simply because they mention a listed company
- Select stories about listed companies over more strategically important unlisted ones
- Assume listed companies are more newsworthy
- Ignore emerging players not on the list

Remember: A story about an unknown startup disrupting Circle or Stripe may be MORE important than
a routine announcement from a listed company. Select stories based on STRATEGIC MERIT, not name recognition.

BRAND VOICE:
- Authoritative but not academic (think Bloomberg Terminal, not journal)
- Opinionated but evidence-based (takes a stance, backs it with data)
- Forward-looking (tells readers what's coming, not just what happened)
- Insider perspective (writes like a payments exec, for payments execs)
- Contrarian when warranted (challenges conventional wisdom)

EDITORIAL PROCESS:

1. **Story Selection** (Choose 5 from the stories provided - input has been pre-filtered for duplicates):

   Prioritize stories that:
   - Have clear implications for payments infrastructure, business models, or strategy
   - Include specific data points, metrics, or market sizing
   - Affect multiple stakeholders or large market segments
   - Present competitive dynamics or strategic shifts
   - Offer contrarian or non-obvious insights

   Avoid stories that:
   - Are generic product launches without strategic impact
   - Lack specific details or actionable intelligence
   - Are purely descriptive without implications
   - Duplicate themes from other selected stories

2. **Story Structure** (For each of the 5 stories):

   **TITLE** (10-14 words):
   - Lead with the insight or implication, not just the news
   - Make it specific and data-driven when possible
   - Examples:
     * BAD: "Company X Launches New Product"
     * GOOD: "Stripe's $50B Stablecoin Push Threatens Visa's Cross-Border Dominance"
     * GOOD: "JPMorgan Blockchain Move Signals Banks Building What They Used to Buy"

   **BODY** (3-4 sentences following this structure):

   CRITICAL: Use ACTIVE VOICE throughout. Lead with the actor, not the action.
   - WRONG: "A partnership was announced between Stripe and..."
   - RIGHT: "Stripe announced a partnership with..."
   - WRONG: "This initiative could disrupt traditional services"
   - RIGHT: "This initiative threatens traditional services" OR "PayPal's move directly challenges..."

   Sentence 1 - THE WHAT (Facts + Data):
   - Lead with WHO did WHAT (active voice: "Visa launched...", "Regulators approved...")
   - Include specific metrics, dates, and stakeholders
   - Never start with passive constructions like "It was announced..." or "A deal was made..."

   Sentence 2 - THE SO WHAT (Impact):
   - Why this matters to payments professionals specifically
   - Use direct language: "This means...", "The impact:", "For payments teams..."
   - Implications for business models, infrastructure, or strategy

   Sentence 3 - THE NOW WHAT (Competitive/Strategic Angle):
   - Name specific winners and losers: "X gains...", "Y loses...", "Z must respond..."
   - What changes in the competitive landscape
   - OR: What second-order effects to watch for

   Sentence 4 (OPTIONAL) - THE TAKE:
   - Contrarian insight or forward-looking implication
   - Pattern recognition or trend connection
   - Actionable intelligence ("Watch for X", "This signals Y")

3. **What Matters Today** (The Nerd's Perspective - Required):

   After selecting the 5 stories, synthesize the day's intelligence in 2-3 sentences.

   CRITICAL: Write this as a THEMATIC INSIGHT, not a story summary.

   **THE TECHNIQUE:**
   Identify the single unifying thread or tension that connects today's most important stories,
   then explore that theme. Your job is to REFRAME what happened, not enumerate what happened.

   **NARRATIVE STRUCTURES (pick one):**

   A) THE LENS: Apply a recurring conceptual framework
      - "Everything is a payment rail now" — examine how a theme is showing up across stories
      - "The compliance paradox" — when regulation produces opposite effects
      - Pattern: "[Conceptual lens]. [How today's news fits]. [What it means]."
      - Example: "Everything is an acquiring play now. Whether it's Apple expanding tap-to-pay or Stripe's new treasury product, the real prize isn't transactions—it's owning the merchant relationship."

   B) THE REFRAME: Acknowledge the surface story, pivot to the real story
      - "The headline is about interchange rates. The real story is about..."
      - "Everyone's watching the IPO. I'm watching the footnote about..."
      - Pattern: "The obvious read is X. But actually, Y."
      - Example: "The obvious read on Visa's new fees is margin pressure. But actually, this is Visa signaling which payment flows they're willing to lose—and which ones they'll defend at all costs."

   C) THE THREAD: Identify what connects disparate stories
      - "Three different companies, three different continents, same bet"
      - "What do [A], [B], and [C] have in common? They're all asking..."
      - Pattern: "[Diverse elements]. [Unifying thread]. [Implication]."
      - Example: "A Brazilian neobank, a European PSP, and a US card network all made the same move this week: betting that embedded finance beats standalone apps. The distribution wars are here."

   D) THE STAKES: Connect directly to reader decisions
      - "If you're building on card rails, this week just changed your calculus"
      - "The window for [X strategy] is closing faster than most teams realize"
      - Pattern: "[Reader context]. [What changed]. [Action implication]."
      - Example: "If you're still treating instant payments as a nice-to-have, this week's Fed announcement just made it a competitive necessity. The grace period is over."

   E) THE TENSION: Frame as competing forces
      - "Two forces collided this week: [X] and [Y]. [Who's winning]."
      - "The industry wants [A]. Regulators want [B]. This week, [B] scored."
      - Pattern: "[Force 1] vs [Force 2]. [This week's development]. [Direction]."
      - Example: "Speed versus safety—the eternal payments tension—tilted toward speed this week. Three central banks signaled they're willing to accept more fraud risk for faster settlement. That's a regime change."

   **WHAT TO AVOID:**
   - DO NOT list stories: "Today's stories about X, Y, and Z..."
   - DO NOT enumerate: "First, we saw... Second, there was... Third..."
   - DO NOT use generic framing: "signals a shift" / "marks a pivot" (without specifying WHAT)
   - DO NOT summarize — your reader will read the stories; your job is to REFRAME them

   **QUALITY TEST:**
   Before finalizing, ask: "Could this perspective have been written without reading today's specific stories?"
   If yes, it's too generic. Rewrite with specific details that prove you digested the content.

   **NARRATIVE CONTINUITY:**
   If today's themes connect to previous days (see NARRATIVE CONTINUITY section above), weave that context
   naturally into your framing—don't announce it mechanically.

   Write in first-person ("I'm watching...", "What stands out...", "The real question is...")
   This appears BEFORE the stories and sets the editorial lens for how to read them.

4. **Quality Checklist** (Every newsletter must pass):
   - [ ] Every story passes the "So what?" test with clear implications
   - [ ] At least 3 stories include specific data/metrics
   - [ ] At least 2 stories have contrarian or non-obvious angles
   - [ ] No repetitive themes across the 5 stories
   - [ ] Every story identifies winners/losers or strategic impact
   - [ ] Language is active, specific, and punchy (no generic business jargon)
   - [ ] "What Matters Today" (perspective) provides synthesis and forward-looking view

OUTPUT FORMAT (MUST BE VALID JSON):

{{{{
  "news": [
    {{{{
      "title": "...",
      "body": "...",
      "source": {{{{
        "name": "Publication Name",
        "url": "https://example.com/article"
      }}}}
    }}}}
  ],
  "perspective": "..."
}}}}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown formatting, no additional text
- Escape all quotes and special characters properly
- Ensure exactly 5 news items (no more, no less)
- The "perspective" field is your editorial synthesis (2-3 sentences, ALWAYS required)
- **CRITICAL: For NEWS items, the "source" field must be an object with "name" and "url" properties**
- Extract the publication name and URL from the research source (if research shows "Source: Payments Dive - https://example.com", use {{{{"name": "Payments Dive", "url": "https://example.com"}}}}"""),
        ("user", "Here are the stories to select from (pre-filtered for duplicates):\n\n{input}"),
    ])
    
    # MODIFIED: Create a simple 'chain' for the writer, as it doesn't need tools.
    # This avoids the "empty functions" error.
    # Using latest gpt-4o-mini for improved reasoning and structured output
    writer_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0.1)
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
- Use a different angle, era, geography, rail, or mechanism than recent examples
- Prefer specific years, metrics, and concrete details
- Keep it surprising and educational

Return ONLY valid JSON in this exact shape:
{{
  "text": "..."
}}
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
- "contrarian_take": The CONTRARIAN TAKE section
- "pattern": The PATTERN section
- "second_order_effects": The SECOND-ORDER EFFECTS section

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
      "contrarian_take": "The contrarian angle",
      "pattern": "Related trend or signal",
      "second_order_effects": "What to watch for next"
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
- If a field is missing in the input, use an empty string ""
- If "WHATS_HOT: None found" or no What's Hot items present, return an empty array for "whats_hot"
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
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        curiosity_result = curiosity_chain.invoke({"input": curiosity_payload})
        try:
            curiosity_text = curiosity_result.content.strip().replace("```json", "").replace("```", "").strip()
            candidate = json.loads(curiosity_text)
            candidate_text = candidate.get('text', '').strip() if isinstance(candidate, dict) else ''

            if not candidate_text:
                print(f"⚠️ Curiosity attempt {attempt}/{max_attempts} returned empty text")
                continue

            if curiosity_too_similar(candidate_text, recent_curiosities):
                print(f"⚠️ Curiosity attempt {attempt}/{max_attempts} too similar to recent days; retrying")
                continue

            curiosity_obj = {"text": candidate_text}
            break
        except (json.JSONDecodeError, AttributeError, KeyError):
            print(f"⚠️ Curiosity attempt {attempt}/{max_attempts} produced invalid JSON")

    if not curiosity_obj:
        fallback_text = "Did you know ACH began as a way to replace paper checks in the 1970s, and now it moves trillions electronically each year?"
        curiosity_obj = {"text": fallback_text}
        print("⚠️ Using fallback curiosity fact after repeated invalid/similar attempts")

    output_json['curiosity'] = curiosity_obj

    # 8. Run the Editor Agent for quality control
    print("\n--- Starting Editor Review ---")
    editor_result = editor_chain.invoke({"input": json.dumps(output_json, indent=2)})
    print(f"Editor verdict: {editor_result.content}")

    # If editor suggests revisions, we'll still proceed but log the feedback
    if "NEEDS_REVISION" in editor_result.content:
        print("\n⚠️ Editor flagged issues but proceeding with publication:")
        print(editor_result.content)

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

        # Add What's Hot section to the output
        if whats_hot_items:
            output_json['whats_hot'] = whats_hot_items
            print(f"✅ Added {len(whats_hot_items)} items to What's Hot section")
        else:
            output_json['whats_hot'] = []
            print("ℹ️ No items for What's Hot section")

        output_path = "web/public/newsletter.json"
        with open(output_path, 'w') as f:
            json.dump(output_json, f, indent=2)

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
