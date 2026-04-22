export const revalidate = 900;

import { Suspense } from "react";
import { promises as fs } from "fs";
import path from "path";
import { Footer } from "@/components/Footer";
import {
  CuriositySection,
  HomeHeader,
  LeadStorySection,
  QuickHitsSection,
  WhatsHotSection,
} from "@/components/home/HomeSections";
import type {
  Newsletter,
  NewsletterContent,
} from "@/components/home/HomeSections";
import { NewsletterNavigation } from "@/components/NewsletterNavigation";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SubscribeForm } from "@/components/SubscribeForm";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";

async function getLocalNewsletter(): Promise<Newsletter | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "newsletter.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const content = JSON.parse(fileContent) as NewsletterContent;
    const today = new Date().toISOString().split("T")[0];

    return {
      publication_date: today,
      content,
    };
  } catch (error) {
    console.error("Error loading local newsletter:", error);
    return null;
  }
}

async function getLatestNewsletter(): Promise<Newsletter | null> {
  const { data, error } = await supabase
    .from("newsletters")
    .select("publication_date, content")
    .order("publication_date", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching newsletter:", error?.message);
    return null;
  }

  return data as Newsletter;
}

async function getNewsletterByDate(date: string): Promise<Newsletter | null> {
  const { data, error } = await supabase
    .from("newsletters")
    .select("publication_date, content")
    .eq("publication_date", date)
    .single();

  if (error || !data) {
    console.error("Error fetching newsletter for date:", date, error?.message);
    return null;
  }

  return data as Newsletter;
}

async function getAdjacentDates(
  currentDate: string
): Promise<{ prev: string | null; next: string | null }> {
  const { data: prevData } = await supabase
    .from("newsletters")
    .select("publication_date")
    .lt("publication_date", currentDate)
    .order("publication_date", { ascending: false })
    .limit(1)
    .single();

  const { data: nextData } = await supabase
    .from("newsletters")
    .select("publication_date")
    .gt("publication_date", currentDate)
    .order("publication_date", { ascending: true })
    .limit(1)
    .single();

  return {
    prev: prevData?.publication_date || null,
    next: nextData?.publication_date || null,
  };
}

async function getSubscriberCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("subscribers")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching subscriber count:", error.message);
    return 0;
  }

  return count || 0;
}

