"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { CheckCircle2, AlertCircle, Loader2, Copy, Share2 } from "lucide-react";
import { Button, LinkButton, Input, cardClasses } from "./ui";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ShareLink({
  href,
  channel,
  source,
  children,
}: {
  href: string;
  channel: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="ghost"
      size="sm"
      className="min-h-[44px] min-w-[44px]"
      onClick={() => track("referral_share_clicked", { source, channel })}
    >
      <Share2 className="h-3.5 w-3.5" />
      {children}
    </LinkButton>
  );
}

export function SubscribeForm({ source = "homepage", idPrefix = "subscribe" }: { source?: string; idPrefix?: string }) {
  const searchParams = useSearchParams();

  const subscribedFlag = searchParams.get("subscribed");
  const unsubscribedFlag = searchParams.get("unsubscribed");
  const referralCode = searchParams.get("ref"); // Capture referral code from URL

  const bannerMessage = useMemo(() => {
    if (subscribedFlag === "1") return "✅ Confirmed. You're subscribed.";
    if (subscribedFlag === "0") return "⚠️ That confirmation link didn't work. Try subscribing again.";
    if (unsubscribedFlag === "1") return "✅ You've been unsubscribed.";
    if (unsubscribedFlag === "0") return "⚠️ Unsubscribe link didn't work.";
    return null;
  }, [subscribedFlag, unsubscribedFlag]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const hasFeedbackMessage = message.length > 0;
  const referralInputRef = useRef<HTMLInputElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    setReferralUrl(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          source,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.message || "Something went wrong. Try again.");
        return;
      }

      const nextReferralUrl = typeof data?.referralUrl === "string" ? data.referralUrl : null;

      setStatus("success");
      setMessage("Check your inbox to confirm your subscription.");
      setReferralUrl(nextReferralUrl);
      setEmail("");

      track("subscribe_success", {
        source,
        referred: Boolean(referralCode),
      });

      if (nextReferralUrl) {
        track("referral_link_generated", { source });
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  const copyReferralLink = useCallback(async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
      track("referral_share_clicked", { source, channel: "copy" });
    } catch {
      // Clipboard failed — fall back to selecting the input text
      referralInputRef.current?.select();
    }
  }, [referralUrl, source]);

  const xShareUrl = referralUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent("I read @thepaymentsnerd for daily payments signal. Join me:")}&url=${encodeURIComponent(referralUrl)}`
    : null;
  const linkedinShareUrl = referralUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
    : null;

  return (
    <div className="w-full">
      {bannerMessage && (
        <div
          className="mb-5 rounded-[2px] px-4 py-3 text-sm font-medium
                        border border-[var(--ink)]
                        text-[var(--ink)]
                        animate-fade-in"
          role="status"
          aria-live="polite"
        >
          {bannerMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} className="w-full">
        <label
          htmlFor={`${idPrefix}-email`}
          className="sr-only"
        >
          Email address
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`relative flex-1 ${status === "error" ? "animate-shake" : ""}`}>
            <Input
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setMessage("");
                }
              }}
              disabled={status === "loading"}
              aria-invalid={status === "error"}
              aria-describedby={hasFeedbackMessage ? `${idPrefix}-feedback` : undefined}
            />
            {status === "success" && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 dark:text-green-400 animate-scale-in" />
            )}
          </div>

          <Button
            type="submit"
            disabled={status === "loading"}
            size="lg"
            className="min-w-[140px] sm:min-w-[120px]"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Subscribing…</span>
              </>
            ) : (
              <span>Subscribe →</span>
            )}
          </Button>
        </div>
      </form>

      {/* Error message */}
      {status === "error" && message && (
        <div
          id={`${idPrefix}-feedback`}
          role="alert"
          aria-live="assertive"
          className={`${cardClasses()} mt-5 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-shake`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 animate-pulse" />
          <span>{message}</span>
        </div>
      )}

      {/* Unified success + referral card */}
      {status === "success" && (
        <div
          id={`${idPrefix}-feedback`}
          role="status"
          aria-live="polite"
          className={`${cardClasses()} mt-5 p-4 text-left animate-fade-in`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{message}</span>
          </div>

          {referralUrl && (
            <>
              <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                Share The Payments Nerd
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Share your referral link to bring in your payments network.
              </p>

              <input
                ref={referralInputRef}
                type="text"
                readOnly
                value={referralUrl}
                onClick={() => referralInputRef.current?.select()}
                className="mt-3 w-full rounded-[2px] border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-2 text-xs text-[var(--ink-3)] select-all cursor-text"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={copyReferralLink}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>

                {xShareUrl && (
                  <ShareLink href={xShareUrl} channel="x" source={source}>
                    Share on X
                  </ShareLink>
                )}

                {linkedinShareUrl && (
                  <ShareLink href={linkedinShareUrl} channel="linkedin" source={source}>
                    Share on LinkedIn
                  </ShareLink>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer text */}
      <p className="label-mono mt-4">
        Free · Weekday mornings · Unsubscribe in one click
      </p>
    </div>
  );
}
