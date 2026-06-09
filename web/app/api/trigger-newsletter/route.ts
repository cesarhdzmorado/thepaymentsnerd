import { NextResponse } from "next/server";

// Triggered by Vercel Cron (see web/vercel.json). Vercel's scheduled runs are
// minute-accurate, unlike GitHub Actions' `schedule:` trigger, which is
// best-effort and was drifting the daily send into the afternoon. This route
// fires a `workflow_dispatch` for the newsletter pipeline at exactly 08:00
// Europe/London time so subscribers reliably get the email in the morning.

export const dynamic = "force-dynamic";

const OWNER = "cesarhdzmorado";
const REPO = "thepaymentsnerd";
const WORKFLOW_FILE = "generate_news.yml";
const REF = "main";

export async function GET(req: Request) {
  // Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
  // when the CRON_SECRET env var is set on the project.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The cron fires at both 07:00 and 08:00 UTC so that exactly one invocation
  // lands at 08:00 in London regardless of GMT/BST:
  //   - BST (summer, UTC+1): 07:00 UTC == 08:00 London  -> trigger
  //   - GMT (winter, UTC+0): 08:00 UTC == 08:00 London  -> trigger
  // The off-target invocation is a cheap no-op, so this is DST-proof forever.
  const londonHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  if (londonHour !== 8) {
    return NextResponse.json({
      ok: true,
      triggered: false,
      reason: `Not 08:00 in London (currently ${londonHour}:00) — skipping.`,
    });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.error("GITHUB_DISPATCH_TOKEN is not set");
    return NextResponse.json(
      { ok: false, error: "GITHUB_DISPATCH_TOKEN is not set" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: REF }),
    }
  );

  // GitHub returns 204 No Content on a successful dispatch.
  if (res.status !== 204) {
    const body = await res.text();
    console.error(`Workflow dispatch failed (${res.status}): ${body}`);
    return NextResponse.json(
      { ok: false, status: res.status, error: body },
      { status: 502 }
    );
  }

  console.log(`Dispatched ${WORKFLOW_FILE} on ${REF} at 08:00 London time.`);
  return NextResponse.json({ ok: true, triggered: true });
}
