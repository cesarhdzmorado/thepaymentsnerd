import crypto from "crypto";

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Svix-signed webhook (the scheme Resend uses).
 * Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256 with
 * the base64 key after the `whsec_` prefix. `svix-signature` holds one or more
 * space-separated `v1,<base64>` entries. Fails closed on any missing input.
 */
export function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret) return false;

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(
    crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64")
  );

  return signatureHeader.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const actual = Buffer.from(signature);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
}
