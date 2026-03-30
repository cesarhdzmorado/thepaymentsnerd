# LinkedIn Automation - Setup Checklist

## ✅ Completed (By Claude)

- [x] Created LinkedIn content extractor utility (`web/lib/linkedinContentExtractor.ts`)
- [x] Created `/api/linkedin-content` API endpoint
- [x] Modified GitHub Actions workflow to add webhook notification
- [x] Created database migration for LinkedIn tracking tables
- [x] Created documentation (`docs/LINKEDIN_AUTOMATION.md`)

## 📋 Next Steps (For You)

### 1. Database Setup (5 minutes)

- [ ] Open Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
- [ ] Copy contents of `db/migrations/add_linkedin_tracking.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('linkedin_posts', 'linkedin_logs');
  ```

### 2. GitHub Secrets Setup (5 minutes)

Go to: https://github.com/cesarhdzmorado/thepaymentsnerd/settings/secrets/actions

Add these secrets:

- [ ] **`LINKEDIN_WEBHOOK_SECRET`**
  - Generate: `openssl rand -hex 16`
  - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

- [ ] **`LINKEDIN_CONTENT_SECRET`** (optional, can use CRON_SECRET)
  - Generate: `openssl rand -hex 16`
  - Or skip and it will use existing `CRON_SECRET`

- [ ] **`OPENCLAW_WEBHOOK_URL`** (will set up in step 3)
  - Leave blank for now, will add after ngrok setup

### 3. ngrok Setup on Mac mini (10 minutes)

- [ ] Install ngrok: `brew install ngrok`
- [ ] Get auth token from https://dashboard.ngrok.com/get-started/setup
- [ ] Authenticate: `ngrok config add-authtoken YOUR_TOKEN`
- [ ] Start tunnel: `ngrok http 3000`
- [ ] Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
- [ ] Add to GitHub secrets as `OPENCLAW_WEBHOOK_URL`
  - Format: `https://abc123.ngrok.io/newsletter-webhook`

**Note:** Keep ngrok running in a terminal window or use a process manager like `screen` or `tmux`.

### 4. Test API Endpoint (5 minutes)

Use the secret you created (or your existing CRON_SECRET):

```bash
# Set your secret
SECRET="your-secret-here"

# Test the API
curl "https://thepaymentsnerd.co/api/linkedin-content?date=2026-02-28&secret=$SECRET"
```

Expected response should include:
- `"ok": true`
- `"linkedin_ready"` object with formats
- `"metadata"` object

If you get `401 Unauthorized`, check your secret matches.

### 5. Test GitHub Actions Workflow (10 minutes)

- [ ] Go to: https://github.com/cesarhdzmorado/thepaymentsnerd/actions
- [ ] Click "Daily Newsletter Pipeline"
- [ ] Click "Run workflow" → "Run workflow"
- [ ] Wait for completion (~5 minutes)
- [ ] Check logs for webhook step:
  - Should show: `🔔 WEBHOOK NOTIFICATION STEP`
  - If OpenClaw not running yet: `⚠️ All webhook attempts failed - continuing workflow`
  - This is expected - workflow will continue normally

### 6. Verify Database Tables (2 minutes)

Run in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT * FROM linkedin_posts LIMIT 1;
SELECT * FROM linkedin_logs LIMIT 1;

-- Should return empty result (no data yet) or error if tables don't exist
```

## 🎯 Phase 1 Complete!

Once all checkboxes above are complete, Phase 1 is done.

---

## Phase 3: LinkedIn Posting Setup

### 1. LinkedIn App Setup (15 minutes)

- [ ] Go to https://www.linkedin.com/developers/
- [ ] Create a new app (or use existing)
- [ ] Under **Auth** tab, add redirect URL: `http://localhost:9876/callback`
- [ ] Note the **Client ID** and **Client Secret**
- [ ] Under **Products** tab, request:
  - [ ] "Share on LinkedIn" (for `w_member_social` scope)
  - [ ] "Sign In with LinkedIn using OpenID Connect" (for `openid`, `profile` scopes)

### 2. Run Database Migration (2 minutes)

- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `db/migrations/add_linkedin_phase3.sql`
- [ ] Paste and run
- [ ] Verify: the `linkedin_config` table exists and `linkedin_posts.strategy` now allows `'trailer'`

### 3. One-Time OAuth Authorization (5 minutes)

- [ ] Run the auth script:
  ```bash
  cd web
  LINKEDIN_CLIENT_ID=your-client-id LINKEDIN_CLIENT_SECRET=your-secret npx tsx scripts/linkedinAuth.ts
  ```
- [ ] Browser will open — log in and authorize the app
- [ ] Verify `.linkedin-tokens.json` was created at repo root
- [ ] Verify it contains `access_token`, `refresh_token`, `expires_at`, `person_id`

### 4. Test Dry Run (2 minutes)

- [ ] Set required env vars:
  ```bash
  export LINKEDIN_CONTENT_SECRET=your-secret  # or CRON_SECRET
  ```
- [ ] Run dry run:
  ```bash
  cd web && npx tsx scripts/linkedinPost.ts --dry-run
  ```
- [ ] Verify it shows the formatted post text and exits cleanly

### 5. Test Actual Post (5 minutes)

- [ ] Post to LinkedIn:
  ```bash
  cd web && npx tsx scripts/linkedinPost.ts
  ```
- [ ] Check LinkedIn for the new post
- [ ] Check Supabase `linkedin_posts` table for the tracking record

### 6. Set Up OpenClaw Cron (5 minutes)

- [ ] Configure OpenClaw to run the posting script daily at ~09:15 UTC:
  ```
  cd /path/to/thepaymentsnerd/web && npx tsx scripts/linkedinPost.ts
  ```
- [ ] Ensure env vars are available to the cron job (`LINKEDIN_CONTENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`)

## 📋 Environment Variables Reference

```bash
# Required for posting
LINKEDIN_CONTENT_SECRET=xxx       # or CRON_SECRET — for API auth

# Required for Supabase tracking
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Required for token refresh (set on Mac mini)
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
```

## 🔗 Useful Links

- Supabase Dashboard: https://supabase.com/dashboard
- GitHub Actions: https://github.com/cesarhdzmorado/thepaymentsnerd/actions
- LinkedIn Developers: https://www.linkedin.com/developers/
- Full docs: `docs/LINKEDIN_AUTOMATION.md`

## Troubleshooting

**"LinkedIn tokens not found"** → Run `linkedinAuth.ts` first

**401 from LinkedIn** → Token expired. Script auto-refreshes, but if refresh token is also expired, re-run `linkedinAuth.ts`

**API returns 404** → Newsletter not generated yet for that date. Script falls back to local `newsletter.json`.

**Supabase tracking fails** → Check env vars. Ensure Phase 3 migration was run.

**Need help?** Check `docs/LINKEDIN_AUTOMATION.md` for detailed troubleshooting.
