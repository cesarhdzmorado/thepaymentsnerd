const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile is enforced only once TURNSTILE_SECRET_KEY is configured. */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when Turnstile is not configured; otherwise fails closed on a
 * missing token, a rejected token, or a network/parse error.
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("Turnstile verification error:", e instanceof Error ? e.message : e);
    return false;
  }
}
