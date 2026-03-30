# LinkedIn Automation System

**Status:** Phase 3 Complete ✅
**Last Updated:** 2026-03-07

This document describes the automated LinkedIn posting system that transforms daily newsletter content into LinkedIn posts via the OpenClaw agent running on your Mac mini.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Webhook Notification & Content API](#phase-1-webhook-notification--content-api)
4. [Setup Instructions](#setup-instructions)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Testing](#testing)
8. [Phase 2: Enhanced Templates & Strategy Engine](#phase-2-enhanced-templates--strategy-engine-)
9. [Next Steps (Phase 3-4)](#next-steps-phase-3-4)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The LinkedIn automation system enables automatic posting of newsletter content to LinkedIn. It consists of:

1. **Content API** (`/api/linkedin-content`) - Transforms newsletter data into LinkedIn-ready formats
2. **GitHub Webhook** - Notifies OpenClaw when a new newsletter is published
3. **OpenClaw Agent** - Receives notifications, fetches content, and posts to LinkedIn
4. **Database Tracking** - Logs posting status and events for monitoring

### Current Status

✅ **Phase 1:** Content extraction, API endpoint, webhook, DB schema
✅ **Phase 2:** Post templates, strategy engine, trailer format, vibe detection
✅ **Phase 3:** LinkedIn API client, OAuth auth flow, posting script, DB updates
🚧 **Phase 4:** Monitoring dashboard, error notifications

---

## Architecture

```
GitHub Actions (Daily 08:30 UTC)
  ├─ 1. Generate newsletter (Python AI)
  ├─ 2. Commit to repo
  ├─ 3. Sync to Supabase
  ├─ 4. 🆕 POST webhook to OpenClaw ← NEW
  ├─ 5. Deploy to Vercel
  └─ 6. Send emails (weekdays only)

OpenClaw (Mac mini)
  ├─ Receives webhook notification
  ├─ Fetches LinkedIn-ready content from API
  ├─ Decides posting strategy
  ├─ Formats LinkedIn post(s)
  ├─ Posts to LinkedIn (API or browser)
  └─ Reports status back to API
```

---

## Phase 1: Webhook Notification & Content API

### What Was Built

#### 1. LinkedIn Content Extractor (`web/lib/linkedinContentExtractor.ts`)

Transforms newsletter.json into multiple LinkedIn post formats:

- **Daily Digest** - Single post with all 5 stories
- **Top Story** - Lead story only with CTA
- **Multi-Post** - Array of 5 individual posts
- **Deals Roundup** - What's Hot focused post

Features:
- Automatic hashtag generation from story topics
- Character limit enforcement (3000 max)
- Emoji and link formatting
- Read time estimation
- Strategy recommendation based on content analysis

#### 2. Content API Endpoint (`web/app/api/linkedin-content/route.ts`)

**Endpoint:** `GET /api/linkedin-content?date=YYYY-MM-DD&secret=SECRET`

Returns LinkedIn-optimized content with:
- Raw newsletter content
- Multiple format options (daily digest, top story, etc.)
- Recommended posting strategy
- Metadata (story count, topics, breaking news flags)
- Character counts and hashtags

**Caching:** 15-minute ISR for performance

#### 3. GitHub Actions Webhook (`/.github/workflows/generate_news.yml`)

New step added after Supabase sync (line 147):
- POSTs to OpenClaw endpoint with newsletter metadata
- Includes retry logic (3 attempts with exponential backoff)
- Uses `continue-on-error: true` to prevent workflow failure
- Falls back to polling mechanism if webhook delivery fails

#### 4. Database Schema (`db/migrations/add_linkedin_tracking.sql`)

Two new tables:

**`linkedin_posts`** - Tracks posting status:
- `newsletter_date` - Date of newsletter (unique)
- `status` - pending, posted, failed, skipped
- `strategy` - Posting strategy used
- `linkedin_post_id` - LinkedIn's post URN
- `linkedin_url` - Direct link to post
- `post_text` - Final formatted text
- `error_message` - Error details if failed
- `retry_count` - Number of attempts

**`linkedin_logs`** - Event logs for debugging:
- `newsletter_date` - Date of newsletter
- `event_type` - Event category (webhook_received, post_success, etc.)
- `message` - Human-readable description
- `metadata` - JSON context (errors, timing, etc.)

---

## Setup Instructions

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```bash
# Option A: Copy/paste SQL file contents
cat db/migrations/add_linkedin_tracking.sql
# Then paste into Supabase SQL Editor

# Option B: Use Supabase CLI (if installed)
supabase db push
```

Verify tables were created:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('linkedin_posts', 'linkedin_logs');
```

### Step 2: Add GitHub Secrets

Go to **GitHub repo → Settings → Secrets → Actions** and add:

1. **`LINKEDIN_WEBHOOK_SECRET`**
   - Generate a random 32-character string
   - Command: `openssl rand -hex 16`
   - Used to authenticate webhook requests

2. **`OPENCLAW_WEBHOOK_URL`**
   - Your ngrok or Cloudflare Tunnel URL
   - Format: `https://abc123.ngrok.io/newsletter-webhook`
   - Will be set up in Phase 2

3. **`LINKEDIN_CONTENT_SECRET`** (optional)
   - Separate secret for API endpoint
   - If not set, uses `CRON_SECRET` as fallback
   - Generate with: `openssl rand -hex 16`

### Step 3: Set Up ngrok on Mac mini

```bash
# Install ngrok
brew install ngrok

# Authenticate (get token from https://dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN

# Start tunnel (choose a port, e.g., 3000)
ngrok http 3000

# Copy the public URL (e.g., https://abc123.ngrok.io)
# Add this to GitHub secrets as OPENCLAW_WEBHOOK_URL
```

**For production:** Consider upgrading to ngrok's static domain or using Cloudflare Tunnel.

### Step 4: Test the API Endpoint

```bash
# Generate a test secret
SECRET="test-secret-123"

# Test with today's newsletter
curl "https://thepaymentsnerd.co/api/linkedin-content?date=2026-02-28&secret=$SECRET"

# Expected response:
# {
#   "ok": true,
#   "date": "2026-02-28",
#   "newsletter_url": "https://thepaymentsnerd.co",
#   "raw_content": {...},
#   "linkedin_ready": {
#     "recommended_strategy": "daily_digest",
#     "formats": {...}
#   },
#   "metadata": {...}
# }
```

### Step 5: Verify Webhook in GitHub Actions

Trigger a manual workflow run:

1. Go to **GitHub Actions → Daily Newsletter Pipeline**
2. Click **Run workflow → Run workflow**
3. Wait for completion (~5 minutes)
4. Check logs for webhook step:
   ```
   🔔 WEBHOOK NOTIFICATION STEP
   Target URL: https://abc123.ngrok.io/newsletter-webhook
   Newsletter date: 2026-02-28
   Attempt 1 of 3...
   ✅ Webhook delivered successfully!
   ```

If webhook fails (OpenClaw not running), it will retry 3 times then continue workflow.

---

## API Reference

### GET `/api/linkedin-content`

Fetch LinkedIn-optimized newsletter content.

**Query Parameters:**
- `date` (optional) - Newsletter date in YYYY-MM-DD format. Defaults to latest.
- `secret` (required) - Authentication secret (matches `LINKEDIN_CONTENT_SECRET` or `CRON_SECRET`)

**Response:**

```json
{
  "ok": true,
  "date": "2026-02-28",
  "newsletter_url": "https://thepaymentsnerd.co",
  "raw_content": {
    "news": [...],
    "perspective": "...",
    "curiosity": {...},
    "whats_hot": [...]
  },
  "linkedin_ready": {
    "recommended_strategy": "daily_digest",
    "formats": {
      "daily_digest": {
        "post_text": "🚀 Today in Payments...",
        "character_count": 2847,
        "hashtags": ["#Fintech", "#Payments", "#AI"],
        "estimated_read_time": "2 min"
      },
      "top_story": {...},
      "multi_post": [...],
      "deals_roundup": {...}
    }
  },
  "metadata": {
    "story_count": 5,
    "whats_hot_count": 6,
    "has_breaking_news": false,
    "primary_topics": ["M&A", "AI", "Stablecoins"]
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing secret
- `404 Not Found` - Newsletter not found for requested date
- `500 Internal Server Error` - Server error

**Rate Limiting:** None (but ISR caching is 15 minutes)

---

## Database Schema

### linkedin_posts

Tracks posting status for each newsletter.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| newsletter_date | DATE | Newsletter date (unique) |
| status | TEXT | `pending`, `posted`, `failed`, `skipped` |
| strategy | TEXT | `daily_digest`, `top_story`, `multi_post`, `deals_roundup` |
| linkedin_post_id | TEXT | LinkedIn URN (e.g., `urn:li:ugcPost:123456`) |
| linkedin_url | TEXT | Direct link to LinkedIn post |
| post_text | TEXT | Final formatted post text |
| character_count | INTEGER | Length of post_text |
| posted_at | TIMESTAMPTZ | When post was published |
| error_message | TEXT | Error details if failed |
| retry_count | INTEGER | Number of posting attempts |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time (auto-updated) |

**Sample Queries:**

```sql
-- Check recent posting status
SELECT newsletter_date, status, strategy, posted_at, error_message
FROM linkedin_posts
ORDER BY newsletter_date DESC
LIMIT 10;

-- View success rate over last 30 days
SELECT
  COUNT(*) AS total_attempts,
  SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) AS successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_pct
FROM linkedin_posts
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Find failed posts
SELECT newsletter_date, error_message, retry_count
FROM linkedin_posts
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### linkedin_logs

Event logs for debugging and monitoring.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| newsletter_date | DATE | Newsletter date |
| event_type | TEXT | Event category (see below) |
| message | TEXT | Human-readable description |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Event timestamp |

**Event Types:**
- `webhook_received` - OpenClaw received webhook
- `webhook_failed` - Webhook delivery failed
- `content_fetched` - Successfully fetched content from API
- `content_fetch_failed` - API request failed
- `strategy_decided` - Posting strategy chosen
- `post_attempted` - Attempted to post to LinkedIn
- `post_success` - Successfully posted to LinkedIn
- `post_failed` - LinkedIn posting failed
- `retry_scheduled` - Retry scheduled after failure
- `manual_skip` - User manually skipped posting

**Sample Queries:**

```sql
-- View events for specific date
SELECT created_at, event_type, message, metadata
FROM linkedin_logs
WHERE newsletter_date = '2026-02-28'
ORDER BY created_at;

-- Count events by type
SELECT event_type, COUNT(*) as count
FROM linkedin_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

---

## Testing

### Test Content Extractor

```typescript
// Create a test script: web/scripts/testLinkedInExtractor.ts
import { extractLinkedInContent, generateMetadata } from "@/lib/linkedinContentExtractor";
import newsletter from "@/public/newsletter.json";

const content = newsletter as any;
const linkedinContent = extractLinkedInContent(content);
const metadata = generateMetadata(content);

console.log("Recommended strategy:", linkedinContent.recommended_strategy);
console.log("\nDaily Digest Preview:");
console.log(linkedinContent.formats.daily_digest?.post_text.substring(0, 500));
console.log("\nMetadata:", metadata);
```

Run with:
```bash
cd web
npx tsx scripts/testLinkedInExtractor.ts
```

### Test API Endpoint Locally

```bash
# Start dev server
cd web
npm run dev

# In another terminal, test API
curl "http://localhost:3000/api/linkedin-content?date=2026-02-28&secret=test-secret"
```

### Test Webhook Delivery

```bash
# Start a local webhook receiver (simple HTTP server)
# This simulates OpenClaw receiving the webhook

# Python example:
python3 -c "
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        print('Received webhook:', body.decode())
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'ok': True}).encode())

