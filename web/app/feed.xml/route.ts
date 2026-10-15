import { supabase } from "@/lib/supabaseClient";
import type { Newsletter } from "@/components/home/HomeSections";
import { escapeXml, issueDescription, issueTitle, issueUrl, SITE_URL } from "@/lib/seo";

export const revalidate = 900;

export async function GET() {
  const { data, error } = await supabase
    .from("newsletters")
    .select("publication_date, content")
    .order("publication_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Unable to generate RSS feed: ${error.message}`);
  const newsletters = (data ?? []) as Newsletter[];
  const lastBuildDate = newsletters[0]
    ? new Date(`${newsletters[0].publication_date}T07:00:00Z`).toUTCString()
    : new Date().toUTCString();

  const items = newsletters.map((newsletter) => {
    const url = issueUrl(newsletter.publication_date);
    return `<item>
      <title>${escapeXml(issueTitle(newsletter))}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${newsletter.publication_date}T07:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(issueDescription(newsletter))}</description>
    </item>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>/thepaymentsnerd</title>
    <link>${SITE_URL}</link>
    <description>Five critical payments insights. Zero noise. Daily.</description>
    <language>en-GB</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
