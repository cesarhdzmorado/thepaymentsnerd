# Architecture

Technical architecture and system design for The Payments Nerd newsletter platform.

## System Overview

The Payments Nerd is a full-stack automated newsletter platform with three main components:

1. **AI Content Generator** (Python) - Discovers and curates news
2. **Web Application** (Next.js) - Frontend and API
3. **Email Delivery System** (Resend) - Newsletter distribution

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Scheduler                     │
│                      (Daily at 5:00 AM UTC)                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Python AI Agent (ai/src/main.py)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ RSS Fetcher  │  │ Web Scraper  │  │ Search Agent │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         └──────────────────┴──────────────────┘                 │
│                          │                                       │
│                          ▼                                       │
│              ┌─────────────────────┐                            │
│              │  OpenAI GPT-4       │                            │
│              │  Content Analysis   │                            │
│              └─────────┬───────────┘                            │
│                        │                                         │
│                        ▼                                         │
│              ┌─────────────────────┐                            │
│              │  Chroma Vector DB   │                            │
│              │  (Deduplication)    │                            │
│              └─────────┬───────────┘                            │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  newsletter.json generated   │
          │  (web/public/newsletter.json)│
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Git Commit & Push to main   │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Sync to Supabase (optional) │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Trigger Vercel Deployment   │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Call /api/send-daily        │
          │  (Send emails to subscribers)│
          └──────────────┬───────────────┘
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌──────────────────┐
│   Supabase    │                  │     Resend       │
│ (Subscribers) │                  │ (Email Delivery) │
└───────────────┘                  └──────────────────┘
```

## Component Details

### 1. AI Content Generator (`/ai`)

**Purpose:** Discovers, curates, and generates newsletter content using AI.

**Tech Stack:**
- **Language:** Python 3.11+
- **Orchestration:** LangChain 0.1.20
- **LLM:** OpenAI GPT-4 via langchain-openai 0.1.7
- **Web Scraping:** BeautifulSoup4 4.12.3 + lxml 5.2.2
- **Feed Parsing:** feedparser 6.0.11
- **Search:** duckduckgo-search 6.1.8
- **Vector DB:** Chroma (pysqlite3-binary 0.5.4)
- **Config:** PyYAML 6.0.1

**Files:**
```
ai/
├── config.yml              # RSS feeds, search keywords, newsletter structure
├── requirements.txt        # Python dependencies
└── src/
    ├── main.py             # Agent orchestration and execution
    ├── config.py           # Configuration loader
    └── tools.py            # Search, scrape, RSS tools