function HomeBackground() {
  // The Swiss redesign uses paper (solid background) — no decorative grid or glows.
  // Kept as a no-op so pages that still import it don't break.
  return null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; local?: string }>;
}) {
  const params = await searchParams;
  const requestedDate = params.date;
  const useLocalData = params.local === "true";

  let newsletter: Newsletter | null;
  let adjacentDates = { prev: null as string | null, next: null as string | null };

  if (useLocalData) {
    newsletter = await getLocalNewsletter();
  } else if (requestedDate) {
    newsletter = await getNewsletterByDate(requestedDate);
    adjacentDates = newsletter
      ? await getAdjacentDates(newsletter.publication_date)
      : { prev: null, next: null };
  } else {
    newsletter = await getLatestNewsletter();
    adjacentDates = newsletter
      ? await getAdjacentDates(newsletter.publication_date)
      : { prev: null, next: null };
  }

  const subscriberCount = useLocalData ? 0 : await getSubscriberCount();
  const roundedCount =
    subscriberCount > 10
      ? Math.floor(subscriberCount / 10) * 10
      : subscriberCount;

  if (!newsletter) {
    return (
      <div className="relative min-h-screen">
        <HomeBackground />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center px-4 sm:px-8 lg:px-16">
          <p className="label-mono label-mono--accent mb-4">Tomorrow&apos;s edition</p>
          <h1 className="mb-4 text-[40px] sm:text-[56px] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--ink)]">
            Brewing now.<br />
            <span className="text-[var(--accent)]">Ready tomorrow morning.</span>
          </h1>
          <p className="mb-8 max-w-[44ch] text-lg text-[var(--muted)]">
            Five critical payments insights are on the way. Subscribe and we&apos;ll
            deliver them straight to your inbox.
          </p>
          <div className="w-full max-w-xl">
            <Suspense fallback={null}>
              <SubscribeForm source="empty_state" idPrefix="empty-subscribe" />
            </Suspense>
          </div>
        </section>
      </div>
    );
  }

  const formattedDate = new Date(
    `${newsletter.publication_date}T00:00:00`
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stories = newsletter.content.news ?? [];
  const heroStory = stories.length > 0 ? stories[0] : null;
  const quickHits = stories.length > 1 ? stories.slice(1) : [];

  // Compute the "tomorrow" dateline for the dark CTA band. Skips weekends.
  const tomorrowLabel = (() => {
    const d = new Date(`${newsletter.publication_date}T00:00:00`);
    d.setDate(d.getDate() + 1);
    // If the next day is Saturday (6), jump to Monday. If Sunday (0), jump to Monday.
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
  })();

  const issuesShipped = 180; // Placeholder — will wire to real count later.
  const isArchive = Boolean(requestedDate);

  return (
    <div className="relative min-h-screen">
      <HomeBackground />

      {useLocalData && (
        <div className="fixed left-0 right-0 top-[60px] z-50 bg-[var(--accent)] py-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--paper)]">
          Local Preview Mode · Loading from public/newsletter.json
        </div>
      )}

      <div className="relative mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-16">
        <HomeHeader
          formattedDate={formattedDate}
          subscriberCount={subscriberCount}
          roundedCount={roundedCount}
          isArchive={isArchive}
        />

        <NewsletterNavigation
          prevDate={adjacentDates.prev}
          nextDate={adjacentDates.next}
          currentDate={newsletter.publication_date}
          position="top"
        />

        <LeadStorySection heroStory={heroStory} />
        <QuickHitsSection quickHits={quickHits} />
        <CuriositySection curiosity={newsletter.content.curiosity} />
        <WhatsHotSection whatsHot={newsletter.content.whats_hot ?? []} />

        {/* ——— Tomorrow CTA — full-bleed ink band (live issues only) ——— */}
        {!isArchive && <section className="relative -mx-4 sm:-mx-8 lg:-mx-16 bg-[var(--ink)] text-[var(--paper)] py-24 sm:py-28 lg:py-32">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-8 lg:grid-cols-2 lg:items-end lg:gap-16 lg:px-16">
            <div>
              <p className="label-mono mb-4 text-[var(--paper)] opacity-55">
                Tomorrow&apos;s issue drops
              </p>
              <h2 className="text-[40px] sm:text-[60px] lg:text-[80px] font-extrabold leading-[0.95] tracking-[-0.035em]">
                {tomorrowLabel}.{" "}
                <span className="text-[var(--accent)]">Morning drop.</span>
                <br />
                Be three steps ahead.
              </h2>
            </div>
            <div className="lg:pb-3">
              <p className="mb-7 max-w-[44ch] text-[17px] leading-relaxed text-[var(--paper)] opacity-70">
                One email. Five stories. Zero filler. Written by a payments nerd, for
                payments nerds.
              </p>
              <Suspense fallback={null}>
                <SubscribeForm source="bottom_cta" idPrefix="bottom-subscribe" />
              </Suspense>
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="mx-auto mt-14 grid max-w-[1240px] grid-cols-1 gap-6 border-t border-[var(--paper)]/20 px-4 pt-8 sm:grid-cols-3 sm:px-8 lg:px-16"
          >
            {roundedCount > 10 && <StatBlock value={`${roundedCount.toLocaleString()}+`} label="Subscribers" />}
            <StatBlock value={String(issuesShipped)} label="Issues shipped" />
            <StatBlock value="5 min" label="Average read" />
          </div>
        </section>}

        <NewsletterNavigation
          prevDate={adjacentDates.prev}
          nextDate={adjacentDates.next}
          currentDate={newsletter.publication_date}
          position="bottom"
        />

        <Footer />
      </div>

      <ScrollToTop />
    </div>
  );
}

/* Tiny presentational helper — kept in page.tsx since it's only used here. */
function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[var(--paper)]">
        {value}
      </div>
      <div className="label-mono mt-2 text-[var(--paper)] opacity-55">
        {label}
      </div>
    </div>
  );
}
