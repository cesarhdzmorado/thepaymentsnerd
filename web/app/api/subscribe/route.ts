import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { makeToken } from "@/lib/emailTokens";
import { generateReferralCode } from "@/lib/referrals";
import {
  renderAlreadySubscribedEmail,
  renderConfirmSubscriptionEmail,
} from "@/lib/transactionalEmails";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// In-memory rate limiter: max 5 requests per IP per 15-minute window.
// Resets on cold start (acceptable for serverless — catches burst abuse within warm instances).
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    if (ip && isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email, source, referralCode } = await req.json();
    const cleanEmail = String(email || "").toLowerCase().trim();

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ ok: false, message: "Enter a valid email." }, { status: 400 });
    }

    // Check if subscriber already exists and is active
    const { data: existingSubscriber } = await supabaseAdmin
      .from("subscribers")
      .select("status, confirmed_at, referral_code")
      .eq("email", cleanEmail)
      .single();

    // If already active and confirmed, don't reset their status
    const isAlreadyActive = existingSubscriber?.status === "active" && existingSubscriber?.confirmed_at;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const resendApiKey = process.env.RESEND_API_KEY;
    const secret = process.env.SUBSCRIBE_TOKEN_SECRET;
    const from = process.env.EMAIL_FROM;

    if (!siteUrl || !resendApiKey || !secret || !from) {
      console.error("Missing required env vars:", {
        NEXT_PUBLIC_SITE_URL: !!siteUrl,
        RESEND_API_KEY: !!resendApiKey,
        SUBSCRIBE_TOKEN_SECRET: !!secret,
        EMAIL_FROM: !!from,
      });
      return NextResponse.json({ ok: false, message: "Server configuration error." }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    // Uniform response for both active and new subscribers (prevents email enumeration)
    const existingRefCode = existingSubscriber?.referral_code;

    if (isAlreadyActive) {
      // Send "already subscribed" email so the user knows, without leaking state in the API response
      console.log("Re-subscribe attempt for active subscriber:", cleanEmail);

      const unsubToken = makeToken(cleanEmail, "unsubscribe", secret, 365 * 24);
      const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
      const referralLink = existingRefCode ? `${siteUrl}?ref=${existingRefCode}` : siteUrl;

      const alreadySubHtml = await renderAlreadySubscribedEmail({
        referralUrl: referralLink,
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from,
        to: cleanEmail,
        subject: "You're already subscribed",
        html: alreadySubHtml,
      });

      const referralUrl = existingRefCode ? `${siteUrl}?ref=${existingRefCode}` : siteUrl;
      return NextResponse.json({ ok: true, referralUrl });
    }

    // New or pending subscriber: upsert and send confirmation email
    const newReferralCode = existingRefCode || generateReferralCode();

    // Validate referralCode if provided: must exist and not be self-referral
    let validatedReferralCode: string | undefined;
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from("subscribers")
        .select("email")
        .eq("referral_code", referralCode)
        .single();

      if (referrer && referrer.email !== cleanEmail) {
        validatedReferralCode = referralCode;
      }
    }

    const { error } = await supabaseAdmin
      .from("subscribers")
      .upsert(
        {
          email: cleanEmail,
          status: "pending",
          source: source || "unknown",
          consent_ip: ip,
          consent_user_agent: ua,
          unsubscribed_at: null,
          confirmed_at: null,
          referral_code: newReferralCode,
          ...(validatedReferralCode ? { referred_by: validatedReferralCode } : {}),
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Supabase upsert error:", error.message);
      return NextResponse.json({ ok: false, message: "Database error." }, { status: 500 });
    }

    const confirmToken = makeToken(cleanEmail, "confirm", secret, 48);
    const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(confirmToken)}`;

    const unsubToken = makeToken(cleanEmail, "unsubscribe", secret, 365 * 24);
    const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    const confirmHtml = await renderConfirmSubscriptionEmail({
      confirmUrl,
      unsubscribeUrl: unsubUrl,
    });

    await resend.emails.send({
      from,
      to: cleanEmail,
      subject: "Confirm your subscription",
      html: confirmHtml,
    });

    return NextResponse.json({ ok: true, referralUrl: `${siteUrl}?ref=${newReferralCode}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Subscribe route error:", message);
    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}
