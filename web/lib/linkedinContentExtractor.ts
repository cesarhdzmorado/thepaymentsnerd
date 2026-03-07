/**
 * LinkedIn Content Extractor
 *
 * Transforms newsletter.json into LinkedIn-ready formats.
 * Handles character limits (3000 max), hashtag generation, and multiple posting strategies.
 *
 * Phase 2: Integrates template library and strategy engine for varied,
 * content-aware posts.
 */

import type { NewsletterContent, WhatsHotItem } from "@/components/home/HomeSections";
import {
  detectVibe,
  getDigestHook,
  getTopStoryHook,
  getCTA,
  generateTrailerPost,
} from "./linkedinPostTemplates";
import { selectStrategy, type Strategy } from "./linkedinStrategy";

const LINKEDIN_CHAR_LIMIT = 3000;
const NEWSLETTER_URL = "https://thepaymentsnerd.co";

interface LinkedInFormat {
  post_text: string;
  character_count: number;
  hashtags: string[];
  estimated_read_time: string;
}

interface MultiPostFormat {
  post_text: string;
  character_count: number;
  hashtags: string[];
}

export interface LinkedInContent {
  recommended_strategy: "daily_digest" | "top_story" | "multi_post" | "deals_roundup" | "trailer";
  formats: {
    daily_digest?: LinkedInFormat;
    top_story?: LinkedInFormat;
    multi_post?: MultiPostFormat[];
    deals_roundup?: LinkedInFormat;
    trailer?: LinkedInFormat;
  };
}

export interface LinkedInMetadata {
  story_count: number;
  whats_hot_count: number;
  has_breaking_news: boolean;
  primary_topics: string[];
}

// ---------------------------------------------------------------------------
// Topic & Hashtag Extraction
// ---------------------------------------------------------------------------

/**
 * Extract primary topics from newsletter stories for hashtag generation
 */
function extractTopics(content: NewsletterContent): string[] {
  const topics = new Set<string>();

  const keywords = [
    "AI", "Fintech", "Payments", "Blockchain", "Crypto", "Stablecoin", "M&A",
    "Funding", "RegTech", "Open Banking", "Digital Wallet", "BNPL", "Embedded Finance",
    "Cross-Border", "Real-Time Payments", "Tokenization", "Web3", "DeFi", "Banking",
    "Cards", "ACH", "Wire Transfer", "Settlement", "Compliance", "KYC", "AML",
    "Visa", "Mastercard", "PayPal", "Stripe", "Block", "Square", "Plaid", "Adyen",
    "Checkout", "Worldpay", "FIS", "Fiserv", "Jack Henry"
  ];

  const allText = [
    ...content.news.map(n => `${n.title} ${n.body}`),
    content.perspective || "",
    ...content.whats_hot?.map(h => `${h.company} ${h.description}`) || []
  ].join(" ");

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(allText)) {
      topics.add(keyword.replace(/\s+/g, ""));
    }
  });

  topics.add("Payments");
  topics.add("Fintech");

  return Array.from(topics).slice(0, 8);
}

function generateHashtags(topics: string[]): string[] {
  return topics.map(topic => `#${topic}`);
}

