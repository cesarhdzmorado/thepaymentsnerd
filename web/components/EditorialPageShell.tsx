import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";

interface EditorialPageShellProps {
  eyebrow: string;
  title: ReactNode;
  dek: string;
  children: ReactNode;
}

export function EditorialPageShell({ eyebrow, title, dek, children }: EditorialPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-16">
        <header className="border-b-2 border-[var(--ink)] py-16 sm:py-20 lg:py-24">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-1.5 w-1.5 bg-[var(--accent)]" aria-hidden="true" />
            <span className="label-mono label-mono--ink">{eyebrow}</span>
          </div>
          <h1 className="min-w-0 max-w-[14ch] text-[46px] font-extrabold leading-[0.92] tracking-[-0.045em] [overflow-wrap:anywhere] sm:text-[72px] lg:text-[96px]">
            {title}
          </h1>
          <p className="mt-10 max-w-[58ch] text-lg leading-relaxed text-[var(--ink-3)] sm:text-xl">
            {dek}
          </p>
        </header>

        {children}

        <Footer />
      </div>
    </div>
  );
}
