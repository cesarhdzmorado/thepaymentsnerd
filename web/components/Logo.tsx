// web/components/Logo.tsx
// Swiss wordmark — ink on paper, vermillion slash. Blinking cursor kept for
// personality and the reduced-motion behavior is preserved.

"use client";

import { useEffect, useState } from "react";

export function Logo({ className }: { className?: string }) {
  const fullText = "thepaymentsnerd";
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    setShowCursor(true);
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    const hideCursorTimeout = setTimeout(() => setShowCursor(false), 1500);

    return () => {
      clearInterval(cursorInterval);
      clearTimeout(hideCursorTimeout);
    };
  }, []);

  return (
    <span
      className={[
        "inline-block font-extrabold tracking-[-0.025em] text-[var(--ink)] leading-none",
        className ?? "text-4xl sm:text-5xl md:text-6xl",
      ].join(" ")}
    >
      <span className="text-[var(--accent)]">/</span>
      {fullText}
      {showCursor && (
        <span
          aria-hidden="true"
          className="ml-1 -mb-1 inline-block h-[0.85em] w-[3px] bg-[var(--accent)] transition-opacity duration-100"
        />
      )}
    </span>
  );
}
