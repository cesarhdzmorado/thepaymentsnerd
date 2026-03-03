# ai/src/weekly_recap.py
# Weekly recap newsletter with extended analysis for slow news weeks

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
from .tools import search_tool, scrape_tool, rss_tool, deduplicate_stories

# Import helper functions from main
from .main import format_trends_for_prompt

def get_week_stories(days_back: int = 7):
    """
    Fetch all stories from the past week for recap analysis.

    Args:
        days_back: Number of days to look back (default 7 for full week)

    Returns:
        List of all stories from the week with metadata
    """
    try:
        # Initialize Supabase client
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            print("⚠️ Supabase credentials not found, cannot fetch weekly stories")
            return []

        supabase = create_client(supabase_url, supabase_key)

        # Calculate date range for the week
        today = datetime.now()
        start_of_week = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")

        print(f"📅 Fetching stories from {start_of_week} to {today.strftime('%Y-%m-%d')}")

        # Fetch all newsletters from this week
        response = supabase.table("newsletters") \
            .select("content, publication_date") \
            .gte("publication_date", start_of_week) \
            .lte("publication_date", today.strftime("%Y-%m-%d")) \
            .order("publication_date", desc=False) \
            .execute()

        # Extract all stories with their publication dates
        weekly_stories = []
        for newsletter in response.data:
            pub_date = newsletter.get("publication_date", "")
            content = newsletter.get("content", {})
            news = content.get("news", [])

            for story in news:
                weekly_stories.append({
                    "title": story.get("title", ""),
                    "body": story.get("body", ""),
                    "source": story.get("source", {}),
                    "date": pub_date
                })

        print(f"📚 Loaded {len(weekly_stories)} stories from this week across {len(response.data)} newsletters")
        return weekly_stories

    except Exception as e:
        print(f"⚠️ Error fetching weekly stories: {e}")
        return []

def format_weekly_stories_for_prompt(weekly_stories):
    """
    Format weekly stories for the AI recap prompt.
    """
    if not weekly_stories:
        return "No stories available from this week."

    # Group by date
    stories_by_date = {}
    for story in weekly_stories:
        date = story.get('date', 'Unknown')
        if date not in stories_by_date:
            stories_by_date[date] = []
        stories_by_date[date].append(story)

    formatted = []
    for date in sorted(stories_by_date.keys()):
        formatted.append(f"\n**{date}:**")
        for story in stories_by_date[date]:
            title = story.get('title', 'Untitled')
            source_name = story.get('source', {}).get('name', 'Unknown source')
            formatted.append(f"  - {title} ({source_name})")

    return "\n".join(formatted)

def main():
    """Generate weekly recap newsletter with extended analysis."""
    load_dotenv()

    print("\n" + "="*60)
    print("WEEKLY RECAP NEWSLETTER GENERATION")
    print("="*60 + "\n")

    # 1. Load Configuration
    with open('ai/config.yml', 'r') as file:
        config = yaml.safe_load(file)

    # Get current date
    current_date = datetime.now().strftime("%B %d, %Y")

    # Get all stories from this week
    weekly_stories = get_week_stories(days_back=7)
    weekly_stories_formatted = format_weekly_stories_for_prompt(weekly_stories)

    # Format trends
    current_trends = config.get('current_trends', [])
    trends_context = format_trends_for_prompt(current_trends)

    # News sources
    news_sources_str = "\n".join([f"- {s['url']} ({s['topic']})" for s in config['newsletters']])

    # 2. Initialize LLM and tools
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    tools = [search_tool, scrape_tool, rss_tool]

    # 3. Create Researcher Agent for finding this week's best new stories
    researcher_prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are researching stories for a WEEKLY RECAP newsletter for payments industry professionals.

CONTEXT:
- Today's date: {current_date}
- This is a FRIDAY RECAP because we had a slower news week
- We already covered these stories this week:

{weekly_stories_formatted}

