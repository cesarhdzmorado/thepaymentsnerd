#!/usr/bin/env tsx

/**
 * Test script for LinkedIn content extractor
 *
 * Usage:
 *   cd web
 *   npx tsx scripts/testLinkedInContent.ts
 */

import { extractLinkedInContent, generateMetadata } from "../lib/linkedinContentExtractor";
import type { NewsletterContent } from "../components/home/HomeSections";
import newsletter from "../public/newsletter.json";

const DIVIDER = "=".repeat(80);

function main() {
  console.log(DIVIDER);
  console.log("LinkedIn Content Extractor - Test Script");
  console.log(DIVIDER);
  console.log("");

  // Cast newsletter to correct type
  const content = newsletter as unknown as NewsletterContent;

  // Generate metadata
  console.log("📊 Newsletter Metadata");
  console.log("-".repeat(80));
  const metadata = generateMetadata(content);
  console.log(`Story Count: ${metadata.story_count}`);
  console.log(`What's Hot Count: ${metadata.whats_hot_count}`);
  console.log(`Has Breaking News: ${metadata.has_breaking_news}`);
  console.log(`Primary Topics: ${metadata.primary_topics.join(", ")}`);
  console.log("");

  // Extract LinkedIn content
  console.log("🔄 Extracting LinkedIn Content...");
  console.log("-".repeat(80));
  const linkedinContent = extractLinkedInContent(content);
  console.log(`Recommended Strategy: ${linkedinContent.recommended_strategy}`);
  console.log("");

  // Display each format
  if (linkedinContent.formats.daily_digest) {
    console.log(DIVIDER);
    console.log("📝 DAILY DIGEST FORMAT");
    console.log(DIVIDER);
    const digest = linkedinContent.formats.daily_digest;
    console.log(`Character Count: ${digest.character_count} / 3000`);
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

  if (linkedinContent.formats.top_story) {
    console.log(DIVIDER);
    console.log("📰 TOP STORY FORMAT");
    console.log(DIVIDER);
    const topStory = linkedinContent.formats.top_story;
    console.log(`Character Count: ${topStory.character_count} / 3000`);
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

  if (linkedinContent.formats.multi_post && linkedinContent.formats.multi_post.length > 0) {
    console.log(DIVIDER);
    console.log("📚 MULTI-POST FORMAT");
    console.log(DIVIDER);
    const multiPost = linkedinContent.formats.multi_post;
    console.log(`Total Posts: ${multiPost.length}`);
    console.log("");

    multiPost.forEach((post, index) => {
      console.log(`Post ${index + 1}/${multiPost.length}:`);
      console.log(`  Character Count: ${post.character_count} / 3000`);
      console.log(`  Hashtags: ${post.hashtags.join(" ")}`);
      console.log(`  Preview: ${post.post_text.substring(0, 150)}...`);
      console.log("");
    });
  }

  if (linkedinContent.formats.deals_roundup) {
    console.log(DIVIDER);
    console.log("💰 DEALS ROUNDUP FORMAT");
    console.log(DIVIDER);
    const deals = linkedinContent.formats.deals_roundup;
    console.log(`Character Count: ${deals.character_count} / 3000`);
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

  // Validation checks
  console.log(DIVIDER);
  console.log("✅ Validation Checks");
  console.log(DIVIDER);

  let allValid = true;

  // Check character limits
  Object.entries(linkedinContent.formats).forEach(([format, data]) => {
    if (Array.isArray(data)) {
      // Multi-post format
      data.forEach((post, index) => {
        if (post.character_count > 3000) {
          console.log(`❌ ${format}[${index}] exceeds 3000 characters: ${post.character_count}`);
          allValid = false;
        } else {
          console.log(`✓ ${format}[${index}]: ${post.character_count} chars`);
        }
      });
    } else if (data) {
      if (data.character_count > 3000) {
        console.log(`❌ ${format} exceeds 3000 characters: ${data.character_count}`);
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
    console.log("❌ Some formats exceed character limits - review truncation logic");
  }

  console.log("");
  console.log(DIVIDER);
  console.log("Test Complete!");
  console.log(DIVIDER);
}

main();
