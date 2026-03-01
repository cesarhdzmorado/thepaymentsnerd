/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractLinkedInContent, generateMetadata } from "@/lib/linkedinContentExtractor";
import type { NewsletterContent } from "@/components/home/HomeSections";

/**
 * GET /api/linkedin-content
 *
 * Returns LinkedIn-optimized content from newsletter.
 * Supports fetching by date or defaults to latest newsletter.
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to latest)
 * - secret: Shared secret for authentication (required)
 *
 * Response format:
 * {
 *   ok: true,
 *   date: "2026-02-28",
 *   newsletter_url: "https://thepaymentsnerd.co",
 *   raw_content: { news: [...], perspective: "...", ... },
 *   linkedin_ready: {
 *     recommended_strategy: "daily_digest",
 *     formats: { daily_digest: {...}, top_story: {...}, ... }
 *   },
 *   metadata: {
 *     story_count: 5,
 *     whats_hot_count: 6,
 *     has_breaking_news: false,
 *     primary_topics: ["Fintech", "AI", ...]
 *   }
 * }
 */

export const revalidate = 900; // ISR: 15 minutes

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedDate = searchParams.get("date");
    const secret = searchParams.get("secret");

    // Verify secret
    const expectedSecret = process.env.LINKEDIN_CONTENT_SECRET || process.env.CRON_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      console.error("LinkedIn content API: Unauthorized access attempt");
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    let newsletter;
    let publicationDate: string;

    // Fetch newsletter from Supabase
    if (requestedDate) {
      // Fetch specific date
      const { data, error } = await supabaseAdmin
        .from("newsletters")
        .select("publication_date, content")
        .eq("publication_date", requestedDate)
        .single();

      if (error || !data) {
        console.error(`Newsletter not found for date: ${requestedDate}`, error);
        return NextResponse.json(
          { ok: false, message: `Newsletter not found for date: ${requestedDate}` },
          { status: 404 }
        );
      }

      newsletter = data;
      publicationDate = data.publication_date;
    } else {
      // Fetch latest newsletter
      const { data, error } = await supabaseAdmin
        .from("newsletters")
        .select("publication_date, content")
        .order("publication_date", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.error("No newsletter found", error);
        return NextResponse.json(
          { ok: false, message: "No newsletter found" },
          { status: 404 }
        );
      }

      newsletter = data;
      publicationDate = data.publication_date;
    }

    const content = newsletter.content as NewsletterContent;

    // Generate LinkedIn-ready content
    const linkedinContent = extractLinkedInContent(content);
    const metadata = generateMetadata(content);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thepaymentsnerd.co";

    return NextResponse.json({
      ok: true,
      date: publicationDate,
      newsletter_url: siteUrl,
      raw_content: content,
      linkedin_ready: linkedinContent,
      metadata,
    });
  } catch (e: any) {
    console.error("LinkedIn content API error:", e?.message || e);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
