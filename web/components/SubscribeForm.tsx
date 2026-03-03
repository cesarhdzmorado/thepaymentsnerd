"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { CheckCircle2, AlertCircle, Loader2, Copy, Share2 } from "lucide-react";
import { Button, Input, cardClasses } from "./ui";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SubscribeForm({ source = "homepage" }: { source?: string }) {
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
        track("referral_link_generated", {
          source,
        });
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  async function copyReferralLink() {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      track("referral_share_clicked", {
        source,
        channel: "copy",
      });
    } catch {
      setLinkCopied(false);
    }
  }

  const xShareUrl = referralUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent("I read /thepaymentsnerd for daily payments signal. Join me:")}&url=${encodeURIComponent(referralUrl)}`
    : null;
  const linkedinShareUrl = referralUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
    : null;

  return (
    <div className="text-center">
      {bannerMessage && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm font-medium
                        bg-blue-50 dark:bg-blue-900/20
                        text-blue-800 dark:text-blue-200
                        border border-blue-200 dark:border-blue-800
                        animate-fade-in"
          role="status"
          aria-live="polite"
        >
          {bannerMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} className="w-full max-w-xl mx-auto px-4">
        <label
          htmlFor="subscribe-email"
          className="mb-2 block text-left text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Email address
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`relative flex-1 ${status === "error" ? "animate-shake" : ""}`}>
            <Input
              id="subscribe-email"
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
              aria-describedby={hasFeedbackMessage ? "subscribe-feedback" : undefined}
            />
            {status === "success" && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 dark:text-green-400 animate-scale-in" />
            )}
          </div>

          <Button
            type="submit"
            disabled={status === "loading"}
            size="lg"
            className="group relative min-w-[140px] overflow-hidden sm:min-w-[120px]
                       hover:shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-slate-100/10
                       hover:scale-105 active:scale-95
                       disabled:hover:scale-100"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Subscribing…</span>
              </>
            ) : (
              <span className="relative z-10">Subscribe</span>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
        </div>
      </form>

      {/* Message */}
      {message && (
        <div
          id="subscribe-feedback"
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
          className={`${cardClasses()} mt-5 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            status === "error"
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-shake"
              : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 animate-scale-in"
          }`}
        >
          {status === "error" ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0 animate-pulse" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {status === "success" && referralUrl && (
        <div className={`${cardClasses()} mt-4 p-4 text-left animate-fade-in-up`}>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Grow the newsletter with your referral link</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Share once now to bring in your payments network.
          </p>

          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-2 text-xs break-all text-slate-700 dark:text-slate-300">
            {referralUrl}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={copyReferralLink}>
              <Copy className="h-3.5 w-3.5" />
              {linkCopied ? "Copied" : "Copy link"}
            </Button>

            {xShareUrl && (
              <a
                href={xShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("referral_share_clicked", {
                    source,
                    channel: "x",
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share on X
              </a>
            )}

            {linkedinShareUrl && (
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("referral_share_clicked", {
                    source,
                    channel: "linkedin",
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share on LinkedIn
              </a>
            )}
          </div>
        </div>
      )}

      {/* Footer text */}
      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200">
        You can unsubscribe anytime with one click.
      </p>
    </div>
  );
}
