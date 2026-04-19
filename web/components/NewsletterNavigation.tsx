"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NewsletterNavigationProps {
  prevDate: string | null;
  nextDate: string | null;
  currentDate: string;
  position?: "top" | "bottom";
}

function archiveButtonClasses(extra = "") {
  return [
    "label-mono inline-flex items-center gap-2 border border-[var(--ink)] bg-transparent px-4 py-3 text-[var(--ink)]",
    "transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function NewsletterNavigation({
  prevDate,
  nextDate,
  currentDate,
  position = "bottom",
}: NewsletterNavigationProps) {
  const router = useRouter();
  const [todayLocal, setTodayLocal] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setTodayLocal(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && prevDate) {
        router.push(`/?date=${prevDate}`);
      } else if (e.key === "ArrowRight" && nextDate) {
        router.push(`/?date=${nextDate}`);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [prevDate, nextDate, router]);

  const formatDateLabel = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    return d
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      .toUpperCase();
  };

  const showTodayButton = todayLocal !== null && currentDate !== todayLocal;
  const hasControls = Boolean(prevDate || nextDate || showTodayButton);

  if (!hasControls && position === "top") return null;

  return (
    <section
      className={`${position === "top" ? "border-b border-[var(--rule)]" : "border-y border-[var(--rule)]"} py-8`}
      aria-label="Newsletter archive navigation"
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div>
          {prevDate ? (
            <button
              onClick={() => router.push(`/?date=${prevDate}`)}
              className={archiveButtonClasses()}
              aria-label="Previous day's newsletter"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{formatDateLabel(prevDate)}</span>
            </button>
          ) : (
            <span className="label-mono">Start of archive</span>
          )}
        </div>

        <div className="label-mono hidden text-center sm:block">
          {position === "bottom"
            ? "Use ← → arrow keys to navigate the archive"
            : ""}
        </div>

        <div className="flex items-center gap-2">
          {showTodayButton && (
            <button
              onClick={() => router.push("/")}
              className={archiveButtonClasses()}
            >
              Today
            </button>
          )}
          {nextDate ? (
            <button
              onClick={() => router.push(`/?date=${nextDate}`)}
              className={archiveButtonClasses()}
              aria-label="Next day's newsletter"
            >
              <span>{formatDateLabel(nextDate)}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="label-mono">Latest</span>
          )}
        </div>
      </div>
    </section>
  );
}
