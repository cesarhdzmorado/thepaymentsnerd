import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { HeroAnimations } from "@/components/home/HeroAnimations";
import { ShareButtons } from "@/components/ShareButtons";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ensureHttps } from "@/lib/publicationNames";
import { groupWhatsHotByRegion } from "@/lib/regions";

export interface Source {
  name: string;
  url: string;
}

export interface NewsItem {
  title: string;
  body: string;
  source: Source;
}

export interface Curiosity {
  text: string;
  source?: Source;
}

export interface WhatsHotItem {
  flag: string;
  type: "fundraising" | "product" | "M&A" | "expansion";
  company: string;
  description: string;
  source_url?: string;
}

export interface NewsletterContent {
  news: NewsItem[];
  perspective?: string;
  curiosity: Curiosity;
  whats_hot?: WhatsHotItem[];
}

export interface Newsletter {
  publication_date: string;
  content: NewsletterContent;
}

/* ————————————————————————————————————————————————————————————————
 * Small, local helpers. Kept at module scope so there's no re-create
 * work on each render.
 * ———————————————————————————————————————————————————————————————— */

// Swiss: one accent used sparingly. What's Hot types are differentiated by
// the label text itself, not by color. All tags render in --ink to match
// the rest of the editorial system.
const TYPE_TAG_LABEL: Record<string, string> = {
  fundraising: "Fundraising",
  product: "Product",
  expansion: "Expansion",
  "M&A": "M&A",
};

function getTypeColor(): string {
  return "label-mono--ink";
}

function getTypeLabel(type: string): string {
  return TYPE_TAG_LABEL[type] ?? type;
}

function SectionHeader({
  kicker,
  meta,
}: {
  kicker: string;
  meta?: string;
}) {
  return (
    <div className="mb-10 flex items-baseline justify-between gap-6 border-b-2 border-[var(--ink)] pb-4">
      <div className="flex items-baseline gap-3">
        <span className="inline-block h-1.5 w-1.5 translate-y-[-2px] bg-[var(--accent)]" aria-hidden="true" />
        <span className="label-mono label-mono--ink" style={{ fontSize: 13 }}>
          {kicker}
        </span>
      </div>
      {meta && <span className="label-mono hidden sm:inline">{meta}</span>}
    </div>
  );
}

