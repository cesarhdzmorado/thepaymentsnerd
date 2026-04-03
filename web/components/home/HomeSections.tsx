import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ExternalLink,
  Flame,
  Lightbulb,
} from "lucide-react";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { Logo } from "@/components/Logo";
import { HeroAnimations } from "@/components/home/HeroAnimations";
import { ShareButtons } from "@/components/ShareButtons";
import { SubscribeForm } from "@/components/SubscribeForm";
import { Badge, cardClasses } from "@/components/ui";
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

export function HomeHeader({
  formattedDate,
  subscriberCount,
  roundedCount,
}: {
  formattedDate: string;
  subscriberCount: number;
  roundedCount: number;
}) {
  return (
    <header className="relative mb-0 pb-12 text-center">
      <HeroAnimations>
        <div className="mb-6">
          <Logo />
        </div>

        <p className="mx-auto mb-8 max-w-2xl text-xl sm:text-2xl font-medium text-muted leading-relaxed">
          Five critical payments insights. Zero noise. Daily.
        </p>

        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {subscriberCount > 10 ? (
              <>
                Join{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 dark:from-slate-100 dark:via-cyan-200 dark:to-indigo-200">
                  {roundedCount.toLocaleString()}+
                </span>{" "}
                payment professionals
              </>
            ) : (
              "Be among the first to join"
            )}
          </p>
        </div>

        <div
          className={cardClasses({
            className:
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5",
          })}
        >
          <Calendar className="h-4 w-4 text-blue-600 dark:text-cyan-300" />
          <span className="text-sm font-semibold">{formattedDate}</span>
        </div>

        <div id="subscribe" className="mx-auto mt-10 max-w-xl scroll-mt-24">
          <Suspense fallback={null}>
            <SubscribeForm source="homepage" />
          </Suspense>
        </div>

        <div className="mx-auto mt-8 flex justify-center">
          <ShareButtons />
        </div>
      </HeroAnimations>
    </header>
  );
}

export function LeadStorySection({ heroStory }: { heroStory: NewsItem | null }) {
  if (!heroStory) return null;

  return (
    <AnimateOnScroll>
    <section id="lead-story" className="mb-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent dark:via-cyan-500/30" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          Today&apos;s Lead Story
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent dark:via-cyan-500/30" />
      </div>

      <article
        className={cardClasses({
          className:
            "group relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl",
        })}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

        <div className="relative p-6 sm:p-12">
          <div className="flex items-start gap-4 sm:gap-8">
            <div
              className="flex-shrink-0 rounded-2xl p-4 text-white shadow-xl
                         bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600
                         dark:from-cyan-500 dark:via-indigo-500 dark:to-purple-500
                         transition-all duration-300
                         group-hover:scale-105 group-hover:shadow-2xl"
            >
              <BookOpen className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className="mb-4 text-2xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight
                           bg-clip-text text-transparent bg-gradient-to-r
                           from-slate-900 via-blue-900 to-indigo-900
                           dark:from-slate-100 dark:via-cyan-300 dark:to-indigo-300
                           transition-all duration-300"
              >
                {heroStory.title}
              </h3>

              <p className="mb-5 text-base sm:text-xl leading-relaxed text-slate-700 dark:text-slate-300 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                {heroStory.body}
              </p>

              <div className="flex items-center gap-2 text-sm font-medium text-muted">
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <span>Source:</span>
                <a
                  href={ensureHttps(heroStory.source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold
                             text-blue-700 hover:underline hover:text-indigo-700
                             dark:text-cyan-300 dark:hover:text-cyan-200
                             transition-all duration-300 group/link"
                >
                  {heroStory.source.name}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1
                     bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500
                     dark:from-cyan-500 dark:via-indigo-500 dark:to-purple-500
                     opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
          aria-hidden="true"
        />
      </article>
    </section>
    </AnimateOnScroll>
  );
}

export function QuickHitsSection({ quickHits }: { quickHits: NewsItem[] }) {
  if (quickHits.length === 0) return null;

  return (
    <AnimateOnScroll>
    <section id="quick-hits" className="mb-24">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          Also Worth Knowing
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {quickHits.map((item, index) => {
          return (
            <article
              key={index}
              className={cardClasses({
                className:
                  "group relative overflow-hidden transition-all duration-300 ease-out hover:shadow-lg",
              })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

              <div className="relative p-6">
                <Badge className="mb-3 transition-all duration-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                  #{index + 2}
                </Badge>

                <h3
                  className="mb-3 text-lg sm:text-xl font-display font-semibold leading-tight
                             text-slate-900 dark:text-slate-100
                             transition-all duration-300
                             group-hover:text-blue-700 dark:group-hover:text-cyan-300"
                >
                  {item.title}
                </h3>

                <p className="mb-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400 transition-colors duration-300 group-hover:text-slate-800 dark:group-hover:text-slate-300">
                  {item.body}
                </p>

                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  <a
                    href={ensureHttps(item.source.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold
                               text-blue-600 hover:underline hover:text-indigo-600
                               dark:text-cyan-400 dark:hover:text-cyan-300
                               transition-all duration-300 group/link"
                  >
                    {item.source.name}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </a>
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5
                           bg-gradient-to-r from-transparent via-slate-400/50 to-transparent
                           dark:via-slate-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              />
            </article>
          );
        })}
      </div>
    </section>
    </AnimateOnScroll>
  );
}

export function CuriositySection({ curiosity }: { curiosity: Curiosity }) {
  return (
    <AnimateOnScroll>
    <section
      id="curiosity"
      className="relative"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-3xl blur-3xl
                   bg-gradient-to-r from-amber-400/15 via-orange-400/15 to-yellow-400/15
                   dark:from-amber-300/12 dark:via-orange-300/12 dark:to-yellow-300/12
                   animate-pulse-glow"
        aria-hidden="true"
      />

      <div className={cardClasses({ strong: true, className: "relative p-8 sm:p-12 text-center" })}>
        <div className="mb-8 flex items-center justify-center gap-4">
          <div
            className="rounded-full p-4 text-white shadow-lg
                       bg-gradient-to-br from-amber-500 to-orange-600
                       dark:from-amber-400 dark:to-orange-500"
          >
            <Lightbulb className="h-7 w-7" />
          </div>

          <h3
            className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent
                       bg-gradient-to-r from-amber-700 via-orange-700 to-amber-700
                       dark:from-amber-300 dark:via-orange-300 dark:to-amber-300"
          >
            Did You Know?
          </h3>
        </div>

        <blockquote className="space-y-6 max-w-3xl mx-auto">
          <p className="text-xl sm:text-2xl leading-relaxed font-medium italic text-slate-900 dark:text-slate-100 relative">
            <span className="absolute -left-4 -top-6 text-6xl text-amber-200 dark:text-amber-800 opacity-50 select-none">
              &ldquo;
            </span>
            {curiosity.text}
          </p>
          {curiosity.source && (
            <cite className="inline-block text-base sm:text-lg font-semibold not-italic
                           text-amber-800 dark:text-amber-200
                           px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20">
              —{" "}
              <a
                href={ensureHttps(curiosity.source.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-all duration-300"
              >
                {curiosity.source.name}
              </a>
            </cite>
          )}
        </blockquote>
      </div>
    </section>
    </AnimateOnScroll>
  );
}

export function WhatsHotSection({ whatsHot }: { whatsHot: WhatsHotItem[] }) {
  if (whatsHot.length === 0) return null;

  return (
    <AnimateOnScroll>
    <section
      id="whats-hot"
      className="mt-16 relative"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-3xl blur-3xl
                   bg-gradient-to-r from-red-400/15 via-orange-400/15 to-rose-400/15
                   dark:from-red-300/12 dark:via-orange-300/12 dark:to-rose-300/12
                   animate-pulse-glow"
        aria-hidden="true"
      />

      <div className={cardClasses({ strong: true, className: "relative p-8 sm:p-10" })}>
        <div className="mb-6 flex items-center gap-4">
          <div
            className="rounded-full p-3 text-white shadow-lg
                       bg-gradient-to-br from-red-500 to-orange-600
                       dark:from-red-400 dark:to-orange-500"
          >
            <Flame className="h-6 w-6" />
          </div>

          <div>
            <h3
              className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent
                         bg-gradient-to-r from-red-700 via-orange-700 to-rose-700
                         dark:from-red-300 dark:via-orange-300 dark:to-rose-300"
            >
              What&apos;s Hot
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Funding, M&A & Product Launches
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {groupWhatsHotByRegion(whatsHot).map((group) => (
            <div key={group.region}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <span>{group.info.emoji}</span>
                <span>{group.info.name}</span>
              </h4>
              <ul className="space-y-3 pl-2">
                {group.items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-base sm:text-lg text-slate-700 dark:text-slate-300"
                  >
                    <span className="text-xl flex-shrink-0">{item.flag}</span>
                    <span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({item.type})
                      </span>{" "}
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.company}
                      </span>{" "}
                      {item.description}
                      {item.source_url && (
                        <>
                          {"… "}
                          <a
                            href={ensureHttps(item.source_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-cyan-400 hover:underline"
                          >
                            Read more
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
    </AnimateOnScroll>
  );
}
