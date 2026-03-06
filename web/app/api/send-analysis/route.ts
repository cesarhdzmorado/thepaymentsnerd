/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { readFileSync } from "fs";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { makeToken } from "@/lib/emailTokens";
import { parseAnalysisMarkdown, generateAnalysisEmail } from "@/lib/analysisTemplate";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await req.json();
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { ok: false, message: "Missing 'filename' in request body" },
        { status: 400 }
      );
    }

    // Prevent path traversal
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitized !== filename) {
      return NextResponse.json(
        { ok: false, message: "Invalid filename" },
        { status: 400 }
      );
    }

    // Read the analysis markdown file
    const filePath = join(process.cwd(), "public", "analyses", sanitized);
    let raw: string;
    try {
      raw = readFileSync(filePath, "utf-8");
    } catch {
      return NextResponse.json(
        { ok: false, message: `File not found: analyses/${sanitized}` },
        { status: 404 }
      );
    }

    // Parse markdown frontmatter + body
    const { frontmatter, bodyHtml } = parseAnalysisMarkdown(raw);

    // Get active subscribers
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

    console.log(
      `Starting analysis send "${frontmatter.title}" to ${subscribers?.length || 0} subscribers`
    );

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (const sub of subscribers ?? []) {
      try {
        const unsubToken = makeToken(sub.email, "unsubscribe", secret, 365 * 24);
        const unsubUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

        const emailHtml = await generateAnalysisEmail({
          frontmatter,
          bodyHtml,
          unsubscribeUrl: unsubUrl,
          referralCode: sub.referral_code,
        });

        const result = await resend.emails.send({
          from: `The Payments Nerd <${from}>`,
          to: sub.email,
          subject: frontmatter.subject,
          html: emailHtml,
          headers: {
            "X-Entity-Ref-ID": `analysis-${frontmatter.date}`,
            "List-Unsubscribe": `<${unsubUrl}>`,
          },
        });

        if (result.data?.id) {
          sent++;
          console.log(`Sent to ${sub.email} (ID: ${result.data.id})`);
        } else if (result.error) {
          failed++;
          const errorMsg = result.error.message || "Unknown Resend error";
          errors.push({ email: sub.email, error: errorMsg });
          console.error(`Resend error for ${sub.email}:`, errorMsg);
        }
      } catch (error: any) {
        failed++;
        const errorMsg = error.message || "Unknown error";
        errors.push({ email: sub.email, error: errorMsg });
        console.error(`Exception for ${sub.email}:`, errorMsg);
      }

      await delay(600);
    }

    console.log(`Analysis send complete: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      ok: true,
      analysis: frontmatter.title,
      sent,
      failed,
      total: subscribers?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error("Analysis send error:", e.message);
    return NextResponse.json(
      { ok: false, message: e.message || "Failed" },
      { status: 500 }
    );
  }
}
