import type { Newsletter } from "@/components/home/HomeSections";

export const SITE_URL = "https://www.thepaymentsnerd.co";

export function isIssueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function issuePath(date: string): string {
  return `/issues/${date}`;
}

export function issueUrl(date: string): string {
  return `${SITE_URL}${issuePath(date)}`;
}

export function issueTitle(newsletter: Newsletter): string {
  const lead = newsletter.content.news?.[0]?.title?.trim();
  return lead ? `${lead} | /thepaymentsnerd` : `${newsletter.publication_date} | /thepaymentsnerd`;
}

export function issueDescription(newsletter: Newsletter): string {
  const lead = newsletter.content.news?.[0]?.body?.replace(/\s+/g, " ").trim();
  if (!lead) return "Five critical payments insights. Zero noise. Daily.";
  return lead.length <= 160 ? lead : `${lead.slice(0, 157).trimEnd()}…`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
