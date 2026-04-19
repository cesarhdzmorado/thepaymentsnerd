// web/components/NavigationBar.tsx
// Swiss masthead — sticky, ink top rule, issue/date left, brand center, CTA right.
// Scroll progress lives in the accent color, thin and silent.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handle = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollable = documentHeight - windowHeight;
      const pct = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    window.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return progress;
}

function useIssueDateline() {
  // Client-only to avoid SSR/CSR mismatch from Date(). Renders a placeholder
  // on the server and fills in once mounted.
  const [dateline, setDateline] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
    const day = now.toLocaleDateString("en-US", { day: "2-digit" });
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const year = now.getFullYear();
    setDateline(`${weekday} ${day} ${month} ${year}`.toUpperCase());
  }, []);

  return dateline;
}

export function NavigationBar() {
  const progress = useScrollProgress();
  const dateline = useIssueDateline();

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-t-[3px] border-t-[var(--ink)] border-b border-b-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur-md"
      aria-label="Site"
    >
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-8">
        {/* Left: issue + dateline (desktop only) */}
        <div className="label-mono hidden sm:block">
          {dateline ? `Issue · ${dateline} · 08:30 UTC` : ""}
        </div>

        {/* Center: brand wordmark */}
        <Link
          href="/"
          aria-label="Back to homepage"
          className="select-none text-center text-[15px] font-extrabold tracking-[-0.01em] text-[var(--ink)]"
        >
          <span className="text-[var(--accent)]">/</span>
          thepaymentsnerd
        </Link>

        {/* Right: CTA */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/#subscribe"
            className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-3.5 py-2 text-xs font-semibold tracking-[0.02em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)]"
          >
            Subscribe →
          </Link>
        </div>
      </div>

      {/* Scroll progress — 1px vermillion bar along the bottom edge */}
      <div
        aria-hidden="true"
        className="h-px bg-[var(--accent)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </nav>
  );
}
