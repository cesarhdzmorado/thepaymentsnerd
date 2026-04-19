# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated AI-powered newsletter platform for payments industry news. Two codebases:
- **Python AI Agent** (`/ai`) — LangChain + GPT-4o discovers, analyzes, and generates newsletter content from RSS feeds and web sources
- **Next.js Web App** (`/web`) — frontend, API routes, email delivery, subscriber management

Live site: https://thepaymentsnerd.co

## Commands

All web commands run from `web/`:

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint (next/core-web-vitals + next/typescript)
npm test                 # Vitest (run once)
npm run email:preview    # Preview email template in browser
npm run email:test       # Send test email via Resend
npm run publish          # Commit and push newsletter.json
```

AI agent (from repo root):

```bash
cd ai && source .venv/bin/activate
python -m ai.src.main   # Generate newsletter -> web/public/newsletter.json
```

## Architecture

### Daily Pipeline (GitHub Actions at 08:30 UTC)
1. Python AI agent generates `web/public/newsletter.json`
2. Bot commits and pushes to main
3. `scripts/syncToSupabase.js` syncs content to Supabase `newsletters` table
4. Vercel deploy hook triggered
5. `/api/send-daily` sends emails to active subscribers (weekdays only)

There are also `send_analysis.yml` and `weekly_recap.yml` workflows.

### Key Directories
- `ai/config.yml` — RSS feeds, search sources, industry trends (weights, signals, companies)
- `ai/src/main.py` — Agent orchestration (Researcher -> Writer -> Editor)
- `web/app/api/` — API routes: subscribe, confirm, unsubscribe, send-daily, send-analysis, test-email, webhooks/resend
- `web/emails/` — React Email templates
- `web/lib/` — Supabase clients, email token utils, referrals, animationConfig
- `web/hooks/` — Custom React hooks (useInView for IntersectionObserver viewport detection)
- `web/components/` — React components
- `web/components/home/` — Homepage sections (HomeSections, HeroAnimations) and their tests
- `web/scripts/` — Helper scripts (syncToSupabase, previewEmail, sendTestEmail)

### Database (Supabase/PostgreSQL)
- `subscribers` table: email, status (pending/active/unsubscribed), referral tracking. RLS enabled — use `supabaseAdmin.ts` (service role) for server-side writes, `supabaseClient.ts` (anon) for client-side reads.
- `newsletters` table: publication_date (unique), content (JSONB), sent_at.

## Important Gotchas

- **`.env` lives at repo root**, not in `/web`. Both Next.js and Python (via python-dotenv) read from there.
- **Homepage ISR cache is 15 minutes** (`revalidate = 900`). New content won't appear instantly.
- **`?local=true` query param** loads homepage from `public/newsletter.json` instead of Supabase — useful for local dev.
- **Chroma/SQLite hack**: `ai/src/main.py` replaces sqlite3 with pysqlite3 at import time. Don't remove it.
- **Email tokens**: HMAC-SHA256 with `SUBSCRIBE_TOKEN_SECRET`. Confirmation expires in 48h, unsubscribe in 1 year.
- **Subscribe rate limit**: `/api/subscribe` enforces 5 requests per 15 min per IP (in-memory store, resets on cold start).

## Code Conventions

- Next.js 15 App Router with React 19. Server Components by default; `"use client"` only when needed.
- Tailwind CSS v4 with custom CSS variables in `globals.css`. Dark mode via `prefers-color-scheme`.
- API routes return `{ ok: true/false, ... }` pattern with `NextResponse.json()`.
- TypeScript with explicit interfaces. Named exports for components, default exports for pages.
- Python uses type hints, docstrings, and environment variables via python-dotenv.
- Commit messages follow conventional commits: `feat(scope): description`, `fix(scope): description`.

## Detailed Documentation

See `docs/` for SETUP, ARCHITECTURE, EMAIL_SYSTEM, DEPLOYMENT, and CONTRIBUTING guides. See `DESIGN.md` for the visual identity and design system (colors, typography, spacing, components).