HTTPServer(('', 8080), WebhookHandler).serve_forever()
"

# Then trigger GitHub Actions and check if webhook is received
```

---

## Phase 2: Enhanced Templates & Strategy Engine ✅

**Completed:** 2026-03-07

Phase 2 adds a template library, a scoring-based strategy engine, and the **trailer post** format — César's preferred LinkedIn strategy for driving newsletter traffic.

### New Files

#### 1. `web/lib/linkedinPostTemplates.ts` — Template Library

Provides varied, content-aware formatting:

- **Multiple opening hooks per format** — randomized daily (date-seeded so they're deterministic within a day but vary across days)
- **Content vibe detection** — classifies each newsletter as `breaking`, `deals_heavy`, `regulatory`, `normal`, or `light` based on keyword analysis
- **Vibe-aware hooks** — different hook pools for each vibe (e.g. "⚡ Big moves in payments today." for breaking news vs "☕ A quick payments check-in." for light days)
- **Varied CTAs** — 7 CTA variants for standard formats, 5 for trailer
- **Content-aware emoji selection** — topic-to-emoji mapping (AI → 🤖, M&A → 🤝, etc.)
- **Trailer post generator** — short, punchy teaser that creates curiosity

#### 2. `web/lib/linkedinStrategy.ts` — Strategy Engine

Scoring-based strategy selection that considers:

- **Day of week** — Monday boosts trailer (drives week-start traffic), Tuesday-Thursday boosts digest (work mode), Friday boosts trailer (short and punchy)
- **Content signals** — breaking news boosts top_story, heavy deals boost deals_roundup, rich content boosts trailer
- **Story count** — few stories penalizes digest/multi-post
- **What's Hot density** — 5+ items strongly boosts deals_roundup

Returns ranked recommendations with scores and reasons:

```typescript
import { selectStrategy } from "./linkedinStrategy";

