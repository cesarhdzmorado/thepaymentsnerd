# The Payments Nerd

An AI-powered daily newsletter delivering curated payments industry news, insights, and analysis.

## Overview

The Payments Nerd is an automated newsletter platform that uses AI to discover, curate, and summarize the latest news in the payments industry. The system generates daily newsletters with trending topics, company updates, and industry insights, delivered directly to subscribers' inboxes.

**Live Site:** https://thepaymentsnerd.co

## Features

- **AI-Powered Content Generation:** Uses OpenAI GPT-4 to analyze RSS feeds, search results, and web content
- **Daily Automated Newsletters:** Scheduled generation and delivery via GitHub Actions and Vercel cron
- **Email Marketing Platform:** Built on Resend with SPF/DKIM/DMARC authentication
- **Subscriber Management:** Double opt-in flow with email confirmation and one-click unsubscribe
- **Referral System:** Track subscriber referrals with analytics
- **Modern Web Interface:** Next.js 15 with React 19 and Tailwind CSS v4
- **Dark Mode Support:** Full dark mode across all pages including legal pages
- **Newsletter Archive:** Browse and share past newsletters online
- **UK Legal Compliance:** Privacy, Terms, and Cookie policies compliant with UK GDPR, DPA 2018, and PECR 2003

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+ with pip
- OpenAI API key
- Resend account (for email delivery)
- Supabase project (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/thepaymentsnerd.git
cd thepaymentsnerd

# Install web dependencies
cd web
npm install

# Install AI dependencies
cd ../ai
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Then create a root `.env` file manually and add the required keys (see [docs/SETUP.md](docs/SETUP.md) for the full checklist).

### Environment Configuration

Create a `.env` file in the repository root with the following variables:

```bash
# OpenAI (required for newsletter generation)
OPENAI_API_KEY=your_openai_api_key_here

# Resend (required for email delivery)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=newsletter@thepaymentsnerd.co

# Supabase (required for subscriber database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Security tokens (generate random strings)
SUBSCRIBE_TOKEN_SECRET=your_random_secret_key_here
CRON_SECRET=your_cron_secret_here

# Site configuration
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

See [docs/SETUP.md](docs/SETUP.md) for detailed configuration instructions.

### Running Locally

```bash
# Start the development server
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Tech Stack

### Frontend (Next.js App)
- **Framework:** Next.js 15.3.8 with App Router
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4 with custom typography (Archivo, Inter)
- **Email Templates:** React Email components
- **Icons:** Lucide React
- **Analytics:** Vercel Analytics

### Backend & Services
- **Email Delivery:** Resend API with custom domain authentication
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Email token-based confirmation
- **Hosting:** Vercel (serverless functions + cron)
- **CI/CD:** GitHub Actions for automated newsletter generation

### AI Newsletter Generation (Python)
- **LLM:** OpenAI GPT-4 via LangChain
- **Orchestration:** LangChain agents and tools
- **Data Sources:** RSS feeds, web scraping, search APIs
- **Web Scraping:** BeautifulSoup4 + lxml
- **Feed Parsing:** feedparser
- **Search:** DuckDuckGo Search API
- **Storage:** Chroma vector database (SQLite)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Daily 7 AM UTC)          │
│  Runs Python AI agent → Generates newsletter.json          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vercel Cron (Daily 7 AM UTC)                │
│  Triggers /api/send-daily → Sends emails via Resend        │
└─────────────────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────────┐
│   Supabase    │         │     Resend       │
│  (Subscribers)│         │  (Email Delivery)│
└───────────────┘         └──────────────────┘
```

### Data Flow

1. **Newsletter Generation (AI):**
   - GitHub Actions triggers Python script (`ai/src/main.py`)
   - AI agent fetches RSS feeds, searches web, scrapes articles
   - GPT-4 analyzes content and generates structured newsletter
   - Output saved to `web/public/newsletter.json`

2. **Email Delivery (Automated):**
   - Vercel cron triggers `/api/send-daily` endpoint
   - API fetches active subscribers from Supabase
   - Newsletter rendered using React Email template
   - Emails sent via Resend with tracking headers

3. **Subscription Flow (User-Initiated):**
   - User submits email on homepage
   - Confirmation email sent with secure token
   - User clicks link to confirm subscription
   - Subscriber saved to Supabase with `active` status

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## Project Structure

```
thepaymentsnerd/
├── ai/                          # Python AI newsletter generator
│   ├── config.yml               # RSS feeds, search sources, topics
│   ├── requirements.txt         # Python dependencies
│   └── src/
│       ├── main.py              # AI agent orchestration
│       └── tools.py             # Search, scrape, RSS tools
│
├── web/                         # Next.js frontend application
│   ├── app/
│   │   ├── api/                 # API routes (subscribe, send-daily, webhooks)
│   │   ├── page.tsx             # Homepage with newsletter preview
│   │   └── layout.tsx           # Root layout
│   ├── components/              # React components (Logo, SubscribeForm, etc.)
│   │   └── home/               # Homepage sections and animations
│   ├── emails/                  # React Email templates
│   ├── hooks/                   # Custom React hooks (useInView, etc.)
│   ├── lib/                     # Utilities (Supabase, tokens, email, animationConfig)
│   ├── public/
│   │   └── newsletter.json      # Latest newsletter data (generated by AI)
│   └── package.json
│
├── db/
│   ├── chroma.sqlite3           # Vector database for AI content
│   └── migrations/              # SQL migrations
│
├── .github/
│   └── workflows/
│       └── generate_news.yml    # Automated newsletter generation
│
├── docs/                        # Documentation (see below)
└── vercel.json                  # Vercel cron configuration
```

## Documentation

- **[SETUP.md](docs/SETUP.md)** - Environment setup, API keys, DNS configuration
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, data flow, component details
- **[EMAIL_SYSTEM.md](docs/EMAIL_SYSTEM.md)** - Email delivery, authentication, compliance
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Vercel deployment, GitHub Actions, cron setup
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Development guidelines and workflow
- **[README.md](docs/README.md)** - Documentation index and recommended reading order

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscribe` | POST | Subscribe new email with confirmation flow |
| `/api/confirm` | GET | Confirm email subscription via token |
| `/api/unsubscribe` | POST | Unsubscribe email address |
| `/api/send-daily` | POST | Trigger daily newsletter send (cron) |
| `/api/test-email` | GET | Send test email (dev only, requires secret) |
| `/api/webhooks/resend` | POST | Handle Resend webhooks (bounces, complaints) |

