// web/components/LegalPageLayout.tsx
// Swiss-minimal wrapper for /privacy, /legal, /cookies. Paper background,
// no grid/glow, type-driven hierarchy. NavigationBar is provided by the
// root layout; this component only renders the editorial column + footer.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { MoveLeft } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      <div className="mx-auto max-w-3xl px-4 sm:px-8 lg:px-16 py-12 sm:py-16">
        <Link
          href="/"
          className="label-mono mb-12 inline-flex items-center gap-2 text-[var(--muted)] transition-colors hover:text-[var(--accent)] group"
        >
          <MoveLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to main page</span>
        </Link>

        <article>
          <h1 className="mb-8 border-b-2 border-[var(--ink)] pb-4 text-[40px] sm:text-[56px] font-extrabold leading-[1.02] tracking-[-0.025em] text-[var(--ink)]">
            {title}
          </h1>
          <div className="prose-legal">{children}</div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
