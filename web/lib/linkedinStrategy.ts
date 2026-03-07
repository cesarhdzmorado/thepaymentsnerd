/**
 * LinkedIn Strategy Engine
 *
 * Scores and ranks posting strategies based on content signals, day of week,
 * and content vibe. Returns ranked recommendations so the caller can pick
 * the best fit or override manually.
 */

import type { NewsletterContent } from "@/components/home/HomeSections";
import { detectVibe, type ContentVibe } from "./linkedinPostTemplates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Strategy =
  | "daily_digest"
  | "top_story"
  | "multi_post"
  | "deals_roundup"
  | "trailer";

export interface StrategyScore {
  strategy: Strategy;
  score: number;
  reason: string;
}

export interface StrategyResult {
  recommended: Strategy;
  rankings: StrategyScore[];
  vibe: ContentVibe;
  signals: ContentSignals;
}

interface ContentSignals {
  storyCount: number;
  whatsHotCount: number;
  hasBreakingNews: boolean;
  hasMajorDeal: boolean;
  totalBodyLength: number;
  vibe: ContentVibe;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
}

// ---------------------------------------------------------------------------
// Signal Extraction
// ---------------------------------------------------------------------------

const BREAKING_KEYWORDS = [
  "breaking", "exclusive", "urgent", "just in", "announced today",
];

const MAJOR_DEAL_KEYWORDS = [
  "acquires", "acquisition", "merger", "ipo", "$1b", "$2b", "$5b", "$10b",
  "billion", "mega-round", "series d", "series e",
];

function extractSignals(content: NewsletterContent, now?: Date): ContentSignals {
  const date = now ?? new Date();
  const allText = content.news
    .map((n) => `${n.title} ${n.body}`)
    .join(" ")
    .toLowerCase();

  const hasBreakingNews = BREAKING_KEYWORDS.some((k) => allText.includes(k));
  const hasMajorDeal = MAJOR_DEAL_KEYWORDS.some((k) => allText.includes(k));
  const totalBodyLength = content.news.reduce((sum, s) => sum + s.body.length, 0);

  return {
    storyCount: content.news.length,
    whatsHotCount: content.whats_hot?.length ?? 0,
    hasBreakingNews,
    hasMajorDeal,
    totalBodyLength,
    vibe: detectVibe(content),
    dayOfWeek: date.getDay(),
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreStrategy(strategy: Strategy, signals: ContentSignals): StrategyScore {
  let score = 0;
  let reason = "";

  switch (strategy) {
    case "trailer": {
      // Trailer is always a strong contender — César's preferred format
      score = 60;
      reason = "Default strong pick — short, curiosity-driven, drives clicks.";

      // Boost on content-rich days (more to tease)
      if (signals.storyCount >= 4) { score += 10; reason = "Rich content day — great for teasing."; }
      if (signals.whatsHotCount >= 3) { score += 5; }

      // Boost on Monday (weekly kickoff — trailer drives traffic)
      if (signals.dayOfWeek === 1) { score += 10; reason = "Monday — trailer drives week-start traffic."; }

      // Boost on Friday (lighter, shorter post fits the vibe)
      if (signals.dayOfWeek === 5) { score += 5; reason = "Friday — short and punchy fits."; }

      // Breaking news? Trailer builds suspense
      if (signals.hasBreakingNews) { score += 10; reason = "Breaking news day — tease the scoop."; }
      break;
    }

    case "daily_digest": {
      score = 50;
      reason = "Solid default — comprehensive daily overview.";

      // Best when there are enough stories to fill it
      if (signals.storyCount >= 4) { score += 10; }
      if (signals.storyCount <= 2) { score -= 20; reason = "Too few stories for a digest."; }

      // Shorter bodies work better in digest
      if (signals.totalBodyLength < 1500) { score += 5; }

      // Tuesday-Thursday are "work mode" days — digest fits
      if ([2, 3, 4].includes(signals.dayOfWeek)) { score += 5; reason = "Mid-week — digest fits the work vibe."; }

      // Monday bump (weekly recap feel)
      if (signals.dayOfWeek === 1) { score += 5; }
      break;
    }

    case "top_story": {
      score = 40;
      reason = "Good when one story dominates.";

      // Strong when there's breaking news
      if (signals.hasBreakingNews) { score += 25; reason = "Breaking news — lead with the big story."; }
      if (signals.hasMajorDeal) { score += 15; reason = "Major deal — spotlight it."; }

      // Weak when stories are all similar weight
      if (signals.storyCount >= 4 && !signals.hasBreakingNews) { score -= 10; }
      break;
    }

    case "multi_post": {
      score = 30;
      reason = "Multiple posts for maximum reach.";

      // Best when there are many meaty stories
      if (signals.storyCount >= 5 && signals.totalBodyLength > 2000) {
        score += 15;
        reason = "Lots of meaty stories — multi-post maximizes reach.";
      }
      if (signals.storyCount <= 2) { score -= 20; }

      // Less ideal for weekends or light days
      if (signals.dayOfWeek === 5) { score -= 5; }
      break;
    }

    case "deals_roundup": {
      score = 25;
      reason = "Niche format — best when deals dominate.";

      // Strong when lots of deals
      if (signals.whatsHotCount >= 5) { score += 30; reason = "Heavy deals day — this is the format."; }
      if (signals.whatsHotCount >= 3) { score += 15; }

      // Useless without deals
      if (signals.whatsHotCount === 0) { score = 0; reason = "No deals — skip this format."; }
      break;
    }
  }

  return { strategy, score, reason };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score all strategies and return ranked recommendations.
 *
 * @param content - Newsletter content
 * @param override - Force a specific strategy (still returns full rankings)
 * @param now - Optional date override for testing
 */
export function selectStrategy(
  content: NewsletterContent,
  override?: Strategy,
  now?: Date
): StrategyResult {
  const signals = extractSignals(content, now);

  const allStrategies: Strategy[] = [
    "trailer",
    "daily_digest",
    "top_story",
    "multi_post",
    "deals_roundup",
  ];

  const rankings = allStrategies
    .map((s) => scoreStrategy(s, signals))
    .sort((a, b) => b.score - a.score);

  const recommended = override ?? rankings[0].strategy;

  return {
    recommended,
    rankings,
    vibe: signals.vibe,
    signals,
  };
}
