import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { StructuredData } from "@/components/StructuredData";
import { webPageJsonLd } from "@/lib/structuredData";

const title = "About /thepaymentsnerd";
const description = "An independent, source-linked daily briefing for people building and operating the payments industry.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPageLayout title="About">
      <StructuredData data={webPageJsonLd("AboutPage", title, "https://www.thepaymentsnerd.co/about", description)} />
      <p><strong>/thepaymentsnerd</strong> is an independent daily briefing for people building, operating, regulating, and investing in payments.</p>

      <h2>Why it exists</h2>
      <p>Payments news is fragmented across regulators, networks, banks, fintech companies, specialist publications, and general business media. The signal is real; the volume is the problem. We reduce that surface to five developments worth understanding and explain why each matters.</p>

      <h2>What readers receive</h2>
      <ul>
        <li>Five concise payments stories with direct source links</li>
        <li>Clear separation between reported facts and editorial interpretation</li>
        <li>A short view of product launches, funding, expansion, and M&amp;A activity</li>
        <li>A permanent public archive of every issue</li>
      </ul>

      <h2>Publisher</h2>
      <p>Issues are published by the <strong>/thepaymentsnerd editorial desk</strong>. The production workflow is AI-assisted and governed by explicit sourcing, deduplication, verification, and release checks. Read the full <Link href="/methodology">editorial methodology</Link>.</p>

      <h2>Contact</h2>
      <p>Questions, corrections, or story leads: <a href="mailto:cesar@thepaymentsnerd.co">cesar@thepaymentsnerd.co</a>.</p>
    </LegalPageLayout>
  );
}