```

**Workflow:**

1. **Load Configuration** (`config.yml`)
   - RSS feed sources (PaymentsJournal, PaymentsDive, etc.)
   - Search keywords ("payments", "fintech", "digital wallets")
   - Companies to track (Stripe, Square, PayPal, etc.)

2. **Fetch Content**
   - **RSS Feeds:** Parse feeds with feedparser
   - **Web Search:** Query DuckDuckGo for latest news
   - **Web Scraping:** Extract article content with BeautifulSoup

3. **AI Analysis**
   - **Deduplication:** Store content hashes in Chroma vector DB
   - **Summarization:** GPT-4 summarizes each article
   - **Categorization:** Group by topic (Trends, Company News, etc.)
   - **Curation:** Select top stories based on relevance

4. **Generate Newsletter**
   - Format as structured JSON
   - Include title, summary, source, link for each story
   - Add publication date metadata
   - Output to `web/public/newsletter.json`

**Output Format:**
```json
{
  "publication_date": "2026-01-03",
  "title": "Daily Payments Digest",
  "sections": [
    {
      "title": "Trending Today",
      "items": [
        {
          "title": "Article Title",
          "summary": "AI-generated summary...",
          "source": "PaymentsJournal",
          "url": "https://..."
        }
      ]
    }
  ]
}
```

### 2. Web Application (`/web`)

**Purpose:** Frontend interface, API routes, and email delivery logic.

**Tech Stack:**
- **Framework:** Next.js 15.3.8 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4
- **Typography:** Archivo Variable, Inter Variable (Google Fonts)
- **Email Templates:** @react-email/components 1.0.3
- **Email Sending:** Resend 6.6.0
- **Database:** @supabase/supabase-js 2.50.0
- **Analytics:** @vercel/analytics 1.6.1
- **Icons:** lucide-react 0.516.0
- **Utilities:** date-fns-tz, nanoid, dotenv
- **Testing:** vitest 3.2.4

**Directory Structure:**
```
web/
├── app/
│   ├── api/
│   │   ├── subscribe/          # POST - Email subscription
│   │   ├── confirm/            # GET - Email confirmation
│   │   ├── unsubscribe/        # POST - Unsubscribe handler
│   │   ├── send-daily/         # POST - Daily email sender (cron)
│   │   ├── test-email/         # GET - Test email endpoint
│   │   └── webhooks/resend/    # POST - Resend webhook handler
│   ├── legal/                  # Legal page
│   ├── privacy/                # Privacy policy
│   ├── cookies/                # Cookie policy
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Homepage with newsletter preview
│   └── globals.css             # Tailwind directives
├── components/
│   ├── Logo.tsx                # Animated typewriter logo
│   ├── CompactLogo.tsx         # Simplified logo
│   ├── NavigationBar.tsx       # Top navigation
│   ├── NewsletterNavigation.tsx# Newsletter-specific nav
│   ├── SubscribeForm.tsx       # Email subscription form
│   ├── SubscribeModal.tsx      # Subscription modal
│   ├── ShareButtons.tsx        # Social sharing
│   ├── ScrollToTop.tsx         # Scroll to top button
│   ├── Footer.tsx              # Site footer
│   └── LegalPageLayout.tsx     # Legal page wrapper
├── emails/
│   └── DailyNewsletter.tsx     # React Email template
├── lib/
│   ├── supabaseClient.ts       # Client-side Supabase
│   ├── supabaseAdmin.ts        # Server-side Supabase (service role)
│   ├── emailTokens.ts          # Secure token generation/verification
│   ├── emailTemplate.ts        # Email HTML generation
│   ├── referrals.ts            # Referral tracking
│   └── publicationNames.ts     # Publication name mappings
├── scripts/
│   ├── previewEmail.ts         # Generate email preview HTML
│   └── syncToSupabase.js       # Sync newsletter to Supabase
├── public/
│   ├── newsletter.json         # Latest newsletter data (5.1KB)
│   ├── og-image.png            # Open Graph image (737KB)
│   └── og-image.svg            # SVG version (2MB)
└── package.json
```

**API Routes:**

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/subscribe` | POST | Public (rate-limited) | Accept email, send confirmation (5 req/15 min/IP) |
| `/api/confirm` | GET | Token | Verify email and activate subscription |
| `/api/unsubscribe` | POST | Token | Deactivate subscription |
| `/api/send-daily` | POST | Bearer | Send newsletter to all active subscribers |
| `/api/test-email` | GET | Secret param | Send test email |
| `/api/webhooks/resend` | POST | Signature | Handle Resend events (bounces, etc.) |

**Data Flow - Subscription:**

```
User enters email
    ↓
POST /api/subscribe
    ↓
Check if email exists in Supabase
    ↓
If new: Insert with confirmed=false
    ↓
Generate secure token (JWT-like, HMAC-SHA256)
    ↓
Send confirmation email via Resend
    ↓
User clicks link in email
    ↓
GET /api/confirm?email=...&token=...
    ↓
Verify token signature
    ↓
Update subscriber: confirmed=true, active=true
    ↓
Redirect to success page
```

**Data Flow - Newsletter Sending:**

