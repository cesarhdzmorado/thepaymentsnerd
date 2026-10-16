export const revalidate = 900;

import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArchiveIssueList } from "@/components/ArchiveIssueList";
import { StructuredData } from "@/components/StructuredData";
import { supabase } from "@/lib/supabaseClient";
import type { NewsletterContent } from "@/components/home/HomeSections";
import { formatIssueDate } from "@/lib/archive";
import { collectionPageJsonLd } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "Archive | /thepaymentsnerd",
  description: "Every prior issue of /thepaymentsnerd, archived by month.",
  alternates: { canonical: "/archive" },
  openGraph: {
    title: "Archive | /thepaymentsnerd",
    description: "Every prior issue of /thepaymentsnerd, archived by month.",
    url: "/archive",
  },
};

interface ArchiveEntry {
  publication_date: string;
  content: NewsletterContent;
}

async function getArchiveIndex() {
  const [{ data: dates, error: datesError }, { data: recent, error: recentError }] = await Promise.all([
    supabase.from("newsletters").select("publication_date").order("publication_date", { ascending: false }).limit(5000),
    supabase.from("newsletters").select("publication_date, content").order("publication_date", { ascending: false }).limit(30),
  ]);
  if (datesError) throw new Error(`Unable to fetch archive dates: ${datesError.message}`);
  if (recentError) throw new Error(`Unable to fetch recent archive: ${recentError.message}`);
  return {
    dates: (dates ?? []) as { publication_date: string }[],
    recent: (recent ?? []) as ArchiveEntry[],
  };
}

function getMonths(dates: { publication_date: string }[]) {
  const months = new Map<string, { year: string; month: string; label: string; count: number }>();
  for (const { publication_date } of dates) {
    const { monthKey, monthLabel } = formatIssueDate(publication_date);
    const existing = months.get(monthKey);
    if (existing) existing.count += 1;
    else {
      const [year, month] = monthKey.split("-");
      months.set(monthKey, { year, month, label: monthLabel, count: 1 });
    }
  }
  return [...months.values()];
}

export default async function ArchivePage() {
  const { dates, recent } = await getArchiveIndex();
  const months = getMonths(dates);
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      <StructuredData
        data={collectionPageJsonLd(
          "The Payments Nerd archive",
          "https://www.thepaymentsnerd.co/archive",
          recent.map((entry) => ({ publication_date: entry.publication_date, title: entry.content.news?.[0]?.title })),
        )}
      />
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-12 sm:px-8 sm:pt-16 lg:px-16">
        <header className="mb-12 border-b-2 border-[var(--ink)] pb-6">
          <p className="label-mono label-mono--accent mb-3">Archive</p>
          <h1 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.03em] text-[var(--ink)] sm:text-[64px] lg:text-[80px]">Every issue,<br />on the record.</h1>
          <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.6] text-[var(--ink-3)]">Every daily briefing since we started publishing. {dates.length} issues archived.</p>
        </header>

        <section aria-labelledby="recent-issues" className="mb-16">
          <h2 id="recent-issues" className="label-mono label-mono--ink mb-6 border-b border-[var(--rule)] pb-3">Latest issues</h2>
          <ArchiveIssueList entries={recent} />
        </section>

        <section aria-labelledby="browse-months">
          <h2 id="browse-months" className="label-mono label-mono--ink mb-6 border-b border-[var(--rule)] pb-3">Browse by month</h2>
          <ul className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
            {months.map((item) => (
              <li key={`${item.year}-${item.month}`}>
                <Link href={`/archive/${item.year}/${item.month}`} className="flex items-center justify-between bg-[var(--paper)] px-5 py-5 transition-colors hover:bg-[var(--paper-2)]">
                  <span className="font-extrabold">{item.label}</span>
                  <span className="label-mono">{item.count} issues</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <Footer />
      </div>
    </div>
  );
}
