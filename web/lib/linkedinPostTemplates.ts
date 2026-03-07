/**
 * LinkedIn Post Templates
 *
 * Provides varied hooks, CTAs, and content-aware formatting for LinkedIn posts.
 * Designed to keep posts fresh — no two days should feel identical.
 */

import type { NewsletterContent } from "@/components/home/HomeSections";

const NEWSLETTER_URL = "https://thepaymentsnerd.co";

// ---------------------------------------------------------------------------
// Content Vibe Detection
// ---------------------------------------------------------------------------

export type ContentVibe = "breaking" | "deals_heavy" | "regulatory" | "normal" | "light";

const BREAKING_KEYWORDS = [
  "breaking", "exclusive", "urgent", "just in", "announced today",
  "acquires", "acquisition", "merger", "shuts down", "files for",
];

const REGULATORY_KEYWORDS = [
  "regulation", "regulatory", "compliance", "bill", "legislation",
  "SEC", "FCA", "DOJ", "license", "framework", "enforcement",
];

export function detectVibe(content: NewsletterContent): ContentVibe {
  const allText = content.news
    .map((n) => `${n.title} ${n.body}`)
    .join(" ")
    .toLowerCase();

  const breakingHits = BREAKING_KEYWORDS.filter((k) => allText.includes(k)).length;
  if (breakingHits >= 3) return "breaking";

  const whatsHotCount = content.whats_hot?.length ?? 0;
  if (whatsHotCount >= 5) return "deals_heavy";

  const regulatoryHits = REGULATORY_KEYWORDS.filter((k) => allText.includes(k)).length;
  if (regulatoryHits >= 3) return "regulatory";

  const storyCount = content.news.length;
  if (storyCount <= 2) return "light";

  return "normal";
}

// ---------------------------------------------------------------------------
// Opening Hooks
// ---------------------------------------------------------------------------

interface HookSet {
  breaking: string[];
  deals_heavy: string[];
  regulatory: string[];
  normal: string[];
  light: string[];
}

const DAILY_DIGEST_HOOKS: HookSet = {
  breaking: [
    "⚡ Big moves in payments today.",
    "🚨 The payments world just shifted.",
    "⚡ Major news dropping — here's what you need to know.",
  ],
  deals_heavy: [
    "💰 Money is moving in fintech today.",
    "💰 Deals, deals, deals. Here's today's rundown.",
    "🔥 Funding rounds and M&A — today's fintech action.",
  ],
  regulatory: [
    "⚖️ Regulators are making moves. Here's what changed.",
    "📜 New rules, new reality. Today in payments regulation.",
    "⚖️ The regulatory landscape just shifted.",
  ],
  normal: [
    "🚀 Today in Payments",
    "📡 Five signals from the payments world today.",
    "🔎 Here's what moved in payments today.",
    "📬 Your daily payments briefing is ready.",
    "🗞️ What happened in fintech today — the short version.",
  ],
  light: [
    "☕ A quick payments check-in.",
    "📌 A couple of things worth knowing today.",
    "🔎 Short but important — today's payments update.",
  ],
};

const TOP_STORY_HOOKS: HookSet = {
  breaking: [
    "⚡ This just happened.",
    "🚨 Breaking: this changes things.",
    "⚡ Stop scrolling — this matters.",
  ],
  deals_heavy: [
    "💰 The biggest deal in payments today.",
    "🤝 This deal is worth watching.",
  ],
  regulatory: [
    "⚖️ This regulatory move matters.",
    "📜 New regulation alert — here's what it means.",
  ],
  normal: [
    "📰 The story everyone in payments should read today.",
    "🔍 One story. Big implications.",
    "📰 Today's must-read in fintech.",
  ],
  light: [
    "📌 One thing worth knowing today.",
    "🔎 Quick hit — this caught my eye.",
  ],
};

const TRAILER_HOOKS: string[] = [
  "Something big is brewing in payments.",
  "Three words: watch this space.",
  "This morning's newsletter is a heavy one.",
  "Today's edition has a story that will surprise you.",
  "One of today's stories made me do a double take.",
  "If you only read one payments newsletter today…",
  "I almost led with the deals roundup. Then I saw story #1.",
  "Five stories. One theme. You'll see it.",
  "The fintech world woke up different today.",
  "There's a pattern forming and most people are missing it.",
];

/**
 * Pick a random item from an array. Uses date-based seed so the same
 * newsletter content produces the same pick within a day, but varies across days.
 */
function pickRandom<T>(items: T[], seed?: string): T {
  const seedStr = seed ?? new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return items[Math.abs(hash) % items.length];
}

