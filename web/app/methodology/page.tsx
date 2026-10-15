import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { StructuredData } from "@/components/StructuredData";
import { webPageJsonLd } from "@/lib/structuredData";

const title = "Editorial Methodology | /thepaymentsnerd";
const description = "How /thepaymentsnerd discovers, ranks, verifies, writes, and corrects its AI-assisted payments briefing.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/methodology" },
  openGraph: { title, description, url: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <LegalPageLayout title="Editorial methodology">
      <StructuredData data={webPageJsonLd("WebPage", title, "https://www.thepaymentsnerd.co/methodology", description)} />
      <p><strong>/thepaymentsnerd is AI-assisted.</strong> Automation helps discover, compare, summarise, and edit stories. Publication is constrained by deterministic source and release checks; a fluent answer is not treated as evidence.</p>

      <h2>1. Discovery</h2>
      <p>The research pipeline reviews payments-focused feeds, search results, company announcements, regulator publications, and reputable reporting. Discovery breadth matters because source ranking cannot select a stronger source that was never found.</p>

      <h2>2. Event clustering and source selection</h2>
      <p>Reports describing the same underlying event are grouped before selection. Official regulator or company material is preferred for primary facts. High-quality original reporting is preferred over aggregators and rewrites when it adds independent detail. Specialist sources remain eligible when they provide genuinely original reporting.</p>

      <h2>3. Verification and deduplication</h2>
      <p>Candidate stories are checked against prior issues and against other stories in the same edition. Generic landing pages, unsupported claims, inaccessible evidence, and material factual conflicts can block publication rather than being silently rewritten.</p>

      <h2>4. Writing and editing</h2>
      <p>The system produces concise summaries for payments professionals, preserving the canonical source through the writing and editing stages. Interpretive claims must follow from the cited evidence; announced, approved, launched, and completed are treated as distinct states.</p>

      <h2>5. Curiosities and supporting evidence</h2>
      <p>Specific facts, dates, percentages, and customer totals should be traceable to a supporting source. Unsourced specificity is an editorial defect, not harmless colour.</p>

      <h2>Corrections</h2>
      <p>If an issue is wrong or materially incomplete, email <a href="mailto:cesar@thepaymentsnerd.co?subject=Correction%20for%20thepaymentsnerd">cesar@thepaymentsnerd.co</a> with the issue date, claim, and supporting evidence. Material corrections are applied to the archived issue.</p>

      <h2>Commercial independence</h2>
      <p>Advertising or sponsorship does not buy editorial selection. Any paid placement must be labelled clearly and kept separate from the five-story editorial briefing.</p>
    </LegalPageLayout>
  );
}
