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
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-grid-pattern opacity-35 dark:opacity-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 -z-30 glow-bg"
        aria-hidden="true"
      />
    </>
  );
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
        <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="card-surface-strong p-10 sm:p-14">
            <div className="mb-6 text-5xl" aria-hidden="true">☕</div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">
              We&apos;re brewing tomorrow&apos;s edition
            </h1>
            <p className="mt-4 max-w-md mx-auto text-lg text-muted">
              Five critical payments insights are on the way. Subscribe now and
              we&apos;ll deliver them straight to your inbox.
            </p>
            <div className="mx-auto mt-8 max-w-sm">
              <Suspense fallback={null}>
                <SubscribeForm source="empty_state" />
              </Suspense>
            </div>
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

  return (
    <div className="relative min-h-screen">
      <HomeBackground />

      {useLocalData && (
        <div className="fixed left-0 right-0 top-16 z-50 bg-amber-500 py-2 text-center text-sm font-semibold text-amber-950">
          Local Preview Mode - Loading from `public/newsletter.json`
        </div>
      )}

      <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12 lg:px-16 lg:py-16">
        <HomeHeader
          formattedDate={formattedDate}
          subscriberCount={subscriberCount}
          roundedCount={roundedCount}
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

        <section className="mt-16">
          <div className="card-surface-strong p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold font-display">
              Get tomorrow&apos;s edition
            </h2>
            <p className="mt-2 text-muted">
              Five payments insights, delivered every weekday morning.
            </p>
            <div className="mx-auto mt-6 max-w-xl">
              <Suspense fallback={null}>
                <SubscribeForm source="bottom_cta" />
              </Suspense>
            </div>
          </div>
        </section>

        <div className="mt-20">
          <NewsletterNavigation
            prevDate={adjacentDates.prev}
            nextDate={adjacentDates.next}
            currentDate={newsletter.publication_date}
            position="bottom"
          />
          <Footer />
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