const result = selectStrategy(content);
// result.recommended = "trailer"
// result.rankings = [
//   { strategy: "trailer", score: 75, reason: "Rich content day — great for teasing." },
//   { strategy: "deals_roundup", score: 70, reason: "Heavy deals day — this is the format." },
//   ...
// ]
// result.vibe = "deals_heavy"
```

Supports manual overrides:

```typescript
const result = selectStrategy(content, "daily_digest"); // Force daily_digest
```

#### 3. Trailer Post Format

The trailer is designed to be short (300-800 chars), create curiosity, and drive clicks:

```
The fintech world woke up different today.

In today's Payments Nerd:

→ Revolut Files for US Banking License
→ Mastercard Pilots Agentic Transactions in Malaysia
→ Florida Passes First State-Level Stablecoin Bill

+ 7 deals in the What's Hot section 🔥

Link in comments 👇

#AI #Fintech #Crypto #Stablecoin #Cross-Border
```

Anatomy: Hook (1 line) → Tease 2-3 story titles (no details) → Optional deals count → CTA

### Updated Files

- **`web/lib/linkedinContentExtractor.ts`** — Imports and uses the new template library and strategy engine. Adds `trailer` to the `formats` object. Backward compatible (same response shape + trailer).
- **`web/scripts/testLinkedInContent.ts`** — Tests all 5 formats, shows strategy rankings, validates character limits, checks backward compatibility.

### Character Counts (with sample newsletter)

| Format | Characters | % of Limit |
|--------|-----------|------------|
| daily_digest | ~2812 | 94% |
| top_story | ~1376 | 46% |
| multi_post (avg) | ~684 | 23% |
| deals_roundup | ~695 | 23% |
| **trailer** | **~322** | **11%** |

### Testing

```bash
cd web
npx tsx scripts/testLinkedInContent.ts
```

Shows: metadata, vibe detection, strategy rankings with day-of-week variation, all format previews, character limit validation, and backward compatibility check.

---

## Phase 3: LinkedIn Posting Automation ✅

**Completed:** 2026-03-07

Phase 3 adds actual LinkedIn posting via the LinkedIn Posts API, triggered by OpenClaw cron on the Mac mini.

### Architecture

```
GitHub Actions (08:30 UTC) → generates newsletter → syncs to Supabase
OpenClaw cron (~09:15 UTC) → runs linkedinPost.ts on Mac mini
  → fetches content from /api/linkedin-content
  → selects strategy (trailer by default)
  → posts to LinkedIn via API
  → tracks status in Supabase
  → reports result
