import crypto from "crypto";

/**
 * Check `Authorization: Bearer <secret>` against an env-provided secret.
 * Fails closed: an unset or empty secret rejects every request, so a missing
 * env var can never turn into a literal "Bearer undefined" password.
 */
export function hasBearerSecret(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Authorize scheduled/internal callers that present CRON_SECRET. */
export function isCronAuthorized(req: Request): boolean {
  return hasBearerSecret(req, process.env.CRON_SECRET);
}
