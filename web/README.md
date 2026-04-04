# The Payments Nerd - Web Application

Next.js 15 web application for The Payments Nerd newsletter platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
# Copy .env.example from project root and configure

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

For complete documentation, see the main README and docs:

- **[Main README](../README.md)** - Project overview, quick start, tech stack
- **[Setup Guide](../docs/SETUP.md)** - Environment configuration, API keys
- **[Architecture](../docs/ARCHITECTURE.md)** - System design, data flow
- **[Deployment](../docs/DEPLOYMENT.md)** - Vercel deployment, GitHub Actions
- **[Email System](../docs/EMAIL_SYSTEM.md)** - Email delivery, compliance

## Project Structure

```
web/
├── app/                # Next.js App Router
│   ├── api/            # API routes
│   ├── page.tsx        # Homepage
│   └── layout.tsx      # Root layout
├── components/         # React components
│   └── home/           # Homepage sections and animations
├── emails/             # React Email templates
├── hooks/              # Custom React hooks (useInView, etc.)
├── lib/                # Utilities (Supabase, tokens, email, animationConfig)
├── public/             # Static assets
└── scripts/            # Development scripts
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run tests with Vitest
```

## Tech Stack

- **Framework:** Next.js 15.3.8 (App Router)
- **UI:** React 19, Tailwind CSS v4
- **Email:** React Email, Resend
- **Database:** Supabase
- **Analytics:** Vercel Analytics

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Email Docs](https://react.email)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Supabase Docs](https://supabase.com/docs)
