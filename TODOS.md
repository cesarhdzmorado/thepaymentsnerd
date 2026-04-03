# TODOS

## Design Debt

### ~~Create React Email templates for transactional emails~~ DONE
**Fixed:** Three new React Email templates (ConfirmSubscription, AlreadySubscribed, Welcome) replace raw inline HTML in subscribe and confirm routes. Shared render helper in `lib/transactionalEmails.ts`. Brand-consistent styling matching DailyNewsletter template.

### Create DESIGN.md via /design-consultation
**Why:** No design system exists. Each new feature re-invents design decisions. Both outside voices (Codex + Claude) flagged brand isn't visible in UI components.
**Effort:** ~30 min interactive session with /design-consultation
**Depends on:** Nothing — can be done anytime

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

## Database Hygiene

### ~~Add UNIQUE constraint on referral_code column~~ DONE
**Fixed:** `subscribers_referral_code_unique` constraint applied via Supabase migration. No duplicate codes existed at time of migration.
