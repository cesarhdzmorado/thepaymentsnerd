# Deployment Guide

Complete guide for deploying The Payments Nerd newsletter platform to production.

## Overview

The platform uses a multi-service deployment architecture:

1. **Vercel** - Hosts Next.js web application and API routes
2. **GitHub Actions** - Automates daily newsletter generation
3. **Supabase** - Manages subscriber database (cloud-hosted PostgreSQL)
4. **Resend** - Handles email delivery
5. **Domain DNS** - Email authentication records

## Prerequisites

Before deploying:

- [ ] GitHub account with repository access
- [ ] Vercel account ([sign up](https://vercel.com))
- [ ] Supabase project ([create one](https://supabase.com))
- [ ] Resend account ([sign up](https://resend.com))
- [ ] Domain with DNS access (for email authentication)
- [ ] OpenAI API key ([get one](https://platform.openai.com/api-keys))

## Step 1: Deploy to Vercel

### 1.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Select your Git provider (GitHub)
4. Import repository: `yourusername/thepaymentsnerdv2`
5. Click **"Import"**

### 1.2 Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `web` (IMPORTANT!)

**Build Command:** `npm run build`

**Output Directory:** `.next` (default)

**Install Command:** `npm install`

### 1.3 Environment Variables

Add these environment variables in Vercel project settings:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=newsletter@thepaymentsnerd.co

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Security
SUBSCRIBE_TOKEN_SECRET=your_random_secret_32_bytes
CRON_SECRET=your_cron_secret_32_bytes

# Site URL
NEXT_PUBLIC_SITE_URL=https://thepaymentsnerd.co
```

**How to add:**
1. Go to **Project Settings → Environment Variables**
2. Add each variable
3. Select environments: Production, Preview, Development
4. Click **"Save"**

### 1.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (1-3 minutes)
3. Visit deployment URL (e.g., `https://thepaymentsnerdv2.vercel.app`)

### 1.5 Add Custom Domain

1. Go to **Project Settings → Domains**
2. Click **"Add Domain"**
3. Enter: `thepaymentsnerd.co`
4. Follow DNS configuration instructions
5. Vercel will auto-provision SSL certificate

**Typical DNS records:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Wait 24-48 hours for DNS propagation.

## Step 2: Configure Vercel Cron

Vercel cron automatically triggers email sending daily.

### 2.1 Verify vercel.json

Ensure `vercel.json` exists in project root with:

```json
{
  "git": {
    "deploymentEnabled": false
  },
  "crons": [
    {
      "path": "/api/send-daily",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Cron Schedule Explained:**
- `0 7 * * *` - Daily at 7:00 AM UTC
- Format: `minute hour day month weekday`
- Use [crontab.guru](https://crontab.guru) to customize

### 2.2 Test Cron Endpoint

```bash
curl -X POST https://thepaymentsnerd.co/api/send-daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "ok": true,
  "sent": 123,
  "failed": 0
}
```

### 2.3 Verify in Vercel Dashboard

1. Go to **Project → Cron Jobs** tab
2. You should see: `/api/send-daily` scheduled for 7:00 AM UTC
3. Vercel Hobby plan allows 1 cron job (sufficient)

**Note:** Vercel cron requires **Pro plan** for more than 1 job. Consider upgrading if you need multiple scheduled tasks.

## Step 3: Set Up GitHub Actions

GitHub Actions automates daily newsletter generation.

### 3.1 Add GitHub Secrets

Go to **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `OPENAI_API_KEY` | sk-proj-xxx | OpenAI dashboard |
| `SERPER_API_KEY` | (optional) | Serper.dev |
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbG... | Supabase project API settings |
| `NEXT_PUBLIC_SITE_URL` | https://thepaymentsnerd.co | Your domain |
| `CRON_SECRET` | your_cron_secret | Same as Vercel env var |
| `VERCEL_DEPLOY_HOOK_URL` | https://api.vercel.com/v1/integrations/deploy/... | See below |

### 3.2 Get Vercel Deploy Hook

1. Go to **Vercel Project → Settings → Git**
2. Scroll to **Deploy Hooks**
3. Create new hook:
   - **Name:** `GitHub Actions Newsletter Deploy`
   - **Branch:** `main`
4. Click **"Create Hook"**
5. Copy URL: `https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx`
6. Add to GitHub secrets as `VERCEL_DEPLOY_HOOK_URL`

### 3.3 Verify Workflow File

Ensure `.github/workflows/generate_news.yml` exists with correct configuration.

**Schedule:** Daily at 5:00 AM UTC (cron: `0 5 * * *`)

**Steps:**
1. Generate newsletter with Python AI agent
2. Commit `newsletter.json` to repository
3. Sync to Supabase (optional)
4. Trigger Vercel deployment via deploy hook
5. Wait 60 seconds for deployment
6. Call `/api/send-daily` to send emails

### 3.4 Test Workflow Manually

1. Go to **Actions** tab in GitHub
2. Select **"Daily Newsletter Pipeline"**
3. Click **"Run workflow"** → **"Run workflow"** (on main branch)
4. Monitor execution (takes 2-5 minutes)

**Expected output:**
- ✅ Newsletter generated
- ✅ Committed to Git
- ✅ Vercel deployment triggered
- ✅ Emails sent successfully

### 3.5 Monitor Scheduled Runs

**Schedule:** Runs daily at 5:00 AM UTC automatically

**Check status:**
1. Go to **Actions** tab
2. View recent runs
3. Click on a run to see logs

**Troubleshooting:**
- If workflow fails, check logs for errors
- Verify all GitHub secrets are set correctly
- Ensure OpenAI API has credits
- Check Supabase and Resend API status

## Step 4: Configure Email Delivery

### 4.1 Verify Domain in Resend

1. Log into [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter: `thepaymentsnerd.co`
4. Copy DNS records provided

### 4.2 Add DNS Records

Add these records to your domain DNS:

**SPF (TXT):**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM (TXT):**
```
Type: TXT
Name: resend._domainkey
Value: [Unique key from Resend]
```

**DMARC (TXT):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:newsletter@thepaymentsnerd.co
```

**MX (Mail Exchange):**
```
Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10
```

### 4.3 Wait for Verification

- **Time:** 1-24 hours for DNS propagation
- **Check:** Resend dashboard will show "Verified" status
- **Test:** `dig TXT _dmarc.thepaymentsnerd.co +short`

For detailed email setup, see [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md).

### 4.4 Set Up Resend Webhook

1. Go to [Resend Dashboard → Webhooks](https://resend.com/webhooks)
2. Click **"Add Webhook"**
3. Enter endpoint: `https://thepaymentsnerd.co/api/webhooks/resend`
4. Select events:
   - `email.bounced`
   - `email.complained`
   - `email.delivered` (optional)
5. Click **"Create"**
6. Copy webhook signing secret into the `RESEND_WEBHOOK_SECRET` Vercel env var (without it, the endpoint rejects every request)
7. Add to Vercel env vars: `RESEND_WEBHOOK_SECRET=whsec_xxx`

## Step 5: Database Setup

### 5.1 Create Supabase Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Create subscribers table
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  confirmed BOOLEAN DEFAULT false,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  referrer_id UUID REFERENCES public.subscribers(id),
  referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscribers_active ON public.subscribers(active);
CREATE INDEX idx_subscribers_confirmed ON public.subscribers(confirmed);

-- Subscriber operations are server-side only. Explicit grants are required
-- for Supabase Data API access from 30 October 2026.
REVOKE ALL PRIVILEGES ON TABLE public.subscribers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
```

### 5.2 Get Supabase API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL:** `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key:** `SUPABASE_SERVICE_ROLE_KEY` (secret!)

### 5.3 Add to Vercel Environment Variables

Ensure these are set in Vercel (see Step 1.3).

## Step 6: Post-Deployment Checklist

### Verify Deployment

- [ ] Website loads at production domain
- [ ] Newsletter preview displays correctly
- [ ] Subscribe form works (test with your email)
- [ ] Confirmation email arrives
- [ ] Email confirmation link works
- [ ] Unsubscribe link works

### Test Email Sending

```bash
# Send test email
curl "https://thepaymentsnerd.co/api/test-email?secret=YOUR_CRON_SECRET&to=your@email.com"
```

**Check:**
- [ ] Email arrives in inbox (not spam)
- [ ] Styling renders correctly
- [ ] Links work (unsubscribe, share)
- [ ] Images load

### Test Automation

- [ ] GitHub Actions workflow runs successfully
- [ ] Newsletter generated and committed to Git
- [ ] Vercel deployment triggered
- [ ] Emails sent to subscribers

### Monitor Services

- [ ] Vercel function logs (no errors)
- [ ] GitHub Actions logs (successful runs)
- [ ] Resend dashboard (delivery rates)
- [ ] Supabase logs (query performance)

## Step 7: Monitoring & Maintenance

### Daily Monitoring

**Check Resend Dashboard:**
- Delivery rate (target: 98%+)
- Bounce rate (target: <2%)
- Spam complaints (target: <0.1%)

**Check GitHub Actions:**
- Workflow success/failure
- Newsletter generation logs

**Check Vercel:**
- Function execution logs
- Error tracking
- Performance metrics

### Weekly Tasks

- [ ] Review DMARC reports
- [ ] Check subscriber growth
- [ ] Review bounce reasons
- [ ] Monitor content quality

### Monthly Tasks

- [ ] Export subscriber list backup
- [ ] Review Vercel/Supabase usage (avoid overages)
- [ ] Update dependencies (`npm update`)
- [ ] Review and optimize costs

## Scaling Considerations

### When to Upgrade

**Resend:**
- Free tier: 100 emails/day, 3,000/month
- Upgrade at **~2,500 subscribers** to Pro plan ($20/month)

**Vercel:**
- Hobby: 100 GB bandwidth, 1 cron job
- Upgrade to Pro ($20/month/member) if:
  - Traffic exceeds 100 GB/month
  - Need more than 1 cron job
  - Want team collaboration

**Supabase:**
- Free tier: 500 MB database, 50,000 MAU
- Upgrade at **~40,000 subscribers** to Pro plan ($25/month)

### Performance Optimization

**For 10,000+ subscribers:**
- Batch email sending (500 emails per batch)
- Add retry logic for failed sends
- Implement rate limiting
- Consider dedicated IP for email sending

**For high traffic:**
- Enable Vercel Edge caching
- Optimize images (WebP format)
- Add CDN for static assets
- Implement database read replicas

## Troubleshooting

### Deployment fails

**Error:** Build fails on Vercel

**Solutions:**
- Check root directory is set to `web`
- Verify `package.json` has correct scripts
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`

### Cron job not running

**Error:** `/api/send-daily` not triggering

**Solutions:**
- Verify `vercel.json` has cron configuration
- Check Vercel plan supports cron (requires Hobby or Pro)
- Review Vercel function logs
- Test endpoint manually with curl

### GitHub Actions failing

**Error:** Workflow fails during newsletter generation

**Solutions:**
- Check GitHub secrets are set correctly
- Verify OpenAI API key is valid and has credits
- Review workflow logs for specific errors
- Test Python script locally: `python -m ai.src.main`

### Emails not sending

**Error:** Subscribers not receiving newsletters

**Solutions:**
- Verify Resend API key in Vercel env vars
- Check domain is verified in Resend dashboard
- Review Resend logs for bounce/error reasons
- Ensure Supabase has active subscribers
- Test with `/api/test-email` endpoint

### Database connection errors

**Error:** Supabase queries failing

**Solutions:**
- Verify Supabase project is not paused (free tier pauses after inactivity)
- Check API keys are correct
- Ensure RLS policies allow required operations
- Review Supabase logs for specific errors

## Rollback Procedures

### Revert Deployment

**If deployment breaks production:**

1. Go to **Vercel Dashboard → Deployments**
2. Find last working deployment
3. Click **"..."** → **"Promote to Production"**
4. Confirm rollback

**If database needs rollback:**

1. Go to **Supabase Dashboard → Database → Backups**
2. Select backup point
3. Click **"Restore"**
4. Confirm restoration (WARNING: overwrites current data)

### Emergency Stops

**Stop email sending:**

1. Disable GitHub Actions workflow:
   - Go to **Actions** → **Daily Newsletter Pipeline**
   - Click **"..."** → **"Disable workflow"**

2. Remove Vercel cron:
   - Edit `vercel.json` and remove cron config
   - Redeploy

**Pause subscribers:**

```sql
-- Mark all as inactive temporarily
UPDATE subscribers SET active = false;
```

**Re-enable when ready:**

```sql
UPDATE subscribers SET active = true WHERE confirmed = true;
```

## Security Best Practices

### Production Checklist

- [ ] Use strong random secrets (32+ bytes)
- [ ] Enable DMARC with at least `p=none`
- [ ] Set up webhook signature verification
- [ ] Enable Supabase RLS policies
- [ ] Use service role key only in server-side code
- [ ] Never expose secrets in client-side code
- [ ] Rotate secrets every 90 days
- [ ] Monitor for suspicious activity

### Backup Strategy

**What to backup:**
- Subscriber database (weekly export)
- Environment variables (secure vault)
- Newsletter JSON files (Git history)
- DNS records (document separately)

**Automated backups:**
- Supabase: Daily automatic backups (7-day retention on free tier)
- Git: All code and newsletter.json committed
- Vercel: Deployment history retained

## Cost Estimate

**Free Tier (0-500 subscribers):**
- Vercel: Free (Hobby plan)
- Supabase: Free
- Resend: Free (up to 3,000 emails/month)
- GitHub Actions: Free
- **Total:** $0/month

**Growth Tier (500-5,000 subscribers):**
- Vercel: $20/month (Pro)
- Supabase: Free
- Resend: $20/month (Pro - 50,000 emails/month)
- OpenAI: ~$5-10/month (GPT-4 API)
- **Total:** ~$45-50/month

**Scale Tier (5,000-50,000 subscribers):**
- Vercel: $20/month
- Supabase: $25/month (Pro)
- Resend: $80/month (Business - 1M emails/month)
- OpenAI: ~$10-20/month
- **Total:** ~$135-145/month

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/help
- **Supabase Docs:** https://supabase.com/docs
- **Supabase Discord:** https://discord.supabase.com
- **Resend Docs:** https://resend.com/docs
- **Resend Support:** support@resend.com
- **GitHub Actions Docs:** https://docs.github.com/actions

## Next Steps

After successful deployment:

1. **Set up monitoring** - Add error tracking (Sentry, LogRocket)
2. **Analytics** - Track subscriber growth, engagement
3. **Content calendar** - Plan newsletter topics in advance
4. **Marketing** - Promote newsletter on social media
5. **Feedback loop** - Collect subscriber feedback
6. **A/B testing** - Test subject lines, send times
7. **Scale** - Plan for growth milestones

Your newsletter platform is now live and automated!
