/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyToken, makeToken } from "@/lib/emailTokens";
import { Resend } from "resend";
import { renderWelcomeEmail } from "@/lib/transactionalEmails";

/**
 * GET handler - validates the emailed link and redirects to a confirmation page.
 * It never activates the subscription: corporate email scanners pre-fetch links,
 * which would otherwise confirm subscriptions nobody asked for.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  try {
    if (!token) throw new Error("Missing token");

    const payload = verifyToken<{ email: string; purpose: string; exp: number }>(
      token,
      process.env.SUBSCRIBE_TOKEN_SECRET!
    );
    if (payload.purpose !== "confirm") throw new Error("Wrong token purpose");

    return NextResponse.redirect(`${siteUrl}/confirm?token=${encodeURIComponent(token)}`);
  } catch (e: any) {
    console.error("Confirm GET error:", e?.message || e);
    return NextResponse.redirect(`${siteUrl}/?subscribed=0`);
  }
}

/**
 * POST handler - activates the subscription and sends the welcome email.
 * Only triggered when the user clicks "Confirm" on the /confirm page.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  try {
    if (!token) throw new Error("Missing token");

    const secret = process.env.SUBSCRIBE_TOKEN_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!secret || !siteUrl || !resendApiKey || !from) {
      console.error("Missing required env vars:", {
        SUBSCRIBE_TOKEN_SECRET: !!secret,
        NEXT_PUBLIC_SITE_URL: !!siteUrl,
        RESEND_API_KEY: !!resendApiKey,
        EMAIL_FROM: !!from,
      });
      return NextResponse.json({ ok: false, message: "Server configuration error." }, { status: 500 });
    }

    const payload = verifyToken<{ email: string; purpose: string; exp: number }>(token, secret);
    if (payload.purpose !== "confirm") throw new Error("Wrong token purpose");

    const email = payload.email.toLowerCase().trim();

    // First, check if already confirmed to prevent duplicate welcome emails
    const { data: existingSubscriber } = await supabaseAdmin
      .from("subscribers")
      .select("status, confirmed_at, referral_code")
      .eq("email", email)
      .single();

    // If already active/confirmed, succeed without sending another email
    const alreadyConfirmed = existingSubscriber?.status === "active" && existingSubscriber?.confirmed_at;

    if (!alreadyConfirmed) {
      // Update to active status
      const { error } = await supabaseAdmin
        .from("subscribers")
        .update({ status: "active", confirmed_at: new Date().toISOString() })
        .eq("email", email);

      if (error) console.error("Confirm update error:", error.message);
    }

    // Only send welcome email if this is the first confirmation
    if (!alreadyConfirmed) {
      const resend = new Resend(resendApiKey);
      const unsubToken = makeToken(email, "unsubscribe", secret, 365 * 24);
      const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

      // Generate referral URL for this subscriber
      const referralCode = existingSubscriber?.referral_code;
      const referralUrl = referralCode ? `${siteUrl}?ref=${referralCode}` : siteUrl;

      const welcomeHtml = await renderWelcomeEmail({
        referralUrl: referralCode ? referralUrl : undefined,
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from,
        to: email,
        subject: "Welcome to /thepaymentsnerd",
        html: welcomeHtml,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Confirm POST error:", e?.message || e);
    return NextResponse.json(
      { ok: false, message: "This confirmation link is invalid or has expired." },
      { status: 400 }
    );
  }
}
