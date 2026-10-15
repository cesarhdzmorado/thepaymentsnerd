import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { ArchiveIssueList } from "@/components/ArchiveIssueList";
import type { NewsletterContent } from "@/components/home/HomeSections";
import { isArchiveMonth, monthBounds } from "@/lib/archive";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 900;
type MonthPageProps = { params: Promise<{ year: string; month: string }> };

function monthLabel(year: string, month: string): string {
  return new Date(`${year}-${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function generateMetadata({ params }: MonthPageProps): Promise<Metadata> {
  const { year, month } = await params;
  if (!isArchiveMonth(year, month)) return { robots: { index: false, follow: false } };
  const label = monthLabel(year, month);
  return {
    title: `${label} Archive | /thepaymentsnerd`,
    description: `Payments news briefings published by /thepaymentsnerd in ${label}.`,
    alternates: { canonical: `/archive/${year}/${month}` },
    openGraph: {
      title: `${label} Archive | /thepaymentsnerd`,
      description: `Payments news briefings published by /thepaymentsnerd in ${label}.`,
      url: `/archive/${year}/${month}`,
    },
  };
}

export default async function ArchiveMonthPage({ params }: MonthPageProps) {
  const { year, month } = await params;
  if (!isArchiveMonth(year, month)) notFound();
  const { start, end } = monthBounds(year, month);
  const { data, error } = await supabase.from("newsletters").select("publication_date, content").gte("publication_date", start).lt("publication_date", end).order("publication_date", { ascending: false });
  if (error) throw new Error(`Unable to fetch monthly archive: ${error.message}`);
  const entries = (data ?? []) as { publication_date: string; content: NewsletterContent }[];
  if (entries.length === 0) notFound();
  const label = monthLabel(year, month);
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-12 sm:px-8 sm:pt-16 lg:px-16">
        <header className="mb-12 border-b-2 border-[var(--ink)] pb-6">
          <Link href="/archive" className="label-mono label-mono--accent mb-3 inline-block hover:underline">← Full archive</Link>
          <h1 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-[64px] lg:text-[80px]">{label}</h1>
          <p className="mt-6 text-[16px] text-[var(--ink-3)]">{entries.length} issues published.</p>
        </header>
        <ArchiveIssueList entries={entries} />
        <Footer />
      </div>
    </div>
  );
}
