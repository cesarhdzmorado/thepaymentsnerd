# Setup Guide

Complete setup instructions for The Payments Nerd newsletter platform.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** and npm
- **Python 3.11+** with pip
- **Git** for version control
- **OpenAI API key** ([get one here](https://platform.openai.com/api-keys))
- **Resend account** ([sign up](https://resend.com))
- **Supabase project** ([create one](https://supabase.com))
- **Vercel account** (optional, for deployment)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/thepaymentsnerdv2.git
cd thepaymentsnerdv2
```

### 2. Install Dependencies

#### Web Application (Next.js)

```bash
cd web
npm install
```

#### AI Newsletter Generator (Python)

```bash
cd ../ai
python -m venv .venv

# On macOS/Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the **root directory** (not in `/web`):

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# ============================================
# OpenAI Configuration (Required)
# ============================================
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# ============================================
# Email Configuration (Required)
# ============================================
# Resend API key from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Use your verified domain
EMAIL_FROM=newsletter@thepaymentsnerd.co

# ============================================
# Supabase Configuration (Required)
# ============================================
# From your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# Security Tokens (Required)
# ============================================
# Generate random secrets (use: openssl rand -base64 32)
SUBSCRIBE_TOKEN_SECRET=your_random_secret_key_here
CRON_SECRET=your_cron_secret_here

# ============================================
# Site Configuration (Required)
# ============================================
# Your production domain (or http://localhost:3000 for dev)
NEXT_PUBLIC_SITE_URL=https://thepaymentsnerd.co

# ============================================
# Optional Services
# ============================================
# Serper API for web search (currently not used)
SERPER_API_KEY=your_serper_api_key_here
```

### 4. Database Setup (Supabase)

#### Create Subscribers Table

Run this SQL in the Supabase SQL Editor:

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON public.subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmed ON public.subscribers(confirmed);
CREATE INDEX IF NOT EXISTS idx_subscribers_referrer ON public.subscribers(referrer_id);

-- Subscriber operations are server-side only. Explicit grants are required
-- for Supabase Data API access from 30 October 2026.
REVOKE ALL PRIVILEGES ON TABLE public.subscribers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
```

#### Create Newsletters Table (Optional, for tracking sent newsletters)

```sql
CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_publication_date ON public.newsletters(publication_date);

-- The website reads newsletters anonymously; writes remain server-side.
REVOKE ALL PRIVILEGES ON TABLE public.newsletters FROM anon, authenticated;
GRANT SELECT ON TABLE public.newsletters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.newsletters TO service_role;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public newsletter reads" ON public.newsletters
  FOR SELECT TO anon USING (true);
```

### 5. Email Domain Setup (Resend)

To send emails from your custom domain, you must verify it in Resend:

#### Add Domain in Resend Dashboard

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain: `thepaymentsnerd.co`
4. Resend will provide DNS records to add

#### Add DNS Records to Your Provider

Add these TXT records to your domain's DNS settings:

**SPF Record:**
```
Type: TXT
Name: @ (or root domain)
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record:**
```
Type: TXT
Name: resend._domainkey
Value: [Resend will provide unique DKIM key]
```

**DMARC Record (Required for Apple iCloud delivery):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:newsletter@thepaymentsnerd.co; ruf=mailto:newsletter@thepaymentsnerd.co; fo=1
```

**MX Record (for bounce handling):**
```
Type: MX
Name: @ (or root domain)
Value: feedback-smtp.resend.com
Priority: 10
```

#### Verify DNS Propagation

Wait up to 24 hours for DNS propagation, then verify:

```bash
# Check DMARC
dig TXT _dmarc.thepaymentsnerd.co +short

# Check DKIM
dig TXT resend._domainkey.thepaymentsnerd.co +short

# Check SPF
dig TXT thepaymentsnerd.co +short

# Check MX
dig MX thepaymentsnerd.co +short
```

Resend will automatically verify once DNS records are detected.

For detailed email compliance and troubleshooting, see [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md).

### 6. GitHub Secrets (for CI/CD)

If deploying via GitHub Actions, add these secrets in **Settings → Secrets and variables → Actions**:

```
OPENAI_API_KEY
SERPER_API_KEY (optional)
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
CRON_SECRET
VERCEL_DEPLOY_HOOK_URL (from Vercel project settings)
```

## Running the Application

### Start Development Server

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Generate Newsletter Manually

```bash
cd ai
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python src/main.py
```

This generates `web/public/newsletter.json`.

### Preview Email Template

```bash
cd web
npx tsx scripts/previewEmail.ts
```

This generates an HTML preview of the email in your browser.

### Send Test Email

```bash
# Start dev server
npm run dev

# In another terminal, send test email
curl "http://localhost:3000/api/test-email?secret=YOUR_CRON_SECRET&to=your@email.com"
```

Replace `YOUR_CRON_SECRET` with the value from your `.env` file.

### Run Tests

```bash
cd web
npm test
```

## Configuration Files

### AI Newsletter Configuration

Edit `ai/config.yml` to customize:

- RSS feed sources
- Search keywords
- Companies to track
- Newsletter sections
- AI prompts

### Newsletter Content Sources

The AI agent fetches content from:

1. **RSS Feeds** (PaymentsJournal, PaymentsDive, FIS, etc.)
2. **Web Search** (DuckDuckGo)
3. **Web Scraping** (BeautifulSoup4)

Sources are defined in `ai/config.yml`.

### Vercel Configuration

`vercel.json` defines:

```json
{
  "crons": [
    {
      "path": "/api/send-daily",
      "schedule": "0 7 * * *"
    }
  ]
}
```

This triggers email sending daily at 7 AM UTC.

## Security Best Practices

### Generate Strong Secrets

```bash
# On macOS/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Use these for:
- `SUBSCRIBE_TOKEN_SECRET`
- `CRON_SECRET`

### Protect API Routes

All sensitive endpoints use Bearer token authentication:

```typescript
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

if (token !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Environment Variables

- Never commit `.env` to Git (it's in `.gitignore`)
- Use different secrets for dev/production
- Rotate secrets periodically

## Troubleshooting

### Issue: DNS records not verifying in Resend

**Solution:**
- Wait up to 24 hours for DNS propagation
- Use [WhatsMyDNS](https://www.whatsmydns.net/) to check global propagation
- Verify no typos in DNS records

### Issue: Newsletter generation fails

**Solution:**
- Check OpenAI API key is valid and has credits
- Verify Python dependencies are installed: `pip install -r ai/requirements.txt`
- Check `ai/config.yml` for valid RSS feed URLs

### Issue: Emails not sending

**Solution:**
- Verify Resend API key in `.env`
- Check domain is verified in Resend dashboard
- Ensure `EMAIL_FROM` matches verified domain
- Check Supabase has active subscribers: `SELECT * FROM subscribers WHERE active = true AND confirmed = true`

### Issue: Supabase connection errors

**Solution:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is running (not paused)
- Verify RLS policies allow the operations you're attempting

### Issue: CORS errors in development

**Solution:**
- Ensure you're using `http://localhost:3000` (not `127.0.0.1`)
- Check `NEXT_PUBLIC_SITE_URL` in `.env`
- Verify Supabase project allows localhost in allowed origins

## Next Steps

Once setup is complete:

1. **Test the subscription flow:** Subscribe with a test email and confirm
2. **Generate a newsletter:** Run the AI agent manually
3. **Send a test email:** Use the `/api/test-email` endpoint
4. **Deploy to Vercel:** See [DEPLOYMENT.md](DEPLOYMENT.md)
5. **Set up automation:** Configure GitHub Actions for daily newsletters

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Email Deliverability Guide](EMAIL_SYSTEM.md)
- [Architecture Overview](ARCHITECTURE.md)
