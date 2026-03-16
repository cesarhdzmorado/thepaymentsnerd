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

const POST_TYPE_LABELS = [
  "Bold Take",
  "Contrarian Question",
  "Operator Lesson",
  "Market Pulse",
  "Founder Lens",
  "Risk Radar",
  "Deal Snapshot",
  "Regulation Watch",
  "Prediction",
  "Playbook",
  "One Chart Style",
  "Quick Thread",
  "My POV",
  "What I'd Do",
  "Signal vs Noise",
] as const;

/**
 * Pick a random item from an array. Uses date-based seed so the same
 * newsletter content produces the same pick within a day, but varies across days.
 */
function seedHash(seed?: string): number {
  const seedStr = seed ?? new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickRandom<T>(items: T[], seed?: string): T {
  return items[seedHash(seed) % items.length];
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

  const teaseCount = Math.min(content.news.length, 3);
  const teasers = content.news.slice(0, teaseCount).map((story) => {
    const shortTitle = story.title.split(",")[0].split(" — ")[0].trim();
    return shortTitle;
  });

  const whatsHotCount = content.whats_hot?.length ?? 0;
  const perspectiveTeaser = content.perspective && vibe !== "light"
    ? `${content.perspective.split(".")[0]}.`
    : "";

  const typeIndex = seedHash(`${seed ?? ""}-post-type`) % POST_TYPE_LABELS.length;
  const typeLabel = POST_TYPE_LABELS[typeIndex];

  const builders: Array<() => string> = [
    () => `${hook}\n\nHot take: ${teasers[0]} might be the most important payment signal this week.\n\nAlso watching:\n→ ${teasers.slice(1).join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nQuestion for operators: are we underestimating second-order effects from ${teasers[0]}?\n\nToday's other signals:\n→ ${teasers.slice(1).join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nOperator lesson from today: distribution and compliance are now inseparable.\n\nEvidence:\n→ ${teasers.join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nMarket pulse in 30 seconds:\n→ ${teasers.join("\n→ ")}\n${whatsHotCount > 0 ? `\n+ ${whatsHotCount} deals in the pipeline 🔥\n` : "\n"}${cta}`,
    () => `${hook}\n\nFounder lens: the winners will be the teams that move fast without breaking trust.\n\nToday's proof:\n→ ${teasers.join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nRisk radar:\n→ ${teasers.join("\n→ ")}\n\n${perspectiveTeaser ? `💡 ${perspectiveTeaser}\n\n` : ""}${cta}`,
    () => `${hook}\n\nDeal snapshot:\n→ ${teasers.join("\n→ ")}\n${whatsHotCount > 0 ? `\n+ ${whatsHotCount} additional moves in What's Hot` : ""}\n\n${cta}`,
    () => `${hook}\n\nRegulation watch:\n→ ${teasers.join("\n→ ")}\n\nThe policy surface area is widening faster than most product roadmaps.\n\n${cta}`,
    () => `${hook}\n\nPrediction: by year-end, one of these themes becomes default playbook for top fintechs.\n\nSignals:\n→ ${teasers.join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nIf I were building a payments GTM playbook today, I'd start here:\n→ ${teasers.join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nOne-chart-style summary (without the chart):\n→ ${teasers.join("\n→ ")}\n\nDirection is clear. Execution gap is the edge.\n\n${cta}`,
    () => `${hook}\n\nMini-thread in one post:\n1) ${teasers[0]}\n2) ${teasers[1] ?? teasers[0]}\n3) ${teasers[2] ?? teasers[0]}\n\n${cta}`,
    () => `${hook}\n\nMy POV: we're moving from feature competition to trust competition.\n\nToday's stories:\n→ ${teasers.join("\n→ ")}\n\n${cta}`,
    () => `${hook}\n\nWhat I'd do this week if I ran a fintech product team:\n→ Re-check assumptions behind: ${teasers[0]}\n→ Build response plan for: ${teasers[1] ?? teasers[0]}\n\n${cta}`,
    () => `${hook}\n\nSignal vs noise:\nSignal → ${teasers[0]}\nNoise → vanity feature wars\nAlso relevant → ${teasers[1] ?? teasers[0]}\n\n${cta}`,
  ];

  let post = builders[typeIndex]();
  post += `\n\n(${typeLabel})`;
  post += `\n\n${hashtags.slice(0, 5).join(" ")}`;

  return {
    post_text: post,
    character_count: post.length,
    hashtags: hashtags.slice(0, 5),
  };
}