function estimateReadTime(text: string): string {
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min`;
}

function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + "...";
}

// ---------------------------------------------------------------------------
// What's Hot Formatting
// ---------------------------------------------------------------------------

function formatWhatsHot(whatsHot: WhatsHotItem[]): string {
  if (whatsHot.length === 0) return "";

  const lines = whatsHot.map(item => {
    const typeEmoji = {
      fundraising: "💰",
      "M&A": "🤝",
      product: "🚀",
      expansion: "🌍"
    }[item.type] || "📌";

    return `${item.flag} ${typeEmoji} ${item.company} - ${item.description}`;
  });

  return `\n\n🔥 What's Hot:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Format Generators
// ---------------------------------------------------------------------------

/**
 * Generate daily digest format (single post with all stories)
 */
function generateDailyDigest(content: NewsletterContent, topics: string[], seed?: string): LinkedInFormat {
  const hashtags = generateHashtags(topics);
  const vibe = detectVibe(content);
  const hook = getDigestHook(vibe, seed);
  const cta = getCTA(seed);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  let post = `${hook} — ${today}\n\n`;

  // Vibe-aware intro line
  const introLines: Record<string, string> = {
    breaking: "Major developments hitting the wire:\n\n",
    deals_heavy: "The money is talking today:\n\n",
    regulatory: "Regulators made moves — here's the breakdown:\n\n",
    normal: "Five critical insights shaping the industry:\n\n",
    light: "A quick look at what matters today:\n\n",
  };
  post += introLines[vibe] ?? introLines.normal;

  // Add numbered stories
  content.news.forEach((story, index) => {
    post += `${index + 1}. ${story.title}\n`;
    post += `   ${story.body.substring(0, 200)}${story.body.length > 200 ? "..." : ""}\n\n`;
  });

  // Add perspective if it fits
  if (content.perspective) {
    const perspectiveText = `💡 The Bottom Line:\n${content.perspective}\n\n`;
    if ((post + perspectiveText).length < LINKEDIN_CHAR_LIMIT - 200) {
      post += perspectiveText;
    }
  }

  // Add What's Hot if it fits
  if (content.whats_hot && content.whats_hot.length > 0) {
    const whatsHotText = formatWhatsHot(content.whats_hot);
    if ((post + whatsHotText).length < LINKEDIN_CHAR_LIMIT - 150) {
      post += whatsHotText;
    }
  }

  post += `\n\n${cta}\n\n`;
  post += hashtags.join(" ");

  post = truncateText(post, LINKEDIN_CHAR_LIMIT);

  return {
    post_text: post,
    character_count: post.length,
    hashtags,
    estimated_read_time: estimateReadTime(post)
  };
}

/**
 * Generate top story format (lead story only with CTA)
 */
function generateTopStory(content: NewsletterContent, topics: string[], seed?: string): LinkedInFormat {
  const hashtags = generateHashtags(topics);
  const vibe = detectVibe(content);
  const hook = getTopStoryHook(vibe, seed);
  const cta = getCTA((seed ?? "") + "-top");
  const leadStory = content.news[0];

  if (!leadStory) {
    throw new Error("No lead story found in newsletter");
  }

  let post = `${hook}\n\n`;
  post += `📰 ${leadStory.title}\n\n`;
  post += `${leadStory.body}\n\n`;

  if (content.perspective) {
    post += `💡 Why it matters:\n${content.perspective}\n\n`;
  }

  post += `🔗 Source: ${leadStory.source.name}\n`;
  post += `${leadStory.source.url}\n\n`;

  post += `${cta}\n\n`;
  post += hashtags.join(" ");

  post = truncateText(post, LINKEDIN_CHAR_LIMIT);

  return {
    post_text: post,
    character_count: post.length,
    hashtags,
    estimated_read_time: estimateReadTime(post)
  };
}

/**
 * Generate multi-post format (array of individual posts for each story)
 */
function generateMultiPost(content: NewsletterContent, topics: string[]): MultiPostFormat[] {
  const hashtags = generateHashtags(topics);

  return content.news.map((story, index) => {
    let post = `${index + 1}/${content.news.length} — ${story.title}\n\n`;
    post += `${story.body}\n\n`;
    post += `🔗 ${story.source.name}: ${story.source.url}\n\n`;
    post += hashtags.slice(0, 5).join(" ");

    return {
      post_text: truncateText(post, LINKEDIN_CHAR_LIMIT),
      character_count: post.length,
      hashtags: hashtags.slice(0, 5)
    };
  });
}

/**
 * Generate deals roundup format (What's Hot focused)
 */
function generateDealsRoundup(content: NewsletterContent): LinkedInFormat | null {
  if (!content.whats_hot || content.whats_hot.length === 0) {
    return null;
  }

  const hashtags = generateHashtags(["Funding", "M&A", "Fintech", "Venture", "Deals"]);
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });

  let post = `💰 Fintech Deals Roundup — ${today}\n\n`;

  const byType = content.whats_hot.reduce((acc, item) => {
    const type = item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, WhatsHotItem[]>);

  Object.entries(byType).forEach(([type, items]) => {
    const typeEmoji = {
      fundraising: "💰",
      "M&A": "🤝",
      product: "🚀",
      expansion: "🌍"
    }[type] || "📌";

    post += `${typeEmoji} ${type.toUpperCase()}\n`;
    items.forEach(item => {
      post += `${item.flag} ${item.company} — ${item.description}\n`;
    });
    post += `\n`;
  });

  post += `📬 Get daily fintech insights: ${NEWSLETTER_URL}\n\n`;
  post += hashtags.join(" ");

  post = truncateText(post, LINKEDIN_CHAR_LIMIT);

  return {
    post_text: post,
    character_count: post.length,
    hashtags,
    estimated_read_time: estimateReadTime(post)
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Generate metadata for content analysis
 */
export function generateMetadata(content: NewsletterContent): LinkedInMetadata {
  const topics = extractTopics(content);

  const urgentKeywords = ["breaking", "exclusive", "urgent", "alert", "just in", "announced today"];
  const hasBreakingNews = content.news.some(story =>
    urgentKeywords.some(keyword =>
      story.title.toLowerCase().includes(keyword) ||
      story.body.toLowerCase().includes(keyword)
    )
  );

  return {
    story_count: content.news.length,
    whats_hot_count: content.whats_hot?.length || 0,
    has_breaking_news: hasBreakingNews,
    primary_topics: topics
  };
}

// ---------------------------------------------------------------------------
// Main Extractor
// ---------------------------------------------------------------------------

/**
 * Main function to extract and format LinkedIn content from newsletter.
 *
 * Uses the strategy engine for recommendations and the template library
 * for varied, content-aware formatting. Backward compatible — the response
 * shape is the same as Phase 1 with `trailer` added to `formats`.
 *
 * @param content - Newsletter content
 * @param strategyOverride - Force a specific strategy
 */
export function extractLinkedInContent(
  content: NewsletterContent,
  strategyOverride?: Strategy
): LinkedInContent {
  const topics = extractTopics(content);
  const vibe = detectVibe(content);
  const seed = new Date().toISOString().slice(0, 10);

  // Use the strategy engine for recommendation
  const strategyResult = selectStrategy(content, strategyOverride);

  const formats: LinkedInContent["formats"] = {
    daily_digest: generateDailyDigest(content, topics, seed),
    top_story: generateTopStory(content, topics, seed),
    multi_post: generateMultiPost(content, topics),
  };

  // Deals roundup — only if What's Hot exists
  const dealsRoundup = generateDealsRoundup(content);
  if (dealsRoundup) {
    formats.deals_roundup = dealsRoundup;
  }

  // Trailer post — always generate
  const hashtags = generateHashtags(topics);
  const trailer = generateTrailerPost(content, vibe, hashtags, seed);
  formats.trailer = {
    ...trailer,
    estimated_read_time: estimateReadTime(trailer.post_text),
  };

  return {
    recommended_strategy: strategyResult.recommended,
    formats
  };
}
