import Link from "next/link";
import type { NewsletterContent } from "@/components/home/HomeSections";
import { formatIssueDate } from "@/lib/archive";

type ArchiveEntry = { publication_date: string; content: NewsletterContent };

export function ArchiveIssueList({ entries }: { entries: ArchiveEntry[] }) {
  if (entries.length === 0) return <p className="label-mono text-[var(--muted)]">No issues archived yet.</p>;
  return (
    <ul className="grid gap-4">
      {entries.map((entry) => {
        const { weekday, day, monthShort } = formatIssueDate(entry.publication_date);
        const lead = entry.content?.news?.[0];
        return (
          <li key={entry.publication_date}>
            <Link href={`/issues/${entry.publication_date}`} className="group grid grid-cols-[72px_1fr] gap-6 border-t border-[var(--rule)] py-5 transition-colors hover:bg-[var(--paper-2)]">
              <div className="label-mono pt-1 text-[var(--muted)]">
                <div className="text-[11px]">{weekday} · {monthShort}</div>
                <div className="font-mono text-[24px] font-medium leading-none tracking-[-0.02em] text-[var(--ink)]">{day}</div>
              </div>
              <div>
                <h3 className="text-[20px] font-extrabold leading-[1.2] tracking-[-0.015em] text-[var(--ink)] group-hover:text-[var(--accent)] sm:text-[22px]">{lead?.title ?? "Issue missing a lead story"}</h3>
                {lead?.source?.name ? <p className="label-mono mt-2 text-[var(--muted)]">Lead source: {lead.source.name}</p> : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
