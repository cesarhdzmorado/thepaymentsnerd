/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { makeToken } from "@/lib/emailTokens";
import { generateDailyNewsletterEmail, generateEmailSubject } from "@/lib/emailTemplate";

export async function GET(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Get latest newsletter
    const { data: newsletter, error: nErr } = await supabaseAdmin
      .from("newsletters")
      .select("publication_date, content")
      .order("publication_date", { ascending: false })
      .limit(1)
      .single();

    if (nErr || !newsletter) {
      throw new Error("No newsletter found");
    }

    // 2) Get active subscribers (ordered by creation date for deterministic processing)
    const { data: subscribers, error: sErr } = await supabaseAdmin
      .from("subscribers")
      .select("email, referral_code")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (sErr) {
      throw new Error("Failed to load subscribers");
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const from = process.env.EMAIL_FROM!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const secret = process.env.SUBSCRIBE_TOKEN_SECRET!;

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Generate dynamic subject line from newsletter content using AI
    const emailSubject = await generateEmailSubject(newsletter.content.news);

    console.log(`Starting daily send for ${subscribers?.length || 0} subscribers with subject: ${emailSubject}`);

    // Helper function to add delay between sends (respects Resend rate limit: 2 req/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const sub of subscribers ?? []) {
      try {
        console.log(`Processing subscriber: ${sub.email}`);

        const unsubToken = makeToken(sub.email, "unsubscribe", secret, 365 * 24);
        const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

        const emailHtml = await generateDailyNewsletterEmail({
          publicationDate: newsletter.publication_date,
          news: newsletter.content.news,
          perspective: newsletter.content.perspective,
          curiosity: newsletter.content.curiosity,
          whatsHot: newsletter.content.whats_hot,
          unsubscribeUrl: unsubUrl,
          referralCode: sub.referral_code,
        });

        const result = await resend.emails.send({
          from: `The Payments Nerd <${from}>`,
          to: sub.email,
          subject: emailSubject,
          html: emailHtml,
          headers: {
            'X-Entity-Ref-ID': newsletter.publication_date,
            // List-Unsubscribe header for email clients
            // Using GET-only (no List-Unsubscribe-Post) to prevent corporate email
            // scanners from auto-unsubscribing users. Users must confirm via web page.
            'List-Unsubscribe': `<${unsubUrl}>`,
          },
        });

        if (result.data?.id) {
          sent++;
          console.log(`✅ Sent to ${sub.email} (ID: ${result.data.id})`);
        } else if (result.error) {
          failed++;
          const errorMsg = result.error.message || 'Unknown Resend error';
          errors.push({ email: sub.email, error: errorMsg });
          console.error(`❌ Resend error for ${sub.email}:`, errorMsg);
        }
      } catch (error: any) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({ email: sub.email, error: errorMsg });
        console.error(`❌ Exception for ${sub.email}:`, errorMsg, error.stack);
      }

      // Add delay between sends to respect Resend rate limit (2 requests/sec)
      // Using 600ms delay = ~1.6 req/sec (safely under limit)
      await delay(600);
    }

    console.log(`Daily send complete: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: subscribers?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error("Daily send error:", e.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
