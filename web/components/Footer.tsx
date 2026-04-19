// web/components/Footer.tsx
// Swiss footer — 4-col grid on desktop, two rails on mobile.
// Keeps the heart click easter-egg but swaps the gradient link styling
// for straight ink + vermillion-underline-on-hover.
"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

interface FooterLink {
  name: string;
  href: string;
}

const READ_LINKS: FooterLink[] = [
  { name: "Latest issue", href: "/" },
  { name: "Weekly recap", href: "/#subscribe" },
];

const COMPANY_LINKS: FooterLink[] = [
  {
    name: "Advertise",
    href: "mailto:cesar@thepaymentsnerd.co?subject=Sponsorship%20Inquiry%20%E2%80%94%20The%20Payments%20Nerd",
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/legal" },
  { name: "Cookies", href: "/cookies" },
];

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h4 className="label-mono mb-4">{heading}</h4>
      <ul className="grid gap-2 text-[13px]">
        {links.map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              className="text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
            >
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const [heartClicks, setHeartClicks] = useState(0);

  return (
    <footer className="relative -mx-4 sm:-mx-8 lg:-mx-16 mt-16 border-t border-[var(--rule)] bg-[var(--paper-2)] px-4 sm:px-8 lg:px-16 pb-12 pt-14">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
        <div className="col-span-2 md:col-span-1">
          <div className="text-[15px] font-extrabold tracking-[-0.01em] text-[var(--ink)]">
            <span className="text-[var(--accent)]">/</span>thepaymentsnerd
          </div>
          <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-[var(--muted)]">
            Five critical payments insights. Zero noise. Daily. Made for the payments
            community.
          </p>
        </div>
        <FooterColumn heading="Read" links={READ_LINKS} />
        <FooterColumn heading="Company" links={COMPANY_LINKS} />
        <FooterColumn heading="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--rule)] pt-6 sm:flex-row sm:items-center">
        <span className="label-mono">© {new Date().getFullYear()} /thepaymentsnerd</span>
        <span className="label-mono inline-flex items-center gap-1.5">
          Made with
          <button
            onClick={() => setHeartClicks((p) => p + 1)}
            aria-label="Show some love"
            className="group relative rounded-full p-0.5 transition-transform duration-200 hover:scale-125 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Heart
              className={`h-3 w-3 fill-current text-[var(--accent)] transition-all duration-300 ${
                heartClicks > 0 ? "animate-pulse" : ""
              }`}
            />
            {heartClicks > 0 && (
              <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--accent)] animate-fade-in">
                +{heartClicks}
              </span>
            )}
          </button>
          for payments nerds
        </span>
      </div>
    </footer>
  );
}