```

No ngrok or webhooks needed. OpenClaw calls the script directly.

### New Files

#### 1. `web/lib/linkedinClient.ts` — LinkedIn API Client

Handles all LinkedIn API interactions:

- **Token management** — reads/writes `.linkedin-tokens.json` at repo root (gitignored)
- **Auto-refresh** — detects expired access tokens and refreshes using the refresh token
- **Post creation** — calls LinkedIn Posts API (`POST https://api.linkedin.com/rest/posts`)
- **401 retry** — on auth failure, attempts one token refresh and retries
- **Person ID lookup** — fetches authenticated user's LinkedIn person URN

#### 2. `web/scripts/linkedinAuth.ts` — One-Time OAuth Setup

Interactive script César runs once to authorize the LinkedIn app:

1. Starts a local HTTP server on port 9876
2. Opens LinkedIn OAuth URL in the browser
3. Handles the callback, exchanges code for tokens
4. Fetches person ID
5. Saves everything to `.linkedin-tokens.json`

```bash
cd web
LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx npx tsx scripts/linkedinAuth.ts
```

#### 3. `web/scripts/linkedinPost.ts` — Daily Posting Script

End-to-end script for daily posting:

```bash
# Preview what would be posted (no actual post)
cd web && npx tsx scripts/linkedinPost.ts --dry-run

# Post today's newsletter
cd web && npx tsx scripts/linkedinPost.ts

# Post specific date with specific strategy
cd web && npx tsx scripts/linkedinPost.ts --date 2026-03-07 --strategy trailer
```