YOUR MISSION:
Since this is a slower week, find 3-5 stories from our usual sources that either:
1. Were published this week but we MISSED (new stories we haven't covered)
2. Have SIGNIFICANT NEW DEVELOPMENTS since we last covered them
3. Are evergreen analysis/trends pieces that add strategic value

**🚨 CRITICAL ANTI-DUPLICATION PROTOCOL 🚨**

BEFORE selecting ANY story, CHECK THE "WE ALREADY COVERED" LIST ABOVE.

**MANDATORY CHECKLIST:**
1. Is this company/topic in our weekly coverage? → Check the list carefully
2. Does this story have NEW information not already covered? → Compare details
3. If it's the same event/announcement we covered → REJECT IMMEDIATELY

**EXPLICIT EXAMPLES:**

If we already covered "Barclays Invests in Ubyx for Stablecoin Settlement":
- ❌ REJECT: "Barclays makes stablecoin play with Ubyx" (same story, different source)
- ❌ REJECT: "Barclays enters tokenized money via Ubyx stake" (same event, reworded)
- ✅ ACCEPT: "Barclays Ubyx investment triggers competitor responses from HSBC, Citi" (NEW reactions)

If we already covered "Flutterwave Acquires Mono":
- ❌ REJECT: "Flutterwave buys Nigerian fintech Mono" (same acquisition)
- ✅ ACCEPT: "Flutterwave-Mono integration complete, processing 50K transactions/day" (NEW milestone)

**QUALITY OVER QUANTITY:**
- 3 excellent NEW stories >> 5 stories with 2 duplicates
- DO look for: follow-ups, new data, market reactions, competitive responses
- PREFER stories published in last 48 hours if possible
- Better to return 2-3 truly new stories than pad with duplicates

Sources to check:
{news_sources_str}

Current industry trends for context:
{trends_context}

OUTPUT FORMAT:
For each story, provide:

---
STORY [N] - [HEADLINE]

Source: [Publication] - [URL]

WHAT HAPPENED:
[2-3 sentences with facts and data]

WHY IT MATTERS:
[Strategic significance]

COMPETITIVE DYNAMICS:
[Who wins, who loses]

FORWARD LOOK:
[What to watch next week]
---

Return 3-5 stories maximum. Quality over quantity."""),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    researcher_agent = create_openai_functions_agent(llm, tools, researcher_prompt)
    researcher_executor = AgentExecutor(agent=researcher_agent, tools=tools, verbose=True)

    # 4. Create Writer Agent for weekly recap format
    writer_prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are the editorial voice of /thepaymentsnerd writing a WEEKLY RECAP newsletter.

CONTEXT:
- Today: {current_date} (Friday)
- This week was SLOWER for breaking news
- We're sending a recap because we only sent 1-3 daily newsletters this week

**🚨 CRITICAL: FINAL ANTI-DUPLICATION CHECK 🚨**

The Researcher should have filtered out duplicates, but YOU are the final gatekeeper.

Before selecting ANY story, verify it's not a duplicate of something we already covered this week.
If a story is about the SAME event with NO new information → REJECT IT.
Better to have 3 genuinely new stories than 5 stories with duplicates.

YOUR MISSION: Transform the research into a weekly recap with EXTENDED ANALYSIS.

WEEKLY RECAP FORMAT (Different from daily):

**INTRO (Required, 2-3 sentences):**
- Acknowledge slower week: "Slower week for breaking news, but here's what mattered..."
- Tease the week's theme or biggest story
- Set tone: strategic analysis over breaking news

**STORIES (3-5 stories with EXTENDED ANALYSIS):**

Each story should have:

**TITLE** (10-14 words):
- Same high-quality standards as daily newsletter
- Lead with insight

**BODY** (6-8 sentences - LONGER than daily):

Sentence 1-2: THE WHAT (Facts)
- What happened, when, who was involved
- Key metrics and data points

Sentence 3-4: THE WHY (Strategic Impact)
- Why this matters to payments professionals
- Business model / infrastructure implications

Sentence 5-6: THE HOW (Competitive Analysis)
- How this changes competitive dynamics
- Who benefits, who's threatened
- Second-order effects

Sentence 7-8: THE NEXT (Forward Looking)
- What to watch next week/month
- Predictions or trend signals
- Questions to consider

**PERSPECTIVE (Required, 3-4 sentences):**
- Use first-person singular voice with editorial conviction ("I'm watching...", "I think...")
- Address the reader directly once ("If you're..." / "If your team...")
- Include at least 2 concrete anchors from this week's stories (company, regulator, rail, metric, or market)
- Open with a memorable hook, not generic filler
- Connect the stories to larger trends
- Forward-looking view on next week
- End with a practical implication or question to ponder

**CURIOSITY (Same as daily):**
- Interesting fact, payments or general

**CRITICAL DIFFERENCES FROM DAILY:**
1. Stories are LONGER (6-8 sentences vs 3-4)
2. More analytical depth
3. Forward-looking "what's next" angle
4. Perspective includes "next week" preview

OUTPUT FORMAT (MUST BE VALID JSON):

{{
  "news": [
    {{
      "title": "...",
      "body": "6-8 sentence extended analysis...",
      "source": {{
        "name": "Publication Name",
        "url": "https://example.com/article"
      }}
    }}
  ],
  "perspective": "3-4 sentences: This week's synthesis + what to watch next week",
  "curiosity": {{
    "text": "...",
    "source": {{
      "name": "...",
      "url": "..."
    }}
  }}
}}

QUALITY CHECKS:
- Each story body is 6-8 sentences (count them!)
- Stories have clear "what's next" angle
- Perspective includes forward-looking view
- All JSON properly formatted

Return ONLY the JSON, no markdown formatting."""),
        ("user", "Here are this week's stories to analyze:\n\n{input}"),
    ])

    writer_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0.1)
    writer_chain = writer_prompt | writer_llm

    # 5. Create Editor for quality control
    editor_llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)

    editor_prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are the senior editor reviewing a WEEKLY RECAP newsletter.