export function getDigestHook(vibe: ContentVibe, seed?: string): string {
  return pickRandom(DAILY_DIGEST_HOOKS[vibe], seed);
}

export function getTopStoryHook(vibe: ContentVibe, seed?: string): string {
  return pickRandom(TOP_STORY_HOOKS[vibe], seed);
}

export function getTrailerHook(seed?: string): string {
  return pickRandom(TRAILER_HOOKS, seed);
}

// ---------------------------------------------------------------------------
// CTAs
// ---------------------------------------------------------------------------

const CTAS: string[] = [
  `📬 Get the full analysis daily → ${NEWSLETTER_URL}`,
  `📬 Read the full edition: ${NEWSLETTER_URL}`,
  `📩 Subscribe for free — daily payments intelligence: ${NEWSLETTER_URL}`,
  `📬 Want the full breakdown? ${NEWSLETTER_URL}`,
  `🗞️ Full newsletter (free): ${NEWSLETTER_URL}`,
  `📬 Don't miss tomorrow's — subscribe: ${NEWSLETTER_URL}`,
  `📡 Daily payments briefing, free: ${NEWSLETTER_URL}`,
];

const TRAILER_CTAS: string[] = [
  `Read today's edition → ${NEWSLETTER_URL}`,
  `Full breakdown here → ${NEWSLETTER_URL}`,
  `Link in comments 👇`,
  `Go read it → ${NEWSLETTER_URL}`,
  `Today's edition: ${NEWSLETTER_URL}`,
];

export function getCTA(seed?: string): string {
  return pickRandom(CTAS, seed);
}

export function getTrailerCTA(seed?: string): string {
  return pickRandom(TRAILER_CTAS, (seed ?? "") + "-trailer");
}

// ---------------------------------------------------------------------------
// Content-Aware Emoji Selection
// ---------------------------------------------------------------------------

const TOPIC_EMOJIS: Record<string, string> = {
  AI: "🤖",
  Blockchain: "⛓️",
  Crypto: "🪙",
  Stablecoin: "🪙",
  "M&A": "🤝",
  Funding: "💰",
  Banking: "🏦",
  Regulation: "⚖️",
  "Open Banking": "🔓",
  "Cross-Border": "🌍",
  Visa: "💳",
  Mastercard: "💳",
  PayPal: "💳",
  Stripe: "💳",
  IPO: "📈",
  Expansion: "🌍",
};

export function emojiForTopic(topic: string): string {
  return TOPIC_EMOJIS[topic] ?? "📌";
}

// ---------------------------------------------------------------------------
// Trailer Post Generator
// ---------------------------------------------------------------------------

/**
 * Generate a short, punchy trailer post that creates curiosity and drives
 * clicks to the full newsletter. This is César's preferred LinkedIn strategy.
 *
 * Anatomy:
 *   Hook (1 line) → Tease 2-3 stories without giving away the punchline →
 *   Optional perspective snippet → CTA
 *
 * Target: 300-800 chars. Shorter = better engagement.
 */
export function generateTrailerPost(
  content: NewsletterContent,
  vibe: ContentVibe,
  hashtags: string[],
  seed?: string
): { post_text: string; character_count: number; hashtags: string[] } {
  const hook = getTrailerHook(seed);
  const cta = getTrailerCTA(seed);

  // Pick 2-3 stories to tease — just titles, no details
  const teaseCount = Math.min(content.news.length, 3);
  const teasers = content.news.slice(0, teaseCount).map((story) => {
    // Strip the verbose part after the comma/period for punchier teasers
    const shortTitle = story.title.split(",")[0].split(" — ")[0].trim();
    return `→ ${shortTitle}`;
  });

  // Build the post
  let post = `${hook}\n\n`;
  post += `In today's Payments Nerd:\n\n`;
  post += teasers.join("\n");
  post += `\n`;

  // Add a deals tease if there are deals
  const whatsHotCount = content.whats_hot?.length ?? 0;
  if (whatsHotCount > 0) {
    post += `\n+ ${whatsHotCount} deal${whatsHotCount > 1 ? "s" : ""} in the What's Hot section 🔥`;
  }

  // Optional: Add a one-line perspective tease
  if (content.perspective && vibe !== "light") {
    const perspectiveTeaser = content.perspective.split(".")[0] + ".";
    if (perspectiveTeaser.length < 150) {
      post += `\n\n💡 ${perspectiveTeaser}`;
    }
  }

  post += `\n\n${cta}`;
  post += `\n\n${hashtags.slice(0, 5).join(" ")}`;

  return {
    post_text: post,
    character_count: post.length,
    hashtags: hashtags.slice(0, 5),
  };
}
