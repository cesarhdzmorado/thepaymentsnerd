// web/app/archive/page.tsx
// Editorial archive index — every prior issue, grouped by month, linking
// to the day-by-day archive view on the homepage (/?date=YYYY-MM-DD).
export const revalidate = 900;

import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import type { NewsletterContent } from "@/components/home/HomeSections";

export const metadata: Metadata = {
  title: "Archive | /thepaymentsnerd",
  description:
    "Every prior issue of /thepaymentsnerd. Five critical payments insights daily, archived back to day one.",
};

// 500 ≈ two years of weekday issues. Caps the payload so a fresh archive
// request can't unbounded-scan the whole newsletters table. Add pagination
// if the archive ever genuinely outgrows this.
const ARCHIVE_LIMIT = 500;

interface ArchiveEntry {
  publication_date: string;
  content: NewsletterContent;
}

async function getAllNewsletters(): Promise<ArchiveEntry[]> {
  const { data, error } = await supabase
    .from("newsletters")
    .select("publication_date, content")
    .order("publication_date", { ascending: false })
    .limit(ARCHIVE_LIMIT);

  if (error || !data) {
    console.error("Error fetching archive:", error?.message);
    return [];
  }

  return data as ArchiveEntry[];
}

function formatIssueDate(isoDate: string): {
  monthKey: string;
  monthLabel: string;
  weekday: string;
  day: string;
} {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const monthLabel = d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    .toUpperCase();
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { monthKey, monthLabel, weekday, day };
}

function groupByMonth(entries: ArchiveEntry[]): Map<
  string,
  { label: string; entries: ArchiveEntry[] }
> {
  const groups = new Map<string, { label: string; entries: ArchiveEntry[] }>();
  for (const entry of entries) {
    const { monthKey, monthLabel } = formatIssueDate(entry.publication_date);
    const bucket = groups.get(monthKey);
    if (bucket) {
      bucket.entries.push(entry);
    } else {
      groups.set(monthKey, { label: monthLabel, entries: [entry] });
    }
  }
  return groups;
}

export default async function ArchivePage() {
  const entries = await getAllNewsletters();
  const groups = groupByMonth(entries);
  const total = entries.length;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-16 pt-12 sm:pt-16">
        <header className="mb-12 border-b-2 border-[var(--ink)] pb-6">
          <p className="label-mono label-mono--accent mb-3">Archive</p>
          <h1 className="text-[40px] sm:text-[64px] lg:text-[80px] font-extrabold leading-[0.98] tracking-[-0.03em] text-[var(--ink)]">
            Every issue,
            <br />
            on the record.
          </h1>
          <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.6] text-[var(--ink-3)]">
            Every daily briefing since we started publishing. Click an issue to
            read it as it was sent. {total > 0 ? `${total} issues archived.` : null}
          </p>
        </header>

        {total === 0 ? (
          <p className="label-mono text-[var(--muted)]">
            No issues archived yet. Check back after the first publication.
          </p>
        ) : (
          <div className="space-y-16">
            {[...groups.entries()].map(([monthKey, group]) => (
              <section key={monthKey} aria-labelledby={`month-${monthKey}`}>
                <h2
                  id={`month-${monthKey}`}
                  className="label-mono label-mono--ink mb-6 border-b border-[var(--rule)] pb-3"
                >
                  {group.label} · {group.entries.length}{" "}
                  {group.entries.length === 1 ? "issue" : "issues"}
                </h2>
                <ul className="grid gap-4">
                  {group.entries.map((entry) => {
                    const { weekday, day } = formatIssueDate(
                      entry.publication_date
                    );
                    const lead = entry.content?.news?.[0];
                    const leadTitle =
                      lead?.title ?? "Issue missing a lead story";
                    return (
                      <li key={entry.publication_date}>
                        <Link
                          href={`/?date=${entry.publication_date}`}
                          className="group grid grid-cols-[72px_1fr] gap-6 border-t border-[var(--rule)] py-5 transition-colors hover:bg-[var(--paper-2)]"
                        >
                          <div className="label-mono pt-1 text-[var(--muted)]">
                            <div className="text-[11px]">{weekday}</div>
                            <div className="text-[24px] font-mono font-medium leading-none tracking-[-0.02em] text-[var(--ink)]">
                              {day}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[20px] sm:text-[22px] font-extrabold leading-[1.2] tracking-[-0.015em] text-[var(--ink)] group-hover:text-[var(--accent)]">
                              {leadTitle}
                            </h3>
                            {lead?.source?.name ? (
                              <p className="label-mono mt-2 text-[var(--muted)]">
                                Lead source: {lead.source.name}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
