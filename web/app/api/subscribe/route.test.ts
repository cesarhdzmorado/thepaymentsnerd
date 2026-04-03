import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => {
      const status = init?.status ?? 200;
      return {
        status,
        json: async () => body,
      };
    },
  },
}));

// Mock external dependencies
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSend = vi.fn();

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { single: () => mockSingle() };
          },
        };
      },
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => mockSend(...args) };
  },
}));

vi.mock("@/lib/emailTokens", () => ({
  makeToken: () => "mock-token",
}));

vi.mock("@/lib/referrals", () => ({
  generateReferralCode: () => "TESTCODE",
}));

vi.mock("@/lib/transactionalEmails", () => ({
  renderAlreadySubscribedEmail: async () => "<html>already-subscribed</html>",
  renderConfirmSubscriptionEmail: async () => "<html>confirm-subscription</html>",
}));

// Set env vars
const SITE_URL = "https://thepaymentsnerd.co";
vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
vi.stubEnv("RESEND_API_KEY", "re_test");
vi.stubEnv("SUBSCRIBE_TOKEN_SECRET", "secret");
vi.stubEnv("EMAIL_FROM", "test@thepaymentsnerd.co");

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>, ip?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  return new Request("https://localhost/api/subscribe", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects invalid email with 400", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.message).toBe("Enter a valid email.");
  });

  it("sends 'already subscribed' email for active subscribers (no state leak)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: "EXISTING" },
    });
    mockSend.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ email: "active@test.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.referralUrl).toBe(`${SITE_URL}?ref=EXISTING`);
    // No state field in response (prevents email enumeration)
    expect(data).not.toHaveProperty("state");
    // Should NOT upsert, but SHOULD send email
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].subject).toBe("You're already subscribed");
  });

  it("returns site URL for active subscriber without referral_code", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: null },
    });
    mockSend.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ email: "active@test.com" }));
    const data = await res.json();

    expect(data.referralUrl).toBe(SITE_URL);
  });

  it("returns identical response shape for new and active subscribers", async () => {
    // Active subscriber
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: "ACTIVE_REF" },
    });
    mockSend.mockResolvedValueOnce({});
    const activeRes = await POST(makeRequest({ email: "active@test.com" }));
    const activeData = await activeRes.json();

    vi.resetAllMocks();

    // New subscriber
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});
    const newRes = await POST(makeRequest({ email: "new@test.com" }));
    const newData = await newRes.json();

    // Both responses have identical keys (no state field)
    expect(Object.keys(activeData).sort()).toEqual(Object.keys(newData).sort());
    expect(activeData).not.toHaveProperty("state");
    expect(newData).not.toHaveProperty("state");
  });

  it("creates new subscriber and sends confirmation (no state in response)", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ email: "new@test.com", source: "homepage" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data).not.toHaveProperty("state");
    expect(data.referralUrl).toBe(`${SITE_URL}?ref=TESTCODE`);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("does NOT overwrite referred_by when no referralCode provided", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    await POST(makeRequest({ email: "new@test.com" }));

    const upsertData = mockUpsert.mock.calls[0][0];
    expect(upsertData).not.toHaveProperty("referred_by");
  });

  it("sets referred_by when referralCode is valid", async () => {
    mockSingle.mockResolvedValueOnce({ data: null }); // subscriber check
    mockSingle.mockResolvedValueOnce({ data: { email: "referrer@test.com" } }); // referral validation
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    await POST(makeRequest({ email: "new@test.com", referralCode: "FRIEND123" }));

    const upsertData = mockUpsert.mock.calls[0][0];
    expect(upsertData.referred_by).toBe("FRIEND123");
  });

  it("rejects self-referral", async () => {
    mockSingle.mockResolvedValueOnce({ data: null }); // subscriber check
    mockSingle.mockResolvedValueOnce({ data: { email: "self@test.com" } }); // referral validation (same email)
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    await POST(makeRequest({ email: "self@test.com", referralCode: "MYCODE" }));

    const upsertData = mockUpsert.mock.calls[0][0];
    expect(upsertData).not.toHaveProperty("referred_by");
  });

  it("drops invalid referralCode silently", async () => {
    mockSingle.mockResolvedValueOnce({ data: null }); // subscriber check
    mockSingle.mockResolvedValueOnce({ data: null }); // referral validation (code not found)
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    await POST(makeRequest({ email: "new@test.com", referralCode: "FAKECODE" }));

    const upsertData = mockUpsert.mock.calls[0][0];
    expect(upsertData).not.toHaveProperty("referred_by");
  });

  it("returns 500 on Supabase upsert error", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: { message: "DB down" } });

    const res = await POST(makeRequest({ email: "new@test.com" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Database error.");
  });

  it("returns 500 on Resend send failure", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockRejectedValueOnce(new Error("Send failed"));

    const res = await POST(makeRequest({ email: "new@test.com" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Something went wrong.");
  });

  it("returns 500 when NEXT_PUBLIC_SITE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    mockSingle.mockResolvedValueOnce({ data: null });

    const res = await POST(makeRequest({ email: "new@test.com" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Server configuration error.");

    // Restore
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
  });

  it("returns 429 after exceeding rate limit from same IP", async () => {
    // Each call needs mocks for the full flow
    for (let i = 0; i < 5; i++) {
      mockSingle.mockResolvedValueOnce({ data: null });
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockSend.mockResolvedValueOnce({});
    }

    const testIp = "192.168.99.99";
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ email: `user${i}@test.com` }, testIp));
      expect(res.status).toBe(200);
    }

    // 6th request from same IP should be rate limited
    const res = await POST(makeRequest({ email: "extra@test.com" }, testIp));
    const data = await res.json();
    expect(res.status).toBe(429);
    expect(data.message).toContain("Too many requests");
  });

  it("allows requests from different IPs independently", async () => {
    // Fill up one IP's limit
    for (let i = 0; i < 5; i++) {
      mockSingle.mockResolvedValueOnce({ data: null });
      mockUpsert.mockResolvedValueOnce({ error: null });
      mockSend.mockResolvedValueOnce({});
    }
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `user${i}@test.com` }, "10.0.0.1"));
    }

    // Different IP should still work
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});
    const res = await POST(makeRequest({ email: "other@test.com" }, "10.0.0.2"));
    expect(res.status).toBe(200);
  });

  it("preserves existing referral_code for pending re-subscribe", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "pending", confirmed_at: null, referral_code: "OLDCODE" },
    });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ email: "pending@test.com" }));
    const data = await res.json();

    expect(data.referralUrl).toBe(`${SITE_URL}?ref=OLDCODE`);
  });
});
