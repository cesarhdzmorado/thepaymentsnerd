# TODOS

## Design Debt

### ~~Create React Email templates for transactional emails~~ DONE
**Fixed:** Three new React Email templates (ConfirmSubscription, AlreadySubscribed, Welcome) replace raw inline HTML in subscribe and confirm routes. Shared render helper in `lib/transactionalEmails.ts`. Brand-consistent styling matching DailyNewsletter template.

### ~~Create DESIGN.md via /design-consultation~~ DONE
**Fixed:** Comprehensive DESIGN.md created as the single source of truth for the visual identity. Covers color palette (light/dark), typography (Archivo + Inter), spacing, border radius, shadows, card system, button variants, animations, email template tokens, accessibility, and decision log. Derived from existing `globals.css`, `tailwind.config.js`, `ui.tsx`, and `brand.md`.

### ~~Add prefers-reduced-motion support to globals.css~~ DONE
**Fixed:** `globals.css` already includes a `@media (prefers-reduced-motion: reduce)` rule that disables all animations and transitions.

## Security Hardening

### ~~Add rate limiting to /api/subscribe~~ DONE
**Fixed:** In-memory IP-based rate limiter: 5 requests per 15-minute window per IP. Returns 429 on excess. Resets on cold start (acceptable for serverless). Two new tests cover the limit and cross-IP independence.

### ~~Fix email enumeration via subscribe endpoint~~ DONE
**Fixed:** API now returns uniform response for all emails. Active subscribers receive a "you're already subscribed" email with their referral link. No `state` field in response. Frontend simplified to remove `already_active` handling.

### ~~Validate referralCode against subscribers table~~ DONE
**Fixed:** Subscribe route now validates `referralCode` against `subscribers.referral_code` before use. Rejects self-referral (referrer email !== subscriber email) and silently drops invalid/non-existent codes.

### ~~Guard remaining env var assertions in subscribe route~~ DONE
**Fixed:** All four env vars (`NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `SUBSCRIBE_TOKEN_SECRET`, `EMAIL_FROM`) are validated in a single guard with a diagnostic log showing which are missing.

## Editorial Voice

### ~~Strip formulaic language from story bodies~~ DONE
**Fixed:** Added BODY ANTI-PATTERNS block to writer prompt banning "operators" as generic noun, formulaic closers ("Expect rapid...", "will face pressure"), and hedge-pileups. Added bad example showing the pattern. Updated editor and revision prompts to flag violations.

### ~~Update weekly recap voice to match daily format~~ DONE
**Fixed:** Replaced prescriptive multi-sentence perspective with 1-sentence theme line format matching the daily newsletter. Updated writer prompt, JSON output spec, and editor quality checks.

## Accessibility

### Add ARIA live region wrapper to SubscribeForm feedback
**Priority:** P3
**Why:** Screen reader users may not be notified of subscribe success/error because focus stays on the submit button. The existing `role="status"` and `role="alert"` attributes are on conditionally rendered elements, so an always-present wrapper with `aria-live="polite"` would provide more reliable announcements.
**Where:** `web/components/SubscribeForm.tsx`

## Resilience

### Distinguish error vs empty in homepage data fetching
**Priority:** P2
**Why:** `getLatestNewsletter()` and `getNewsletterByDate()` in `web/app/page.tsx` return `null` for both "no data" and "fetch error." The empty state shows "We're brewing tomorrow's edition" which is misleading during Supabase outages. Should return `{ data, error }` and show a different UI for errors vs genuinely empty state.
**Where:** `web/app/page.tsx` data fetching functions + empty state rendering

## Database Hygiene

### ~~Add UNIQUE constraint on referral_code column~~ DONE
**Fixed:** `subscribers_referral_code_unique` constraint applied via Supabase migration. No duplicate codes existed at time of migration.
