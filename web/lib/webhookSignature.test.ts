import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifySvixSignature } from "./webhookSignature";

const KEY = Buffer.from("test-signing-key-0123456789");
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW = 1_800_000_000;
const BODY = JSON.stringify({ type: "email.delivered", data: { to: ["a@b.com"] } });

function sign(id: string, ts: number, body: string, key = KEY) {
  return crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

function headers(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    "svix-id": "msg_1",
    "svix-timestamp": String(NOW),
    "svix-signature": `v1,${sign("msg_1", NOW, BODY)}`,
    ...overrides,
  };
  const h = new Headers();
  for (const [k, v] of Object.entries(base)) if (v !== undefined) h.set(k, v);
  return h;
}

describe("verifySvixSignature", () => {
  it("accepts a correctly signed payload", () => {
    expect(verifySvixSignature(BODY, headers(), SECRET, NOW)).toBe(true);
  });

  it("accepts when any of several signatures matches", () => {
    const h = headers({ "svix-signature": `v1,bogus v1,${sign("msg_1", NOW, BODY)}` });
    expect(verifySvixSignature(BODY, h, SECRET, NOW)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifySvixSignature(BODY + " ", headers(), SECRET, NOW)).toBe(false);
  });

  it("rejects a signature made with another key", () => {
    const h = headers({ "svix-signature": `v1,${sign("msg_1", NOW, BODY, Buffer.from("other"))}` });
    expect(verifySvixSignature(BODY, h, SECRET, NOW)).toBe(false);
  });

  it("rejects stale or future timestamps", () => {
    expect(verifySvixSignature(BODY, headers(), SECRET, NOW + 301)).toBe(false);
    expect(verifySvixSignature(BODY, headers(), SECRET, NOW - 301)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(verifySvixSignature(BODY, headers({ "svix-signature": undefined }), SECRET, NOW)).toBe(false);
    expect(verifySvixSignature(BODY, headers({ "svix-id": undefined }), SECRET, NOW)).toBe(false);
  });

  it("fails closed when the secret is not configured", () => {
    expect(verifySvixSignature(BODY, headers(), undefined, NOW)).toBe(false);
    expect(verifySvixSignature(BODY, headers(), "", NOW)).toBe(false);
  });
});