**Arguments:**
- `--date YYYY-MM-DD` — target date (defaults to today)
- `--strategy trailer|daily_digest|top_story|multi_post|deals_roundup` — override strategy
- `--dry-run` — preview without posting

**Flow:**
1. Loads LinkedIn tokens
2. Fetches content from API (falls back to local `newsletter.json`)
3. Selects strategy (engine recommendation or override)
4. Posts to LinkedIn
5. Tracks result in Supabase (`linkedin_posts` + `linkedin_logs`)
6. Exits with code 0 (success) or 1 (error)

#### 4. `db/migrations/add_linkedin_phase3.sql` — DB Updates

- Adds `'trailer'` to the `linkedin_posts.strategy` check constraint
- Creates `linkedin_config` table for future persistent settings

### LinkedIn App Setup

1. Go to https://www.linkedin.com/developers/
2. Create a new app (or use existing)
3. Under **Auth** tab:
   - Add `http://localhost:9876/callback` as an authorized redirect URL
   - Note the Client ID and Client Secret
4. Under **Products** tab:
   - Request access to "Share on LinkedIn" (provides `w_member_social` scope)
   - Request access to "Sign In with LinkedIn using OpenID Connect" (provides `openid`, `profile`)

### Token Refresh Behavior

- **Access tokens** expire after ~60 days
- **Refresh tokens** expire after ~365 days
- The client auto-refreshes expired access tokens before posting
- If refresh fails (refresh token expired), re-run `linkedinAuth.ts`
- Token refresh requires `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` env vars

### Environment Variables

