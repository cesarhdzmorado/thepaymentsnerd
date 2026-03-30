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

// Set env vars
const SITE_URL = "https://thepaymentsnerd.co";
vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
vi.stubEnv("RESEND_API_KEY", "re_test");
vi.stubEnv("SUBSCRIBE_TOKEN_SECRET", "secret");
vi.stubEnv("EMAIL_FROM", "test@thepaymentsnerd.co");

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("https://localhost/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email with 400", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.message).toBe("Enter a valid email.");
  });

  it("returns already_active state for active subscribers", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: "EXISTING" },
    });

    const res = await POST(makeRequest({ email: "active@test.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.state).toBe("already_active");
    expect(data.referralUrl).toBe(`${SITE_URL}?ref=EXISTING`);
    // Should NOT call upsert or send email
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns site URL for active subscriber without referral_code", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { status: "active", confirmed_at: "2026-01-01", referral_code: null },
    });

    const res = await POST(makeRequest({ email: "active@test.com" }));
    const data = await res.json();

    expect(data.referralUrl).toBe(SITE_URL);
  });

  it("creates new subscriber with state 'new' and sends confirmation", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    const res = await POST(makeRequest({ email: "new@test.com", source: "homepage" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.state).toBe("new");
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

  it("sets referred_by when referralCode is provided", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    mockUpsert.mockResolvedValueOnce({ error: null });
    mockSend.mockResolvedValueOnce({});

    await POST(makeRequest({ email: "new@test.com", referralCode: "FRIEND123" }));

    const upsertData = mockUpsert.mock.calls[0][0];
    expect(upsertData.referred_by).toBe("FRIEND123");
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
