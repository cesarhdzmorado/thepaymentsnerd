/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySvixSignature } from "@/lib/webhookSignature";

/**
 * Resend webhook handler for email analytics
 * Events: email.sent, email.delivered, email.bounced, email.opened, email.clicked, email.complained
 *
 * Setup in Resend:
 * 1. Go to https://resend.com/webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/resend
 * 3. Subscribe to: delivered, opened, clicked, bounced, complained
 * 4. Copy the webhook's signing secret into RESEND_WEBHOOK_SECRET
 *
 * Every request must carry a valid Svix signature; without the secret the
 * endpoint rejects everything.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!verifySvixSignature(rawBody, req.headers, process.env.RESEND_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Extract event data
    const eventType = payload.type; // e.g., "email.delivered", "email.opened"
    const data = payload.data;

    if (!eventType || !data) {
      console.error("Invalid webhook payload: missing type or data");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Extract relevant fields
    const email = data.to?.[0] || data.email || null;
    const newsletterDate = data.headers?.["x-entity-ref-id"] || null; // We set this in send-daily route

    // Map Resend event types to our simplified types
    const eventTypeMap: Record<string, string> = {
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };

    const simplifiedEventType = eventTypeMap[eventType] || eventType;

    // Store in email_analytics table
    const { error } = await supabaseAdmin
      .from("email_analytics")
      .insert({
        email,
        event_type: simplifiedEventType,
        newsletter_date: newsletterDate,
        metadata: data,
      });

    if (error) {
      console.error("Error storing email analytics:", error.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(`Email analytics recorded: ${simplifiedEventType} for ${email}`);
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("Resend webhook error:", e?.message || e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