For the posting script (set in shell or `.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKEDIN_CONTENT_SECRET` or `CRON_SECRET` | Yes | API authentication |
| `SUPABASE_URL` | For tracking | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For tracking | Supabase service role key |
| `LINKEDIN_CLIENT_ID` | For refresh | LinkedIn app client ID |
| `LINKEDIN_CLIENT_SECRET` | For refresh | LinkedIn app client secret |

### Troubleshooting

**401 Unauthorized from LinkedIn:**
- Access token expired — the script auto-refreshes, but if the refresh token is also expired:
  ```bash
  cd web
  LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx npx tsx scripts/linkedinAuth.ts
  ```

**"LinkedIn tokens not found":**
- Run the auth script first (one-time setup)

**API returns 404 for today's date:**
- Newsletter may not have been generated yet (GitHub Actions runs at 08:30 UTC)
- Script falls back to local `newsletter.json` automatically

**Supabase tracking fails:**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure the Phase 3 migration has been run (`db/migrations/add_linkedin_phase3.sql`)

**LinkedIn rate limits:**
- LinkedIn allows ~100 posts/day — we post once, so this shouldn't be an issue
- If rate limited, wait and retry later

### Next Steps (Phase 4)

**Goals:**
- Build monitoring dashboard
- Add error notifications
- Implement retry mechanisms

**Tasks:**
1. Create `web/app/admin/linkedin/page.tsx` - Monitoring dashboard
2. Add Slack/email notifications for failures
3. OpenClaw cron scheduling (daily at ~09:15 UTC)
4. Test recovery scenarios

---

## Troubleshooting

### Issue: API returns 401 Unauthorized

**Cause:** Invalid or missing secret parameter

**Solution:**
```bash
# Check if secret matches
echo $LINKEDIN_CONTENT_SECRET  # Or CRON_SECRET

# Test with correct secret
curl "https://thepaymentsnerd.co/api/linkedin-content?date=2026-02-28&secret=YOUR_ACTUAL_SECRET"
```

### Issue: API returns 404 Not Found

**Cause:** Newsletter not found for requested date

**Solution:**
```sql
-- Check available newsletters
SELECT publication_date FROM newsletters ORDER BY publication_date DESC LIMIT 10;

-- Use a valid date
curl "https://thepaymentsnerd.co/api/linkedin-content?date=2026-02-27&secret=SECRET"
```

### Issue: Webhook not being delivered

**Cause:** OpenClaw endpoint is down or URL is incorrect

**Solution:**
1. Check ngrok is running: `ngrok http 3000`
2. Verify URL in GitHub secrets matches ngrok URL
3. Check OpenClaw server logs for incoming requests
4. Test webhook manually:
   ```bash
   curl -X POST https://YOUR_NGROK_URL/newsletter-webhook \
     -H "Content-Type: application/json" \
     -d '{"date":"2026-02-28","secret":"test"}'
   ```

### Issue: Webhook retries failing

**Cause:** OpenClaw server timeout or error response

**Check GitHub Actions logs:**
```
Attempt 1 of 3...
❌ curl failed with exit code: 28
Response: Timeout was reached
```

**Solution:**
1. Increase timeout in OpenClaw server (default is 10s in webhook step)
2. Ensure OpenClaw responds within 10 seconds
3. Return `200 OK` even if processing is async

### Issue: Content extraction fails

**Cause:** Invalid newsletter format or missing data

**Debug:**
```typescript
// Add logging to linkedinContentExtractor.ts
console.log("Newsletter content:", JSON.stringify(content, null, 2));

// Check for required fields
if (!content.news || content.news.length === 0) {
  throw new Error("No news stories found");
}
```

### Issue: Character limit exceeded

**Cause:** Post text is over 3000 characters

**Check:**
```typescript
const digest = linkedinContent.formats.daily_digest;
console.log("Character count:", digest?.character_count);

if (digest && digest.character_count > 3000) {
  console.warn("Post exceeds LinkedIn limit!");
}
```

The truncation logic should handle this automatically, but if it's not working, check the `truncateText()` function.

---

## Support & Feedback

For issues or questions:
1. Check this documentation first
2. Review GitHub Actions logs
3. Check Supabase `linkedin_logs` table for events
4. Open an issue on GitHub

**Useful Resources:**
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Supabase SQL Reference](https://supabase.com/docs/guides/database)

---

**Last Updated:** 2026-02-28
**Version:** Phase 1 Complete
**Next Review:** After Phase 3 implementation
