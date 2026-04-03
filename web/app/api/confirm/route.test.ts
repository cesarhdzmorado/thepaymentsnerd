import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock next/server
const mockRedirect = vi.fn((url: string) => ({
  status: 307,
  headers: new Headers({ Location: url }),
  url,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: string) => mockRedirect(url),
  },
}));

// Mock dependencies
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSend = vi.fn();

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          mockEq(...args);
          return { single: () => mockSingle() };
        },
      }),
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return {
          eq: () => ({ error: null }),
        };
      },
    }),
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => mockSend(...args) };
  },
}));

vi.mock("@/lib/emailTokens", () => ({
  verifyToken: (token: string) => {
    if (token === "valid-token")
      return { email: "test@example.com", purpose: "confirm", exp: Date.now() + 100000 };
    if (token === "wrong-purpose")
      return { email: "test@example.com", purpose: "unsubscribe", exp: Date.now() + 100000 };
    throw new Error("Invalid token");
  },
  makeToken: () => "mock-unsub-token",
}));

vi.mock("@/lib/transactionalEmails", () => ({
  renderWelcomeEmail: async (props: { referralUrl?: string; unsubscribeUrl: string }) =>
    `<html>welcome referralUrl=${props.referralUrl || "none"}</html>`,
}));

const SITE_URL = "https://thepaymentsnerd.co";
vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
vi.stubEnv("RESEND_API_KEY", "re_test");
vi.stubEnv("SUBSCRIBE_TOKEN_SECRET", "secret");
vi.stubEnv("EMAIL_FROM", "test@thepaymentsnerd.co");

import { GET } from "./route";

function makeRequest(token?: string) {
  const url = token
    ? `https://localhost/api/confirm?token=${token}`
    : "https://localhost/api/confirm";
  return new Request(url, { method: "GET" });
}

describe("GET /api/confirm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to error page when token is missing", async () => {
    await GET(makeRequest());
    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=0`);
  });

  it("redirects to error page for invalid token", async () => {
    await GET(makeRequest("bad-token"));
    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=0`);
  });

  it("redirects to error page for wrong token purpose", async () => {
    await GET(makeRequest("wrong-purpose"));
    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=0`);
  });

  it("activates pending subscriber and sends welcome email", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "pending", confirmed_at: null, referral_code: "REF123" },
    });
    mockSend.mockResolvedValueOnce({});

    await GET(makeRequest("valid-token"));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].subject).toBe("Welcome to /thepaymentsnerd");
    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=1`);
  });

  it("does NOT send duplicate welcome email for already-confirmed subscriber", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: "REF123" },
    });

    await GET(makeRequest("valid-token"));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=1`);
  });

  it("passes referral URL to welcome email when referral_code exists", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "pending", confirmed_at: null, referral_code: "MYCODE" },
    });
    mockSend.mockResolvedValueOnce({});

    await GET(makeRequest("valid-token"));

    const sentHtml = mockSend.mock.calls[0][0].html;
    expect(sentHtml).toContain(`referralUrl=${SITE_URL}?ref=MYCODE`);
  });

  it("passes undefined referral URL when no referral_code", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "pending", confirmed_at: null, referral_code: null },
    });
    mockSend.mockResolvedValueOnce({});

    await GET(makeRequest("valid-token"));

    const sentHtml = mockSend.mock.calls[0][0].html;
    expect(sentHtml).toContain("referralUrl=none");
  });

  // Keep env var test last to avoid stub leaking to other tests
  it("redirects to error page when env vars are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await GET(makeRequest("valid-token"));

    expect(mockRedirect).toHaveBeenCalledWith(`${SITE_URL}/?subscribed=0`);
    expect(mockSingle).not.toHaveBeenCalled();
  });
});
