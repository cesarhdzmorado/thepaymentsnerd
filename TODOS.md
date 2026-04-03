# TODOS

## Design Debt

### Create React Email templates for transactional emails
**Why:** Confirmation and "already subscribed" emails use raw inline HTML. A React Email template would ensure brand consistency and make future email changes easier.
**Effort:** ~30 min CC
**Depends on:** Nothing

### Create DESIGN.md via /design-consultation
**Why:** No design system exists. Each new feature re-invents design decisions. Both outside voices (Codex + Claude) flagged brand isn't visible in UI components.
**Effort:** ~30 min interactive session with /design-consultation
**Depends on:** Nothing — can be done anytime

### ~~Add prefers-reduced-motion support to globals.css~~ DONE
**Fixed:** `globals.css` already includes a `@media (prefers-reduced-motion: reduce)` rule that disables all animations and transitions.

## Security Hardening

### Add rate limiting to /api/subscribe
**Why:** Public POST endpoint with no throttling. As subscriber base grows, this becomes a spam/abuse vector. Not a launch blocker but should be addressed before significant traffic.
**Effort:** ~2 hr human / ~15 min CC. Vercel Edge Middleware or IP-based throttle.
**Depends on:** Nothing

### ~~Fix email enumeration via subscribe endpoint~~ DONE
**Fixed:** API now returns uniform response for all emails. Active subscribers receive a "you're already subscribed" email with their referral link. No `state` field in response. Frontend simplified to remove `already_active` handling.

### ~~Validate referralCode against subscribers table~~ DONE
**Fixed:** Subscribe route now validates `referralCode` against `subscribers.referral_code` before use. Rejects self-referral (referrer email !== subscriber email) and silently drops invalid/non-existent codes.

### ~~Guard remaining env var assertions in subscribe route~~ DONE
**Fixed:** All four env vars (`NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `SUBSCRIBE_TOKEN_SECRET`, `EMAIL_FROM`) are validated in a single guard with a diagnostic log showing which are missing.

## Editorial Voice

### Strip formulaic language from story bodies
**Why:** Story bodies follow a rigid template: fact → "this raises/intensifies X for operators" → "operators with/without Y will face pressure" → "Expect rapid/accelerated Z." The word "operators" appears ~12 times per newsletter. Users report the text feels AI-generated.
**Effort:** ~15 min CC. Modify writer prompt anti-examples and body writing rules in `ai/src/main.py`.
**Depends on:** Ship the theme line change first and measure impact before stacking voice changes.

### Update weekly recap voice to match daily format
**Why:** `ai/src/weekly_recap.py` has the same prescriptive perspective template that was removed from the daily newsletter. Weekly recap will feel inconsistent if not updated.
**Effort:** ~10 min CC. Same pattern: replace perspective instructions with theme line instructions.
**Depends on:** Daily theme line change shipped and validated.

## Database Hygiene

### Add UNIQUE constraint on referral_code column
**Why:** nanoid at 8 chars has ~1 in 2.8 trillion collision odds, but a UNIQUE constraint is cheap insurance. Without it, a collision would silently corrupt referral attribution.
**Effort:** One Supabase migration. ~30 min human / ~5 min CC.
**Depends on:** Nothing
