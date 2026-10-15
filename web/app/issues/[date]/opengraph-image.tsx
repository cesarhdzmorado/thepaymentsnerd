import { ImageResponse } from "next/og";
import { getNewsletterByDate } from "@/app/page";
import { isIssueDate } from "@/lib/seo";

export const alt = "/thepaymentsnerd daily payments briefing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const newsletter = isIssueDate(date) ? await getNewsletterByDate(date) : null;
  const headline = newsletter?.content.news?.[0]?.title ?? "Five critical payments insights. Zero noise.";

  return new ImageResponse(
    <div style={{ alignItems: "stretch", background: "#FAFAF7", color: "#0A0A0A", display: "flex", flexDirection: "column", fontFamily: "Arial, Helvetica, sans-serif", height: "100%", justifyContent: "space-between", padding: "58px 68px", width: "100%" }}>
      <div style={{ display: "flex", fontSize: 29, fontWeight: 800 }}>
        <span style={{ color: "#E5361C" }}>/</span>thepaymentsnerd
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ color: "#E5361C", display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Daily briefing · {date}</div>
        <div style={{ display: "flex", fontSize: headline.length > 90 ? 50 : 60, fontWeight: 800, letterSpacing: -2.4, lineHeight: 1.04, maxWidth: 1040 }}>{headline}</div>
      </div>
      <div style={{ borderTop: "2px solid #0A0A0A", display: "flex", fontSize: 20, justifyContent: "space-between", paddingTop: 22 }}>
        <span>Five stories. Source-linked.</span>
        <span>thepaymentsnerd.co</span>
      </div>
    </div>,
    size,
  );
}
