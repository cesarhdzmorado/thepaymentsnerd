// web/components/Logo.tsx
// Brand wordmark with subtle cursor animation and light + dark gradients.

'use client';

import { useState, useEffect } from 'react';

export function Logo({ className }: { className?: string }) {
  const fullText = '/thepaymentsnerd';
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    setShowCursor(true);

    // Cursor blink effect
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530); // Standard cursor blink rate

    // Keep cursor briefly for personality, then hide
    const hideCursorTimeout = setTimeout(() => {
      setShowCursor(false);
    }, 1500);

    return () => {
      clearInterval(cursorInterval);
      clearTimeout(hideCursorTimeout);
    };
  }, [fullText]);

  return (
    <h1
      className={`
        font-display font-black tracking-tighter
        bg-clip-text text-transparent
        bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900
        dark:bg-gradient-to-r dark:from-slate-100 dark:via-cyan-200 dark:to-indigo-200
        ${className ?? "text-4xl sm:text-5xl md:text-6xl"}
      `}
    >
      {fullText}
      {showCursor && (
        <span
          className={`
            inline-block w-[3px] h-[0.85em] ml-1 -mb-1
            bg-gradient-to-b from-blue-600 to-indigo-600
            dark:from-cyan-400 dark:to-indigo-400
            transition-opacity duration-100 opacity-100
          `}
          aria-hidden="true"
        />
      )}
    </h1>
  );
}
