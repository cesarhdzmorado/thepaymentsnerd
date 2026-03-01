/**
 * LinkedIn Content Extractor
 *
 * Transforms newsletter.json into LinkedIn-ready formats.
 * Handles character limits (3000 max), hashtag generation, and multiple posting strategies.
 */

import type { NewsletterContent, NewsItem, WhatsHotItem } from "@/components/home/HomeSections";

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
  recommended_strategy: "daily_digest" | "top_story" | "multi_post" | "deals_roundup";
  formats: {
    daily_digest?: LinkedInFormat;
    top_story?: LinkedInFormat;
    multi_post?: MultiPostFormat[];
    deals_roundup?: LinkedInFormat;
  };
}

export interface LinkedInMetadata {
  story_count: number;
  whats_hot_count: number;
  has_breaking_news: boolean;
  primary_topics: string[];
}

/**
 * Extract primary topics from newsletter stories for hashtag generation
 */
function extractTopics(content: NewsletterContent): string[] {
  const topics = new Set<string>();

  // Common fintech/payments keywords to extract
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
    // Case-insensitive matching
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(allText)) {
      // Normalize to title case for hashtags
      topics.add(keyword.replace(/\s+/g, ""));
    }
  });

  // Always include core topics
  topics.add("Payments");
  topics.add("Fintech");

  return Array.from(topics).slice(0, 8); // Limit to 8 hashtags
}

/**
 * Generate hashtags from topics
 */
function generateHashtags(topics: string[]): string[] {
  return topics.map(topic => `#${topic}`);
}

/**
 * Estimate read time based on word count
 */
function estimateReadTime(text: string): string {
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200); // Average reading speed
  return `${minutes} min`;
}

/**
 * Truncate text to fit character limit with ellipsis
 */
function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + "...";
}

/**
 * Format "What's Hot" section for LinkedIn
 */
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

/**
 * Generate daily digest format (single post with all 5 stories)
 */
function generateDailyDigest(content: NewsletterContent, topics: string[]): LinkedInFormat {
  const hashtags = generateHashtags(topics);
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  let post = `🚀 Today in Payments — ${today}\n\n`;
  post += `Five critical insights shaping the industry:\n\n`;

  // Add numbered stories
  content.news.forEach((story, index) => {
    post += `${index + 1}. ${story.title}\n`;
    post += `   ${story.body.substring(0, 200)}${story.body.length > 200 ? "..." : ""}\n\n`;
  });

  // Add perspective if it fits
  if (content.perspective) {
    const perspectiveHeader = `💡 The Bottom Line:\n`;
    const perspectiveText = `${perspectiveHeader}${content.perspective}\n\n`;

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

  // Add CTA and hashtags
  post += `\n\n📬 Get the full analysis in your inbox daily: ${NEWSLETTER_URL}\n\n`;
  post += hashtags.join(" ");

  // Truncate if needed
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
function generateTopStory(content: NewsletterContent, topics: string[]): LinkedInFormat {
  const hashtags = generateHashtags(topics);
  const leadStory = content.news[0];

  if (!leadStory) {
    throw new Error("No lead story found in newsletter");
  }

  let post = `📰 ${leadStory.title}\n\n`;
  post += `${leadStory.body}\n\n`;

  // Add perspective if relevant
  if (content.perspective) {
    post += `💡 Why it matters:\n${content.perspective}\n\n`;
  }

  // Add source
  post += `🔗 Source: ${leadStory.source.name}\n`;
  post += `${leadStory.source.url}\n\n`;

  // Add CTA
  post += `📬 Want 4 more stories like this daily? Subscribe at ${NEWSLETTER_URL}\n\n`;
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

    // Add hashtags to each post
    post += hashtags.slice(0, 5).join(" "); // Fewer hashtags per post

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
function generateDealsRoundup(content: NewsletterContent, topics: string[]): LinkedInFormat | null {
  if (!content.whats_hot || content.whats_hot.length === 0) {
    return null;
  }

  const hashtags = generateHashtags(["Funding", "M&A", "Fintech", "Venture", "Deals"]);
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });

  let post = `💰 Fintech Deals Roundup — ${today}\n\n`;

  // Group by type
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

/**
 * Determine recommended strategy based on content analysis
 */
function determineStrategy(content: NewsletterContent): "daily_digest" | "top_story" | "multi_post" | "deals_roundup" {
  const storyCount = content.news.length;
  const whatsHotCount = content.whats_hot?.length || 0;

  // If lots of What's Hot items, focus on deals
  if (whatsHotCount >= 5) {
    return "deals_roundup";
  }

  // If only 1-2 stories, do top story
  if (storyCount <= 2) {
    return "top_story";
  }

  // Check if stories are short enough for single digest
  const totalBodyLength = content.news.reduce((sum, story) => sum + story.body.length, 0);
  if (totalBodyLength < 1500) {
    return "daily_digest";
  }

  // Default to daily digest for typical newsletters
  return "daily_digest";
}

/**
 * Generate metadata for content analysis
 */
export function generateMetadata(content: NewsletterContent): LinkedInMetadata {
  const topics = extractTopics(content);

  // Simple heuristic for "breaking news" - check for urgent keywords
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

/**
 * Main function to extract and format LinkedIn content from newsletter
 */
export function extractLinkedInContent(content: NewsletterContent): LinkedInContent {
  const topics = extractTopics(content);
  const recommendedStrategy = determineStrategy(content);

  const formats: LinkedInContent["formats"] = {
    daily_digest: generateDailyDigest(content, topics),
    top_story: generateTopStory(content, topics),
    multi_post: generateMultiPost(content, topics),
  };

  // Only include deals roundup if What's Hot exists
  const dealsRoundup = generateDealsRoundup(content, topics);
  if (dealsRoundup) {
    formats.deals_roundup = dealsRoundup;
  }

  return {
    recommended_strategy: recommendedStrategy,
    formats
  };
}
