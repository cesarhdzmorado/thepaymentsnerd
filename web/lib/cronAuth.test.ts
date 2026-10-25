import { describe, expect, it } from "vitest";
import { hasBearerSecret } from "./cronAuth";

function req(authorization?: string) {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers.authorization = authorization;
  return new Request("https://localhost/api/send-daily", { headers });
}

describe("hasBearerSecret", () => {
  it("accepts the exact bearer secret", () => {
    expect(hasBearerSecret(req("Bearer s3cret"), "s3cret")).toBe(true);
  });

  it("rejects a wrong or missing header", () => {
    expect(hasBearerSecret(req("Bearer nope"), "s3cret")).toBe(false);
    expect(hasBearerSecret(req("s3cret"), "s3cret")).toBe(false);
    expect(hasBearerSecret(req(), "s3cret")).toBe(false);
  });

  it("fails closed when the secret is unset or empty", () => {
    expect(hasBearerSecret(req("Bearer undefined"), undefined)).toBe(false);
    expect(hasBearerSecret(req("Bearer "), "")).toBe(false);
  });
});
