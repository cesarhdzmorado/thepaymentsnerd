"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile bot check. Renders nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Uses "interaction-only" appearance,
 * so most visitors never see a challenge. Bump `resetKey` after each submit,
 * because a token can only be redeemed once.
 */
export function TurnstileWidget({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;
    const mount = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return false;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: "interaction-only",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
      return true;
    };

    // The script loads asynchronously and is shared by every form on the page.
    const interval = mount() ? undefined : setInterval(() => mount() && clearInterval(interval), 200);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current || !window.turnstile) return;
    onTokenRef.current(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        id="cf-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} className="mt-3" />
    </>
  );
}
