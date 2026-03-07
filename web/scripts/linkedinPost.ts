#!/usr/bin/env tsx

/**
 * LinkedIn Posting Script
 *
 * End-to-end script that fetches today's newsletter content, selects a
 * posting strategy, and posts to LinkedIn. Designed to run daily via
 * OpenClaw cron on the Mac mini (~09:15 UTC).
 *
 * Usage:
 *   cd web
 *   npx tsx scripts/linkedinPost.ts                          # Post today's newsletter
 *   npx tsx scripts/linkedinPost.ts --dry-run                # Preview without posting
 *   npx tsx scripts/linkedinPost.ts --date 2026-03-07        # Specific date
 *   npx tsx scripts/linkedinPost.ts --strategy trailer       # Force strategy
 */

import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createPost, loadTokens } from "../lib/linkedinClient";
import { extractLinkedInContent } from "../lib/linkedinContentExtractor";
import type { NewsletterContent } from "../components/home/HomeSections";
import type { Strategy } from "../lib/linkedinStrategy";
import type { LinkedInContent } from "../lib/linkedinContentExtractor";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

const flagDryRun = args.includes("--dry-run");
const argDate = getArg("date");
const argStrategy = getArg("strategy") as Strategy | undefined;

const VALID_STRATEGIES: Strategy[] = ["trailer", "daily_digest", "top_story", "multi_post", "deals_roundup"];
if (argStrategy && !VALID_STRATEGIES.includes(argStrategy)) {
  console.error(`❌ Invalid strategy: ${argStrategy}`);
  console.error(`   Valid: ${VALID_STRATEGIES.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createClient<any>>;

function getSupabase(): AnySupabase | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Content Fetching
// ---------------------------------------------------------------------------

interface ApiResponse {
  ok: boolean;
  date: string;
  raw_content: NewsletterContent;
  linkedin_ready: LinkedInContent;
}

/**
 * Fetch LinkedIn-ready content from the API endpoint.
 */
async function fetchFromApi(date: string): Promise<ApiResponse | null> {
  const secret = process.env.LINKEDIN_CONTENT_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    console.log("⚠️  No LINKEDIN_CONTENT_SECRET or CRON_SECRET set — skipping API fetch.");
    return null;
  }

  const url = `https://thepaymentsnerd.co/api/linkedin-content?date=${date}&secret=${encodeURIComponent(secret)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`⚠️  API returned ${res.status} for date ${date}.`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.log(`⚠️  API fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Fallback: load newsletter.json from disk and run the extractor locally.
 */
function fetchFromDisk(): { content: NewsletterContent; linkedinReady: LinkedInContent } | null {
  const jsonPath = path.resolve(__dirname, "../public/newsletter.json");
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  newsletter.json not found at ${jsonPath}.`);
    return null;
  }

  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const content = JSON.parse(raw) as NewsletterContent;
    const linkedinReady = extractLinkedInContent(content, argStrategy);
    return { content, linkedinReady };
  } catch (err) {
    console.log(`⚠️  Failed to parse newsletter.json: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supabase Tracking
// ---------------------------------------------------------------------------

async function trackPost(
  supabase: AnySupabase,
  date: string,
  strategy: string,
  postText: string,
  result: { success: boolean; post_id?: string; post_url?: string; error?: string }
) {
  try {
    // Upsert into linkedin_posts
    await supabase.from("linkedin_posts").upsert(
      {
        newsletter_date: date,
        status: result.success ? "posted" : "failed",
        strategy,
        linkedin_post_id: result.post_id || null,
        linkedin_url: result.post_url || null,
        post_text: postText,
        character_count: postText.length,
        posted_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
        retry_count: 1,
      },
      { onConflict: "newsletter_date" }
    );

    // Insert log entry
    await supabase.from("linkedin_logs").insert({
      newsletter_date: date,
      event_type: result.success ? "post_success" : "post_failed",
      message: result.success
        ? `Posted to LinkedIn (${strategy}): ${result.post_url}`
        : `Posting failed: ${result.error}`,
      metadata: {
        strategy,
        post_id: result.post_id,
        character_count: postText.length,
        dry_run: false,
      },
    });
  } catch (err) {
    console.error("⚠️  Failed to track post in Supabase:", err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const date = argDate || todayISO();

  console.log("=".repeat(60));
  console.log("📮 LinkedIn Posting Script — The Payments Nerd");
  console.log("=".repeat(60));
  console.log(`Date:     ${date}`);
  console.log(`Strategy: ${argStrategy || "auto (engine recommendation)"}`);
  console.log(`Dry run:  ${flagDryRun}`);
  console.log("");

  // 1. Verify tokens exist (skip actual validation in dry-run if tokens missing)
  if (!flagDryRun) {
    try {
      loadTokens();
      console.log("✅ LinkedIn tokens loaded.");
    } catch (err) {
      console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  } else {
    try {
      loadTokens();
      console.log("✅ LinkedIn tokens loaded.");
    } catch {
      console.log("ℹ️  No LinkedIn tokens found (OK for dry run).");
    }
  }

  // 2. Fetch content
  console.log("📡 Fetching newsletter content...");

  let linkedinReady: LinkedInContent;
  let contentDate = date;

  const apiData = await fetchFromApi(date);
  if (apiData) {
    console.log("✅ Content fetched from API.");
    linkedinReady = apiData.linkedin_ready;
    contentDate = apiData.date;

    // If strategy override, re-extract with override
    if (argStrategy) {
      linkedinReady = extractLinkedInContent(apiData.raw_content, argStrategy);
    }
  } else {
    console.log("📂 Falling back to local newsletter.json...");
    const diskData = fetchFromDisk();
    if (!diskData) {
      console.error("❌ No content available — API and local file both failed.");
      process.exit(1);
    }
    console.log("✅ Content loaded from disk.");
    linkedinReady = diskData.linkedinReady;
  }

  // 3. Select strategy and get post text
  const strategy = argStrategy || linkedinReady.recommended_strategy;
  const format = linkedinReady.formats[strategy];

  if (!format) {
    console.error(`❌ No format available for strategy: ${strategy}`);
    process.exit(1);
  }

  // For multi_post, use the first post (single post for now)
  const postText = Array.isArray(format) ? format[0].post_text : format.post_text;
  const charCount = Array.isArray(format) ? format[0].character_count : format.character_count;

  console.log("");
  console.log(`📝 Strategy: ${strategy}`);
  console.log(`📏 Characters: ${charCount}`);
  console.log("");
  console.log("-".repeat(60));
  console.log(postText);
  console.log("-".repeat(60));

  // 4. Dry run — stop here
  if (flagDryRun) {
    console.log("");
    console.log("🏁 Dry run complete — no post was made.");
    process.exit(0);
  }

  // 5. Post to LinkedIn
  console.log("");
  console.log("📮 Posting to LinkedIn...");

  const result = await createPost(postText);

  // 6. Track in Supabase
  const supabase = getSupabase();
  if (supabase) {
    await trackPost(supabase, contentDate, strategy, postText, result);
    console.log("📊 Result tracked in Supabase.");
  } else {
    console.log("ℹ️  Supabase not configured — skipping tracking.");
  }

  // 7. Report result
  console.log("");
  if (result.success) {
    console.log("=".repeat(60));
    console.log("✅ Successfully posted to LinkedIn!");
    if (result.post_url) console.log(`🔗 ${result.post_url}`);
    if (result.post_id) console.log(`🆔 ${result.post_id}`);
    console.log("=".repeat(60));
    process.exit(0);
  } else {
    console.error("=".repeat(60));
    console.error("❌ LinkedIn posting failed.");
    console.error(`   Error: ${result.error}`);
    console.error("=".repeat(60));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