## Development

### Running Tests

```bash
cd web
npm test
```

### Building for Production

```bash
cd web
npm run build
npm start
```

## Local Testing Guide

This section explains how to test each component of the newsletter system locally without waiting for the daily GitHub Action.

### 1. Test AI Content Generation (Prompt Engineering)

Generate newsletter content locally to test your prompt changes:

```bash
cd ai
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python -m ai.src.main
```

This generates `web/public/newsletter.json` with fresh content from RSS feeds and web search.

**Requirements:** `OPENAI_API_KEY` in your `.env` file.

**Tips:**
- The script has verbose logging enabled, so you'll see all AI reasoning steps
- Modify `ai/config.yml` to adjust RSS feeds, search sources, and industry trends
- Each run costs API credits (GPT-4o for research, GPT-4o-mini for writing/editing)

### 2. Test Website UI/UX

Start the development server and preview the homepage:

```bash
cd web
npm run dev
```

**Option A: View with local data (no Supabase needed)**

After generating content with the AI, view it immediately:

```
http://localhost:3000?local=true
```

This loads directly from `public/newsletter.json` — perfect for testing UI changes without syncing to Supabase. A yellow banner indicates local preview mode.

**Option B: View from Supabase (production-like)**

```
http://localhost:3000
```

This loads from Supabase. If you generated new content locally, sync it first:

```bash
node scripts/syncToSupabase.js
```

**Requirements for Option B:** Supabase credentials in `.env` file.

### 3. Test Email UI/UX

Three ways to test email template changes:

**Option A: Browser Preview (Fastest, no API keys needed)**

```bash
cd web
npm run email:preview
```

Opens `email-preview.html` in your browser with sample data. Great for quick design iteration.

**Option B: Send Test Email via Resend**

```bash
cd web
npm run email:test                    # Uses default test address
npm run email:test -- your@email.com  # Send to specific address
```

Sends an actual email via Resend API to verify deliverability and rendering.

**Requirements:** `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY` in `.env.local`

**Option C: Send via API Endpoint**

With the dev server running:

```bash
./scripts/sendTestEmail.sh your@email.com
```

Or manually:

```bash
curl "http://localhost:3000/api/test-email?to=your@email.com&secret=YOUR_CRON_SECRET"
```

### Testing Workflow Summary

| What to Test | Command | API Keys Needed |
|--------------|---------|-----------------|
| AI prompt engineering | `python -m ai.src.main` | OPENAI_API_KEY |
| Website UI (local data) | `npm run dev` → `localhost:3000?local=true` | None |
| Website UI (production-like) | `npm run dev` → `localhost:3000` | Supabase keys |
| Email design | `npm run email:preview` | None |
| Email delivery | `npm run email:test` | RESEND_API_KEY, OPENAI_API_KEY |

### Full Local Test Cycle

Test the entire pipeline locally:

```bash
# 1. Generate newsletter content
cd ai && source .venv/bin/activate && python -m ai.src.main

# 2. Preview website with local data
cd ../web && npm run dev
# Open: http://localhost:3000?local=true

# 3. Preview email template
npm run email:preview
# Open: web/email-preview.html

# 4. (Optional) Sync to Supabase and send test email
node scripts/syncToSupabase.js
npm run email:test -- your@email.com
```

## Deployment

The application is deployed on Vercel with automated workflows:

1. **Web Application:** Vercel auto-deploys from `main` branch
2. **Newsletter Generation:** GitHub Actions runs daily at 07:00 UTC
3. **Email Delivery:** Vercel cron triggers daily at 07:00 UTC

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

## Email Deliverability

The platform uses industry-standard email authentication:

- **SPF Record:** Validates sending server
- **DKIM Signature:** Cryptographic authentication
- **DMARC Policy:** Email alignment verification
- **List-Unsubscribe:** One-click unsubscribe headers
- **Bounce Handling:** Automatic webhook processing

For Apple iCloud compliance and deliverability troubleshooting, see [docs/EMAIL_SYSTEM.md](docs/EMAIL_SYSTEM.md).

## Database Schema

**Subscribers Table:**
```sql
CREATE TABLE subscribers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'active', 'unsubscribed'
  confirmed_at TIMESTAMP,
  referral_code TEXT,
  referred_by TEXT,
  consent_ip TEXT,
  consent_user_agent TEXT
);
```

**Newsletters Table:**
```sql
CREATE TABLE newsletters (
  id UUID PRIMARY KEY,
  publication_date DATE UNIQUE NOT NULL,
  content JSONB NOT NULL,
  sent_at TIMESTAMP
);
```

**Note:** Row Level Security (RLS) is enabled on the `subscribers` table. Server-side operations requiring full access should use the Supabase admin client (service role key).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete schema.

## License

Private project - All rights reserved.

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: cesar@thepaymentsnerd.co

## Acknowledgments

- OpenAI for GPT-4 API
- Resend for email delivery infrastructure
- Supabase for database and authentication
- Vercel for hosting and serverless functions
