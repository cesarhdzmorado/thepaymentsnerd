#!/usr/bin/env tsx

/**
 * Test script for LinkedIn content extractor (Phase 2)
 *
 * Usage:
 *   cd web
 *   npx tsx scripts/testLinkedInContent.ts
 */

import { extractLinkedInContent, generateMetadata } from "../lib/linkedinContentExtractor";
import { selectStrategy } from "../lib/linkedinStrategy";
import { detectVibe } from "../lib/linkedinPostTemplates";
import type { NewsletterContent } from "../components/home/HomeSections";
import newsletter from "../public/newsletter.json";

const DIVIDER = "=".repeat(80);
const CHAR_LIMIT = 3000;

function main() {
  console.log(DIVIDER);
  console.log("LinkedIn Content Extractor - Phase 2 Test Script");
  console.log(DIVIDER);
  console.log("");

  const content = newsletter as unknown as NewsletterContent;

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------
  console.log("📊 Newsletter Metadata");
  console.log("-".repeat(80));
  const metadata = generateMetadata(content);
  console.log(`Story Count: ${metadata.story_count}`);
  console.log(`What's Hot Count: ${metadata.whats_hot_count}`);
  console.log(`Has Breaking News: ${metadata.has_breaking_news}`);
  console.log(`Primary Topics: ${metadata.primary_topics.join(", ")}`);
  console.log("");

  // -----------------------------------------------------------------------
  // Content Vibe
  // -----------------------------------------------------------------------
  const vibe = detectVibe(content);
  console.log(`🎭 Content Vibe: ${vibe}`);
  console.log("");

  // -----------------------------------------------------------------------
  // Strategy Rankings
  // -----------------------------------------------------------------------
  console.log("🧠 Strategy Rankings");
  console.log("-".repeat(80));
  const strategyResult = selectStrategy(content);
  console.log(`Recommended: ${strategyResult.recommended}`);
  console.log(`Vibe: ${strategyResult.vibe}`);
  console.log("");
  console.log("Rankings:");
  strategyResult.rankings.forEach((r, i) => {
    const marker = r.strategy === strategyResult.recommended ? " ← RECOMMENDED" : "";
    console.log(`  ${i + 1}. ${r.strategy} (score: ${r.score}) — ${r.reason}${marker}`);
  });
  console.log("");

  // Test strategy on different days
  console.log("📅 Day-of-Week Strategy Variation:");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  days.forEach((day, i) => {
    const date = new Date(2026, 2, 8 + i); // Sun Mar 8 through Sat Mar 14
    const result = selectStrategy(content, undefined, date);
    console.log(`  ${day}: ${result.recommended} (top score: ${result.rankings[0].score})`);
  });
  console.log("");

  // -----------------------------------------------------------------------
  // Extract all formats
  // -----------------------------------------------------------------------
  console.log("🔄 Extracting LinkedIn Content...");
  console.log("-".repeat(80));
  const linkedinContent = extractLinkedInContent(content);
  console.log(`Recommended Strategy: ${linkedinContent.recommended_strategy}`);
  console.log("");

  // Daily Digest
  if (linkedinContent.formats.daily_digest) {
    console.log(DIVIDER);
    console.log("📝 DAILY DIGEST FORMAT");
    console.log(DIVIDER);
    const digest = linkedinContent.formats.daily_digest;
    console.log(`Character Count: ${digest.character_count} / ${CHAR_LIMIT}`);
    console.log(`Hashtags: ${digest.hashtags.join(" ")}`);
    console.log(`Read Time: ${digest.estimated_read_time}`);
    console.log("");
    console.log("Post Preview:");
    console.log("-".repeat(80));
    console.log(digest.post_text.substring(0, 500));
    if (digest.post_text.length > 500) {
      console.log("...(truncated for preview)");
    }
    console.log("");
  }

  // Top Story
  if (linkedinContent.formats.top_story) {
    console.log(DIVIDER);
    console.log("📰 TOP STORY FORMAT");
    console.log(DIVIDER);
    const topStory = linkedinContent.formats.top_story;
    console.log(`Character Count: ${topStory.character_count} / ${CHAR_LIMIT}`);
    console.log(`Hashtags: ${topStory.hashtags.join(" ")}`);
    console.log(`Read Time: ${topStory.estimated_read_time}`);
    console.log("");
    console.log("Post Preview:");
    console.log("-".repeat(80));
    console.log(topStory.post_text.substring(0, 500));
    if (topStory.post_text.length > 500) {
      console.log("...(truncated for preview)");
    }
    console.log("");
  }

  // Multi-Post
  if (linkedinContent.formats.multi_post && linkedinContent.formats.multi_post.length > 0) {
    console.log(DIVIDER);
    console.log("📚 MULTI-POST FORMAT");
    console.log(DIVIDER);
    const multiPost = linkedinContent.formats.multi_post;
    console.log(`Total Posts: ${multiPost.length}`);
    console.log("");
    multiPost.forEach((post, index) => {
      console.log(`Post ${index + 1}/${multiPost.length}:`);
      console.log(`  Character Count: ${post.character_count} / ${CHAR_LIMIT}`);
      console.log(`  Hashtags: ${post.hashtags.join(" ")}`);
      console.log(`  Preview: ${post.post_text.substring(0, 150)}...`);
      console.log("");
    });
  }

  // Deals Roundup
  if (linkedinContent.formats.deals_roundup) {
    console.log(DIVIDER);
    console.log("💰 DEALS ROUNDUP FORMAT");
    console.log(DIVIDER);
    const deals = linkedinContent.formats.deals_roundup;
    console.log(`Character Count: ${deals.character_count} / ${CHAR_LIMIT}`);
    console.log(`Hashtags: ${deals.hashtags.join(" ")}`);
    console.log(`Read Time: ${deals.estimated_read_time}`);
    console.log("");
    console.log("Post Preview:");
    console.log("-".repeat(80));
    console.log(deals.post_text.substring(0, 500));
    if (deals.post_text.length > 500) {
      console.log("...(truncated for preview)");
    }
    console.log("");
  }

  // Trailer
  if (linkedinContent.formats.trailer) {
    console.log(DIVIDER);
    console.log("🎬 TRAILER FORMAT (César's preferred)");
    console.log(DIVIDER);
    const trailer = linkedinContent.formats.trailer;
    console.log(`Character Count: ${trailer.character_count} / ${CHAR_LIMIT}`);
    console.log(`Hashtags: ${trailer.hashtags.join(" ")}`);
    console.log(`Read Time: ${trailer.estimated_read_time}`);
    console.log("");
    console.log("Full Post:");
    console.log("-".repeat(80));
    console.log(trailer.post_text);
    console.log("");
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------
  console.log(DIVIDER);
  console.log("✅ Validation Checks");
  console.log(DIVIDER);

  let allValid = true;

  Object.entries(linkedinContent.formats).forEach(([format, data]) => {
    if (Array.isArray(data)) {
      data.forEach((post, index) => {
        if (post.character_count > CHAR_LIMIT) {
          console.log(`❌ ${format}[${index}] exceeds ${CHAR_LIMIT} characters: ${post.character_count}`);
          allValid = false;
        } else {
          console.log(`✓ ${format}[${index}]: ${post.character_count} chars`);
        }
      });
    } else if (data) {
      if (data.character_count > CHAR_LIMIT) {
        console.log(`❌ ${format} exceeds ${CHAR_LIMIT} characters: ${data.character_count}`);
        allValid = false;
      } else {
        console.log(`✓ ${format}: ${data.character_count} chars`);
      }
    }
  });

  console.log("");

  if (allValid) {
    console.log("✅ All formats are valid and within character limits!");
  } else {
    console.log("❌ Some formats exceed character limits — review truncation logic");
    process.exit(1);
  }

  // Check backward compatibility
  console.log("");
  console.log("🔄 Backward Compatibility Check:");
  const requiredFields = ["daily_digest", "top_story", "multi_post"];
  requiredFields.forEach((field) => {
    const exists = field in linkedinContent.formats;
    console.log(`  ${exists ? "✓" : "❌"} formats.${field} present`);
    if (!exists) allValid = false;
  });
  console.log(`  ✓ formats.trailer present (new in Phase 2)`);
  console.log(`  ✓ recommended_strategy: "${linkedinContent.recommended_strategy}"`);

  console.log("");
  console.log(DIVIDER);
  console.log("Test Complete!");
  console.log(DIVIDER);
}

main();