```
Vercel Cron triggers (7 AM UTC)
    ↓
POST /api/send-daily
    ↓
Verify Authorization: Bearer header
    ↓
Fetch newsletter.json from filesystem
    ↓
Query Supabase: SELECT * FROM subscribers WHERE active=true AND confirmed=true
    ↓
For each subscriber:
    ↓
    Render React Email template
    ↓
    Generate unsubscribe token
    ↓
    Send via Resend API with headers:
      - List-Unsubscribe
      - List-Unsubscribe-Post
      - X-Entity-Ref-ID
    ↓
Track results (sent, failed)
    ↓
Return JSON: { sent: N, failed: M }
```

### 3. Database (Supabase)

**Database:** PostgreSQL (managed by Supabase)

**Tables:**

#### `subscribers`

Primary table for email subscribers.

```sql
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  confirmed BOOLEAN DEFAULT false,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  referrer_id UUID REFERENCES subscribers(id),
  referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_active ON subscribers(active);
CREATE INDEX idx_subscribers_confirmed ON subscribers(confirmed);
CREATE INDEX idx_subscribers_referrer ON subscribers(referrer_id);
```

**Row Level Security (RLS):**

```sql
-- Enable RLS
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for signup)
CREATE POLICY "Allow public insert" ON subscribers
  FOR INSERT TO anon WITH CHECK (true);

-- Allow public read own (for confirmation)
CREATE POLICY "Allow public read own" ON subscribers
  FOR SELECT TO anon USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON subscribers
  FOR ALL TO service_role USING (true);
```

**Columns Explained:**

- `id` - UUID primary key
- `email` - Unique email address
- `active` - Whether subscription is active (false if unsubscribed/bounced)
- `confirmed` - Email confirmed via link
- `subscribed_at` - Initial subscription timestamp
- `confirmed_at` - Confirmation timestamp
- `referrer_id` - UUID of referring subscriber (for referral tracking)
- `referral_count` - Number of successful referrals

#### `newsletters` (Optional)

Track sent newsletters for analytics.

```sql
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Email Delivery (Resend)

**Service:** Resend (https://resend.com)

**Configuration:**
- **From Address:** `newsletter@thepaymentsnerd.co`
- **From Name:** `The Payments Nerd`
- **Authentication:** SPF, DKIM, DMARC (see EMAIL_SYSTEM.md)
- **Webhooks:** Bounce and complaint handling

**Email Template:** React Email components render to HTML

**Headers:**
```typescript
{
  'List-Unsubscribe': '<https://thepaymentsnerd.co/api/unsubscribe?email=...&token=...>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  'X-Entity-Ref-ID': '2026-01-03',
}
```

**Webhook Events:**
- `email.bounced` - Hard/soft bounces
- `email.complained` - Spam complaints
- `email.delivered` - Successful delivery
- `email.delivery_delayed` - Temporary delays

See [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md) for detailed email configuration.

### 5. Automation (GitHub Actions + Vercel Cron)

**GitHub Actions:** Newsletter generation

**Workflow:** `.github/workflows/generate_news.yml`

**Schedule:** Daily at 5:00 AM UTC (cron: `0 5 * * *`)

**Steps:**
1. Checkout repository
2. Set up Python 3.12
3. Install dependencies (`pip install -r ai/requirements.txt`)
4. Run AI agent (`python -m ai.src.main`)
5. Commit `newsletter.json` to Git
6. Set up Node.js 20
7. Sync to Supabase (optional)
8. Trigger Vercel deployment
9. Wait 60 seconds for deployment
10. Call `/api/send-daily` to send emails

**Vercel Cron:** Email sending fallback

**Configuration:** `vercel.json`

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

**Schedule:** Daily at 7:00 AM UTC

## Security

### Authentication

**API Routes:**
- Bearer token authentication for `/api/send-daily`
- HMAC-SHA256 signed tokens for email confirmation/unsubscribe
- Webhook signature verification for Resend events

**Token Generation:**

```typescript
// lib/emailTokens.ts
import crypto from 'crypto';

const secret = process.env.SUBSCRIBE_TOKEN_SECRET;

function generateToken(email: string): string {
  const payload = JSON.stringify({ email, timestamp: Date.now() });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return Buffer.from(payload + '.' + signature).toString('base64url');
}

