# LinkedIn Automation - Phase 1 Setup Checklist

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

You can now move on to Phase 2 (Content Formatting) or Phase 3 (OpenClaw Integration).

---

## Quick Reference

### Environment Variables Needed

```bash
# In .env file (or GitHub Secrets)
LINKEDIN_WEBHOOK_SECRET=your-webhook-secret-here
LINKEDIN_CONTENT_SECRET=your-content-secret-here  # Optional
OPENCLAW_WEBHOOK_URL=https://abc123.ngrok.io/newsletter-webhook
```

### Test Commands

```bash
# Test API locally
cd web
npm run dev
curl "http://localhost:3000/api/linkedin-content?secret=test&date=2026-02-28"

# Test content extractor
cd web
npx tsx -e "
  import { extractLinkedInContent } from './lib/linkedinContentExtractor';
  import newsletter from './public/newsletter.json';
  const result = extractLinkedInContent(newsletter as any);
  console.log('Strategy:', result.recommended_strategy);
  console.log('Digest length:', result.formats.daily_digest?.character_count);
"
```

### Useful Links

- Supabase Dashboard: https://supabase.com/dashboard
- GitHub Actions: https://github.com/cesarhdzmorado/thepaymentsnerd/actions
- ngrok Dashboard: https://dashboard.ngrok.com
- LinkedIn Developers: https://www.linkedin.com/developers/

---

## Troubleshooting

**Issue:** Can't access Supabase
- Check you're logged into correct account
- Verify project isn't paused (free tier auto-pauses)

**Issue:** GitHub Actions failing
- Check secrets are set correctly
- Verify secret names match exactly (case-sensitive)

**Issue:** API returns 404
- Newsletter might not exist for that date
- Try: `curl "https://thepaymentsnerd.co/api/linkedin-content?secret=$SECRET"` (no date = latest)

**Need help?** Check `docs/LINKEDIN_AUTOMATION.md` for detailed troubleshooting.
