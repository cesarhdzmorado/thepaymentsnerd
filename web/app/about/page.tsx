import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPageShell } from "@/components/EditorialPageShell";
import { StructuredData } from "@/components/StructuredData";
import { webPageJsonLd } from "@/lib/structuredData";

const title = "About /thepaymentsnerd";
const description = "Independent payments intelligence for people building, operating, regulating, and investing in how money moves.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about" },
};

const contract = [
  ["Material over viral", "We select developments for their effect on payments infrastructure, products, economics, or regulation—not their social velocity."],
  ["Evidence over fluency", "Every story must remain attached to a specific source. Plausible language is not proof."],
  ["Primary sources first", "Regulators, filings, and original reporting outrank aggregation when they establish the same event more precisely."],
  ["Memory over repetition", "New candidates are compared with recent coverage to reduce recurring announcements being treated as new developments."],
];

export default function AboutPage() {
  return (
    <EditorialPageShell
      eyebrow="Independent payments intelligence"
      title={<>Signal for people who <span className="text-[var(--accent)]">move money.</span></>}
      dek="A daily briefing built to identify the few developments that change payments markets, products, and infrastructure—and discard the rest."
    >
      <StructuredData data={webPageJsonLd("AboutPage", title, "https://www.thepaymentsnerd.co/about", description)} />

      <section className="grid gap-10 border-b border-[var(--rule)] py-16 sm:py-20 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="label-mono label-mono--accent mb-5">The thesis</p>
          <h2 className="max-w-[14ch] text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[48px]">
            Payments is infrastructure. Coverage should be, too.
          </h2>
        </div>
        <div className="grid gap-6 text-[17px] leading-[1.75] text-[var(--ink-3)] lg:col-span-7 lg:pt-1">
          <p>Payments intelligence arrives fragmented across regulators, networks, banks, fintechs, company announcements, specialist publications, and financial media. The valuable signal exists; the distribution is the problem.</p>
          <p><strong className="text-[var(--ink)]">/thepaymentsnerd</strong> resolves that fragmentation into one concise daily edition: five developments, their strongest available sources, and the context needed to understand why they matter.</p>
        </div>
      </section>

      <section className="border-b border-[var(--rule)] py-16 sm:py-20">
        <div className="mb-12 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="label-mono label-mono--accent mb-4">The publication contract</p>
            <h2 className="text-[36px] font-extrabold leading-none tracking-[-0.03em] sm:text-[48px]">What we optimise for.</h2>
          </div>
          <p className="max-w-[52ch] text-[17px] leading-relaxed text-[var(--ink-3)] lg:justify-self-end">These principles govern selection and release. They are more durable than any model, prompt, or software stack.</p>
        </div>

        <div className="border-t-2 border-[var(--ink)]">
          {contract.map(([name, copy], index) => (
            <div key={name} className="grid gap-3 border-b border-[var(--rule)] py-7 sm:grid-cols-[80px_1fr_2fr] sm:gap-8">
              <span className="font-mono text-sm text-[var(--accent)]">0{index + 1}</span>
              <h3 className="text-xl font-bold tracking-[-0.02em]">{name}</h3>
              <p className="max-w-[62ch] leading-relaxed text-[var(--ink-3)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-12 border-b border-[var(--rule)] py-16 sm:py-20 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="label-mono label-mono--accent mb-5">Built for</p>
          <h2 className="mb-6 text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[48px]">People whose decisions have consequences.</h2>
          <p className="max-w-[54ch] text-[17px] leading-relaxed text-[var(--ink-3)]">Product, strategy, partnerships, risk, policy, and investment professionals who need to distinguish a meaningful change from another press release.</p>
        </div>
        <div className="border-l-2 border-[var(--ink)] pl-7 sm:pl-10">
          <p className="label-mono mb-5">Independent by design</p>
          <p className="mb-6 text-2xl font-bold leading-snug tracking-[-0.02em]">Advertising never buys editorial selection. Paid work must be labelled and separated from the five-story briefing.</p>
          <p className="leading-relaxed text-[var(--ink-3)]">The publication is produced by an autonomous research and editorial system with explicit evidence and release controls. Its operating model is public; its proprietary implementation is not.</p>
        </div>
      </section>

      <section className="grid gap-10 bg-[var(--ink)] px-6 py-12 text-[var(--paper)] sm:px-10 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="label-mono mb-5 text-[var(--accent)]">How the publication works</p>
          <h2 className="max-w-[18ch] text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[52px]">Autonomous by default. Auditable by design.</h2>
        </div>
        <Link href="/system" className="inline-flex min-h-12 items-center justify-center border border-[var(--paper)] px-5 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]">
          Explore the system →
        </Link>
      </section>

      <section className="grid gap-8 py-16 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="label-mono label-mono--accent mb-4">Accountability</p>
          <h2 className="text-[32px] font-extrabold tracking-[-0.03em]">Sources stay visible. Corrections stay possible.</h2>
        </div>
        <p className="text-[17px] leading-relaxed text-[var(--ink-3)]">For corrections, questions, or story leads, email <a className="border-b border-[var(--ink)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]" href="mailto:cesar@thepaymentsnerd.co">cesar@thepaymentsnerd.co</a>. Material errors are corrected in the permanent issue archive.</p>
      </section>
    </EditorialPageShell>
  );
}