function verifyToken(token: string): { email: string } | null {
  const decoded = Buffer.from(token, 'base64url').toString();
  const [payload, signature] = decoded.split('.');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  if (signature !== expected) return null;
  const { email, timestamp } = JSON.parse(payload);
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return null; // 24h expiry
  return { email };
}
```

### Environment Variables

**Required Secrets:**
```bash
OPENAI_API_KEY              # OpenAI API access
RESEND_API_KEY              # Email sending
SUPABASE_SERVICE_ROLE_KEY   # Database access
SUBSCRIBE_TOKEN_SECRET      # Email token signing
CRON_SECRET                 # API authentication
```

**Security Best Practices:**
- Never commit `.env` to Git (in `.gitignore`)
- Use different secrets for dev/production
- Rotate secrets periodically
- Use strong random values (32+ bytes)

### Rate Limiting

**`/api/subscribe` endpoint:**
- IP-based rate limiting: 5 requests per 15-minute window per IP address
- Returns HTTP 429 (Too Many Requests) when limit is exceeded
- Implemented with an in-memory store (resets on serverless cold starts)

### Input Validation

**Email Validation:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return new Response('Invalid email', { status: 400 });
}
```

**SQL Injection Prevention:**
- Supabase client uses parameterized queries
- Never concatenate user input into queries

**XSS Prevention:**
- React automatically escapes HTML
- Use `dangerouslySetInnerHTML` only for trusted content
- Sanitize user input in email templates

## Performance

### Caching

**Next.js:**
- Static pages cached at CDN edge
- API routes cached with `revalidate` option
- `newsletter.json` served as static file

**Supabase:**
- Connection pooling enabled
- Indexes on frequently queried columns

### Optimization

**Images:**
- SVG for logo (scalable)
- PNG optimized with compression
- Lazy loading for below-fold images

**Bundle Size:**
- Next.js automatic code splitting
- Dynamic imports for heavy components
- Tree shaking eliminates unused code

**Database:**
- Queries limited to active/confirmed subscribers
- Batch operations where possible
- Indexes on `email`, `active`, `confirmed`

## Monitoring

### Logs

**GitHub Actions:**
- View in Actions tab
- Newsletter generation logs
- Email send results

**Vercel:**
- Function logs in Vercel dashboard
- API route execution times
- Error tracking

**Resend:**
- Delivery rates
- Bounce rates
- Open/click tracking

### Metrics

**Key Performance Indicators:**
- Subscriber growth rate
- Newsletter generation success rate
- Email delivery rate (target: 98%+)
- Bounce rate (target: <2%)
- Open rate (limited due to Apple Privacy)
- Click-through rate

## Scalability

**Current Capacity:**
- Handles 10,000+ subscribers without issues
- Supabase free tier: 500MB database, 50,000 monthly active users
- Resend free tier: 100 emails/day, 3,000 emails/month
- Vercel hobby: 100GB bandwidth/month

**Scaling Considerations:**
- Upgrade Resend plan for >3,000 subscribers
- Batch email sending if subscriber count >10,000
- Add Supabase read replicas for high traffic
- ~~Implement rate limiting on API routes~~ (done — `/api/subscribe` has IP-based rate limiting)

## Disaster Recovery

**Backup Strategy:**
- Git repository backs up code and newsletter.json
- Supabase automatic daily backups
- Export subscriber list weekly (manual)

**Recovery Steps:**
1. Restore code from Git
2. Restore database from Supabase backup
3. Verify DNS/email configuration
4. Test email sending
5. Resume automated workflows

## Future Enhancements

**Potential Features:**
- User preference center (topic selection)
- A/B testing for subject lines
- Engagement-based sending times
- Subscriber segmentation
- Advanced analytics dashboard
- Mobile app for newsletter reading

## References

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [React Email Docs](https://react.email)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Supabase Docs](https://supabase.com/docs)
- [LangChain Docs](https://python.langchain.com/)
