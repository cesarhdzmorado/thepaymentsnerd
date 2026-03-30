/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { makeToken } from "@/lib/emailTokens";
import { generateReferralCode } from "@/lib/referrals";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const { email, source, referralCode } = await req.json();
    const cleanEmail = String(email || "").toLowerCase().trim();

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ ok: false, message: "Enter a valid email." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    // Check if subscriber already exists and is active
    const { data: existingSubscriber } = await supabaseAdmin
      .from("subscribers")
      .select("status, confirmed_at, referral_code")
      .eq("email", cleanEmail)
      .single();

    // If already active and confirmed, don't reset their status
    const isAlreadyActive = existingSubscriber?.status === "active" && existingSubscriber?.confirmed_at;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      console.error("NEXT_PUBLIC_SITE_URL is not configured");
      return NextResponse.json({ ok: false, message: "Server configuration error." }, { status: 500 });
    }

    if (isAlreadyActive) {
      // User is already subscribed - just return success without sending another confirmation email
      const existingReferralUrl = existingSubscriber?.referral_code
        ? `${siteUrl}?ref=${existingSubscriber.referral_code}`
        : siteUrl;

      return NextResponse.json({ ok: true, state: "already_active", referralUrl: existingReferralUrl });
    }

    // Generate unique referral code for new subscribers
    const newReferralCode = existingSubscriber?.referral_code || generateReferralCode();

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
          ...(referralCode ? { referred_by: referralCode } : {}),
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Supabase upsert error:", error.message);
      return NextResponse.json({ ok: false, message: "Database error." }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const secret = process.env.SUBSCRIBE_TOKEN_SECRET!;
    const from = process.env.EMAIL_FROM!;

    const confirmToken = makeToken(cleanEmail, "confirm", secret, 48);
    const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(confirmToken)}`;

    const unsubToken = makeToken(cleanEmail, "unsubscribe", secret, 365 * 24);
    const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    await resend.emails.send({
      from,
      to: cleanEmail,
      subject: "Confirm your subscription",
      html: `
        <div style="font-family:system-ui;line-height:1.4">
          <p>Quick confirm — this makes sure nobody subscribed you by mistake.</p>
          <p><a href="${confirmUrl}">Confirm subscription</a></p>
          <p style="color:#666;font-size:12px">If you didn't request this, ignore this email.</p>
          <p style="color:#666;font-size:12px"><a href="${unsubUrl}">Unsubscribe</a></p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, state: "new", referralUrl: `${siteUrl}?ref=${newReferralCode}` });
  } catch (e: any) {
    console.error("Subscribe route error:", e?.message || e);
    return NextResponse.json({ ok: false, message: "Something went wrong." }, { status: 500 });
  }
}
