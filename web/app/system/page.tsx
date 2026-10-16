import type { Metadata } from "next";
import { EditorialPageShell } from "@/components/EditorialPageShell";
import { StructuredData } from "@/components/StructuredData";
import { webPageJsonLd } from "@/lib/structuredData";

const title = "The System | /thepaymentsnerd";
const description = "How /thepaymentsnerd uses autonomous research, source intelligence, editorial agents, and deterministic release gates.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/system" },
  openGraph: { title, description, url: "/system" },
};

const stages = [
  { number: "01", name: "Discover", action: "Tool-using research agents review regulators, companies, specialist feeds, search, and original reporting.", proof: "Candidate evidence", block: "Inaccessible or generic source" },
  { number: "02", name: "Resolve", action: "Reports are grouped into underlying events so five rewrites do not become five stories.", proof: "Event clusters", block: "Duplicate or stale event" },
  { number: "03", name: "Rank", action: "Source authority, originality, specificity, and factual agreement determine the canonical evidence.", proof: "Source decision", block: "Material source conflict" },
  { number: "04", name: "Compose", action: "Specialised writing and editing agents turn verified events into concise payments intelligence.", proof: "Source-bound copy", block: "Unsupported implication" },
  { number: "05", name: "Release", action: "Deterministic checks validate structure, source specificity, and publishability before distribution.", proof: "Release record", block: "Blocking source or schema failure" },
];

const releaseRules = [
  "Every story resolves to a specific article or primary document.",
  "Canonical sources survive writing and editing unchanged.",
  "Candidates are checked against recent coverage before they reach the writer.",
  "Conflicting high-authority evidence blocks publication rather than forcing a winner.",
  "Unverified caveats, generic landing pages, and unsupported specificity do not ship.",
];

export default function SystemPage() {
  return (
    <EditorialPageShell
      eyebrow="Editorial system · v2026.10"
      title={<><span className="block">Autonomous by default.</span><span className="block text-[var(--accent)]">Auditable by design.</span></>}
      dek="A multi-stage research and editorial system discovers payments events, resolves competing reports, selects canonical evidence, and releases only what passes explicit controls."
    >
      <StructuredData data={webPageJsonLd("WebPage", title, "https://www.thepaymentsnerd.co/system", description)} />

      <section className="border-b border-[var(--rule)] py-16 sm:py-20">
        <div className="mb-12 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="label-mono label-mono--accent mb-4">Operating model</p>
            <h2 className="text-[36px] font-extrabold leading-none tracking-[-0.03em] sm:text-[48px]">Five bounded stages.</h2>
          </div>
          <p className="max-w-[56ch] text-[17px] leading-relaxed text-[var(--ink-3)] lg:justify-self-end">Agents are allowed to explore, retrieve, compare, and draft. They are not allowed to redefine evidence, silently repair conflicts, or bypass release contracts.</p>
        </div>

        <div className="grid border-t-2 border-[var(--ink)] md:grid-cols-2 lg:grid-cols-5">
          {stages.map((stage) => (
            <article key={stage.number} className="flex min-h-[360px] flex-col border-b border-[var(--rule)] p-6 md:border-r lg:border-b-0 last:border-r-0">
              <div className="mb-10 flex items-baseline justify-between">
                <span className="font-mono text-sm text-[var(--accent)]">{stage.number}</span>
                <span className="h-1.5 w-1.5 bg-[var(--ink)]" aria-hidden="true" />
              </div>
              <h3 className="mb-5 text-2xl font-extrabold tracking-[-0.025em]">{stage.name}</h3>
              <p className="mb-8 text-[15px] leading-relaxed text-[var(--ink-3)]">{stage.action}</p>
              <dl className="mt-auto grid gap-4 border-t border-[var(--rule)] pt-5 text-xs">
                <div><dt className="label-mono mb-1">Produces</dt><dd className="font-semibold">{stage.proof}</dd></div>
                <div><dt className="label-mono mb-1 text-[var(--accent)]">Blocks on</dt><dd className="font-semibold">{stage.block}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="grid bg-[var(--ink)] text-[var(--paper)] lg:grid-cols-2">
        <div className="border-b border-[#333] p-7 sm:p-10 lg:border-b-0 lg:border-r">
          <p className="label-mono mb-5 text-[var(--accent)]">The release contract</p>
          <h2 className="max-w-[13ch] text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[52px]">Fluency never outranks evidence.</h2>
        </div>
        <ol className="divide-y divide-[#333]">
          {releaseRules.map((rule, index) => (
            <li key={rule} className="grid grid-cols-[42px_1fr] gap-3 p-6 text-[15px] leading-relaxed sm:px-10">
              <span className="font-mono text-xs text-[var(--accent)]">R{index + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-12 border-b border-[var(--rule)] py-16 sm:py-20 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="label-mono label-mono--accent mb-5">Visible assurance</p>
          <h2 className="mb-6 text-[36px] font-extrabold leading-none tracking-[-0.03em]">What readers should see.</h2>
          <ul className="grid gap-4 border-t-2 border-[var(--ink)] pt-5 text-[16px] text-[var(--ink-3)]">
            <li>Direct source links and permanent issue URLs</li>
            <li>Clear distinctions between fact and interpretation</li>
            <li>Public editorial rules and correction channels</li>
            <li>Versioned improvements to the publication system</li>
          </ul>
        </div>
        <div>
          <p className="label-mono mb-5">Protected advantage</p>
          <h2 className="mb-6 text-[36px] font-extrabold leading-none tracking-[-0.03em]">What remains proprietary.</h2>
          <ul className="grid gap-4 border-t-2 border-[var(--ink)] pt-5 text-[16px] text-[var(--ink-3)]">
            <li>Prompts, agent topology, and model-routing policy</li>
            <li>Source-discovery maps, rankings, weights, and thresholds</li>
            <li>Event fingerprints, evaluation sets, and regression fixtures</li>
            <li>Failure data, cost controls, and internal operating telemetry</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="label-mono label-mono--accent mb-5">Technology stance</p>
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[56px]">Models change. The system compounds.</h2>
        </div>
        <div className="grid gap-6 text-[17px] leading-[1.75] text-[var(--ink-3)] lg:col-span-7">
          <p>Frontier models are replaceable components. Durable advantage comes from payments-specific memory: entities, events, source performance, editorial failures, corrections, and tests accumulated across every edition.</p>
          <p>When the system makes a mistake, the objective is not merely to repair the issue. The failure becomes a regression case so the same class of defect is harder to publish again.</p>
        </div>
      </section>
    </EditorialPageShell>
  );
}