This is different from the daily newsletter - it's a Friday recap for slower weeks with EXTENDED ANALYSIS.

WEEKLY RECAP QUALITY CHECKS:

1. **Story Length:**
   - Each story should be 6-8 sentences (count them!)
   - If shorter, it's not meeting recap standards

2. **Extended Analysis:**
   - Stories should have: facts, why it matters, competitive dynamics, forward look
   - Not just breaking news summary

3. **Forward-Looking:**
   - Each story should have "what to watch next" angle
   - Perspective should preview next week

4. **Intro Framing:**
   - Should acknowledge slower week
   - Set appropriate expectations (analysis over breaking news)

5. **Completeness:**
   - 3-5 stories (quality over quantity for slow weeks)
   - All required fields present
   - Proper JSON formatting

6. **Perspective Voice & Memorability:**
   - Uses first-person singular voice (not generic third-person analyst language)
   - Includes direct reader context ("if you're..." / "if your team...")
   - References at least 2 concrete anchors from the week's reporting
   - Opening line is specific and memorable, not boilerplate

RETURN FORMAT:

If passes all checks:
APPROVED

If needs revision:
NEEDS_REVISION:
- [Specific issue 1]
- [Specific issue 2]

Be thorough but fair."""),
        ("user", "Please review this weekly recap:\n\n{input}"),
    ])

    editor_chain = editor_prompt | editor_llm

    # 6. Run the pipeline
    print("\n--- Starting Researcher Agent ---")
    research_result = researcher_executor.invoke({
        "input": "Find the best stories from this week for our weekly recap."
    })

    print("\n--- Starting Writer Agent ---")
    writer_result = writer_chain.invoke({"input": research_result['output']})

    print("\n--- Starting Editor Review ---")
    editor_result = editor_chain.invoke({"input": writer_result.content})
    print(f"Editor verdict: {editor_result.content}")

    if "NEEDS_REVISION" in editor_result.content:
        print("\n⚠️ Editor flagged issues but proceeding with publication:")
        print(editor_result.content)

    # 7. Save the output
    try:
        output_text = writer_result.content.strip().replace("```json", "").replace("```", "").strip()
        output_json = json.loads(output_text)

        # Two-stage deduplication approach (same as daily newsletter)
        if 'news' in output_json and isinstance(output_json['news'], list):
            original_count = len(output_json['news'])

            # STAGE 1: Deduplicate against weekly stories (entire week)
            # Threshold 0.6 = catches similar stories but allows developing stories with new info
            if weekly_stories:
                print(f"\n🔍 Stage 1: Checking {original_count} stories against {len(weekly_stories)} weekly stories...")

                # Combine today's stories with weekly stories for comparison
                combined_stories = weekly_stories + output_json['news']

                # Deduplicate the combined list
                deduplicated_combined = deduplicate_stories(combined_stories, similarity_threshold=0.6)

                # Keep only the stories that are NEW (not in the weekly_stories list)
                new_stories = []
                for story in deduplicated_combined:
                    # Check if this story is from today (has same title/body as one of today's original stories)
                    is_from_today = any(
                        story.get('title') == today_story.get('title')
                        for today_story in output_json['news']
                    )
                    if is_from_today:
                        new_stories.append(story)

                output_json['news'] = new_stories
                stage1_count = len(output_json['news'])

                if original_count != stage1_count:
                    print(f"⚠️ Stage 1: Removed {original_count - stage1_count} duplicate stories from this week")

            # STAGE 2: Deduplicate within today's stories only
            # Using a very high threshold (0.9) to only catch nearly identical copies within today
            stage2_input_count = len(output_json['news'])
            output_json['news'] = deduplicate_stories(output_json['news'], similarity_threshold=0.9)
            stage2_count = len(output_json['news'])

            if stage2_input_count != stage2_count:
                print(f"⚠️ Stage 2: Removed {stage2_input_count - stage2_count} exact duplicate stories from today's output")

        output_path = "web/public/newsletter.json"
        with open(output_path, 'w') as f:
            json.dump(output_json, f, indent=2)

        print(f"\n--- Weekly recap successfully saved to {output_path} ---")
        print("Final JSON output:")
        print(json.dumps(output_json, indent=2))

    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print(f"\n--- FAILED to parse or save the final JSON. ---")
        print(f"Error: {e}")
        print("Raw AI Output:")
        print(writer_result.content if hasattr(writer_result, 'content') else writer_result)

if __name__ == "__main__":
    main()
