"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { type ReactNode, useState, Suspense } from "react";
import Link from "next/link";
import { Button, Card, buttonClasses } from "@/components/ui";

function ConfirmShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen px-4 py-8 sm:py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-grid-pattern opacity-35 dark:opacity-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 -z-30 glow-bg"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/confirm?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });

      if (response.ok) {
        router.replace("/?subscribed=1");
        return;
      }

      const data = await response.json().catch(() => ({}));
      setError(data.message || "Failed to confirm. Please try again.");
    } catch {
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <ConfirmShell>
        <Card strong className="w-full p-8 text-center sm:p-10">
          <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Invalid Link
          </h1>
          <p className="mb-6 text-slate-600 dark:text-slate-300">
            This confirmation link is invalid or has expired.
          </p>
          <Link
            href="/"
            className={buttonClasses({ variant: "primary" })}
          >
            Go to Homepage
          </Link>
        </Card>
      </ConfirmShell>
    );
  }

  return (
    <ConfirmShell>
      <Card strong className="w-full p-8 text-center sm:p-10">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Confirm your subscription
        </h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          One click and you&apos;ll get five critical payments insights in your inbox every weekday.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={loading}
          variant="primary"
        >
          {loading ? "Confirming..." : "Confirm Subscription"}
        </Button>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Didn&apos;t sign up? Ignore this page and you won&apos;t hear from us.
        </p>
      </Card>
    </ConfirmShell>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <ConfirmShell>
        <Card className="w-full p-8 text-center text-slate-600 dark:text-slate-300">
          Loading...
        </Card>
      </ConfirmShell>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