function SourceLink({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  return (
    <a
      href={ensureHttps(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="label-mono label-mono--ink inline-flex items-center gap-1.5 border-b border-[var(--ink)] pb-[2px] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
    >
      <span>Source: {name}</span>
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}

/* ————————————————————————————————————————————————————————————————
 * 1. Hero / masthead block
 * ———————————————————————————————————————————————————————————————— */

export function HomeHeader({
  formattedDate,
  subscriberCount,
  roundedCount,
  isArchive = false,
}: {
  formattedDate: string;
  subscriberCount: number;
  roundedCount: number;
  isArchive?: boolean;
}) {
  const hasSocialProof = subscriberCount > 10;

  return (
    <header className="relative border-b border-[var(--rule)] py-16 sm:py-20 lg:py-24">
      <HeroAnimations>
        {/* 1. Eyebrow — live indicator for today, archive label for past issues */}
        <div className="mb-7 flex items-center gap-3">
          {!isArchive && <span className="live-dot" aria-hidden="true" />}
          <span className="label-mono label-mono--ink">
            {isArchive ? `Archive · ${formattedDate}` : `Live · Today\u2019s Edition · ${formattedDate}`}
          </span>
        </div>

        {/* 2. Display headline — the mockup's "Five critical…" at hero scale */}
        <h1 className="mb-8 max-w-[16ch] text-[44px] sm:text-[64px] md:text-[84px] lg:text-[96px] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--ink)]">
          Five <span className="text-[var(--accent)]">critical</span> payments insights.
          <br />
          Zero noise.
          <br />
          Daily.
        </h1>

        {/* 3. Deck — the 5-minute briefing line */}
        <p className="mb-10 max-w-[44ch] text-lg sm:text-xl text-[var(--muted)] leading-relaxed">
          The 5-minute briefing for payments professionals who need to know what happened,
          what it means, and what to do about it — before their 9am.
        </p>

        {/* 4. Subscribe — primary CTA, above-fold on desktop */}
        <div id="subscribe" className="mt-2 max-w-xl scroll-mt-24">
          <Suspense fallback={null}>
            <SubscribeForm source="homepage" />
          </Suspense>
        </div>

        {/* 5. Social proof strip */}
        {hasSocialProof && (
          <div className="mt-10 border-t border-[var(--rule)] pt-6">
            <p className="label-mono mb-2">Trusted by payments operators</p>
            <p className="text-[15px] text-[var(--ink-3)]">
              Joined by{" "}
              <span className="font-semibold text-[var(--ink)]">
                {roundedCount.toLocaleString()}+
              </span>{" "}
              product, risk, and partnerships leads at networks, issuers, acquirers, and fintechs.
            </p>
          </div>
        )}

        {/* 6. Share buttons — hidden on mobile, kept for invariant */}
        <div className="mt-8 hidden sm:flex">
          <ShareButtons />
        </div>
      </HeroAnimations>
    </header>
  );
}

/* ————————————————————————————————————————————————————————————————
 * 2. Lead story — massive headline + drop-capped body
 * ———————————————————————————————————————————————————————————————— */

export function LeadStorySection({ heroStory }: { heroStory: NewsItem | null }) {
  if (!heroStory) return null;

  return (
    <AnimateOnScroll>
      <section id="lead-story" className="py-20 sm:py-24 border-b border-[var(--rule)]">
        <SectionHeader kicker="The Lead" meta="01 of 05 · Today's Top Story" />

        <article className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="label-mono label-mono--accent mb-5">Story 01</p>
            <h2 className="text-[32px] sm:text-[44px] lg:text-[56px] font-extrabold leading-[1.02] tracking-[-0.025em] text-[var(--ink)]">
              {heroStory.title}
            </h2>
          </div>
          <div className="lg:pt-2">
            <div className="drop-cap text-[16px] leading-[1.7] text-[var(--ink-3)] dark:text-[var(--ink-3)]">
              <p className="mb-4">{heroStory.body}</p>
            </div>
            <div className="mt-5">
              <SourceLink name={heroStory.source.name} url={heroStory.source.url} />
            </div>
          </div>
        </article>
      </section>
    </AnimateOnScroll>
  );
}

/* ————————————————————————————————————————————————————————————————
 * 3. Secondary stories — №02…№N grid, hairlines only
 * ———————————————————————————————————————————————————————————————— */

export function QuickHitsSection({ quickHits }: { quickHits: NewsItem[] }) {
  if (quickHits.length === 0) return null;

  return (
    <AnimateOnScroll>
      <section id="quick-hits" className="py-20 sm:py-24 border-b border-[var(--rule)]">
        <SectionHeader
          kicker="Also Worth Knowing"
          meta={`${quickHits.length} more to take into tomorrow`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-[var(--rule)]">
          {quickHits.map((item, index) => {
            const num = index + 2;
            const isRightCol = index % 2 === 1;
            return (
              <article
                key={index}
                className={[
                  "border-b border-[var(--rule)] py-10",
                  isRightCol ? "sm:pl-10" : "sm:border-r sm:border-[var(--rule)] sm:pr-10",
                ].join(" ")}
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="font-mono text-[44px] sm:text-[48px] font-medium leading-none tracking-[-0.02em] text-[var(--ink)]">
                    <span className="text-[var(--accent)]">№</span>
                    {String(num).padStart(2, "0")}
                  </div>
                </div>
                <h3 className="mb-3 max-w-[22ch] text-[22px] sm:text-[24px] font-bold leading-[1.15] tracking-[-0.015em] text-[var(--ink)]">
                  {item.title}
                </h3>
                <p className="mb-5 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--ink-3)]">
                  {item.body}
                </p>
                <SourceLink name={item.source.name} url={item.source.url} />
              </article>
            );
          })}
        </div>
      </section>
    </AnimateOnScroll>
  );
}

/* ————————————————————————————————————————————————————————————————
 * 4. Curiosity / "The Long Memory" — full-bleed ink band, oversized pull quote
 * ———————————————————————————————————————————————————————————————— */

export function CuriositySection({ curiosity }: { curiosity: Curiosity }) {
  // Full-bleed dark band. We escape the page's horizontal padding with
  // negative margins + calc so it stretches edge-to-edge without changing
  // page.tsx.
  return (
    <AnimateOnScroll>
      <section
        id="curiosity"
        className="relative -mx-4 sm:-mx-8 lg:-mx-16 my-0 bg-[var(--ink)] text-[var(--paper)] py-24 sm:py-28 lg:py-32"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-8 lg:px-16">
          <div className="flex items-baseline justify-between gap-6 border-b-2 border-[var(--paper)]/20 pb-4">
            <div className="flex items-baseline gap-3">
              <span className="inline-block h-1.5 w-1.5 translate-y-[-2px] bg-[var(--accent)]" aria-hidden="true" />
              <span className="label-mono text-[var(--paper)] opacity-80" style={{ fontSize: 13 }}>
                The Long Memory
              </span>
            </div>
            <span className="label-mono hidden sm:inline text-[var(--paper)] opacity-55">
              History that still rhymes
            </span>
          </div>

          <blockquote className="mt-10 max-w-[22ch] text-[28px] sm:text-[36px] lg:text-[46px] font-semibold leading-[1.15] tracking-[-0.02em]">
            <span className="mr-2 inline-block align-[-0.15em] text-[1.2em] font-extrabold leading-[0] text-[var(--accent)]">
              &ldquo;
            </span>
            {curiosity.text}
          </blockquote>

          {curiosity.source ? (
            <p className="mt-10">
              <a
                href={ensureHttps(curiosity.source.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="label-mono text-[var(--paper)] opacity-80 border-b border-[var(--paper)]/40 pb-[2px] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:opacity-100 transition-colors"
              >
                Source: {curiosity.source.name} ↗
              </a>
            </p>
          ) : (
            <p className="label-mono mt-10 text-[var(--paper)] opacity-55">
              Filed under: Payments History · The Long Memory
            </p>
          )}
        </div>
      </section>
    </AnimateOnScroll>
  );
}

/* ————————————————————————————————————————————————————————————————
 * 5. What's Hot — table: flag · type · company · description · source
 * ———————————————————————————————————————————————————————————————— */

export function WhatsHotSection({ whatsHot }: { whatsHot: WhatsHotItem[] }) {
  if (whatsHot.length === 0) return null;

  const grouped = groupWhatsHotByRegion(whatsHot);

  return (
    <AnimateOnScroll>
      <section id="whats-hot" className="py-20 sm:py-24 border-b border-[var(--rule)]">
        <SectionHeader
          kicker="What's Hot"
          meta="Funding · M&A · Launches · Expansion"
        />

        <div className="border-t-2 border-[var(--ink)]">
          {grouped.map((group) => (
            <div key={group.region}>
              {/* Region band */}
              <div className="flex items-center gap-3 border-b border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 sm:px-6">
                <span className="text-lg" aria-hidden="true">{group.info.emoji}</span>
                <span className="label-mono label-mono--ink">{group.info.name}</span>
              </div>

              {/* Rows */}
              {group.items.map((item, index) => {
                const hasLink = Boolean(item.source_url);
                const RowTag = hasLink ? "a" : "div";
                const rowProps = hasLink
                  ? {
                      href: ensureHttps(item.source_url!),
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {};
                return (
                  <RowTag
                    key={index}
                    {...rowProps}
                    className="grid grid-cols-[40px_1fr] sm:grid-cols-[50px_140px_1.1fr_2fr_100px] items-center gap-x-6 gap-y-1 border-b border-[var(--rule)] px-4 py-4 sm:px-6 sm:py-5 transition-colors hover:bg-[rgba(229,54,28,0.04)]"
                  >
                    <span className="row-start-1 text-xl leading-none" aria-hidden="true">
                      {item.flag}
                    </span>
                    <span
                      className={`label-mono ${getTypeColor()} sm:col-start-2`}
                      style={{ fontSize: 10 }}
                    >
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="col-start-2 sm:col-start-3 font-semibold tracking-[-0.01em] text-[var(--ink)]">
                      {item.company}
                    </span>
                    <span className="col-start-2 sm:col-start-4 text-[15px] leading-[1.5] text-[var(--ink-3)]">
                      {item.description}
                    </span>
                    {hasLink && (
                      <span className="col-start-2 sm:col-start-5 label-mono sm:text-right">
                        Read more ↗
                      </span>
                    )}
                  </RowTag>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </AnimateOnScroll>
  );
}
