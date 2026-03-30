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

### Add prefers-reduced-motion support to globals.css
**Why:** Animations (animate-fade-in-up, animate-scale-in, animate-shake) don't respect OS motion sensitivity settings. Accessibility requirement.
**Effort:** ~5 lines of CSS in globals.css
**Depends on:** Nothing

## Security Hardening

### Add rate limiting to /api/subscribe
**Why:** Public POST endpoint with no throttling. As subscriber base grows, this becomes a spam/abuse vector. Not a launch blocker but should be addressed before significant traffic.
**Effort:** ~2 hr human / ~15 min CC. Vercel Edge Middleware or IP-based throttle.
**Depends on:** Nothing

### ~~Fix email enumeration via subscribe endpoint~~ DONE
**Fixed:** API now returns uniform response for all emails. Active subscribers receive a "you're already subscribed" email with their referral link. No `state` field in response. Frontend simplified to remove `already_active` handling.

### Validate referralCode against subscribers table
**Why:** `referralCode` from user input is written to `referred_by` with zero validation. Allows self-referral, fake codes, and referral count inflation. Both Claude and Codex confirmed. One poisoned signup through a referral link can permanently steal attribution credit.
**Effort:** ~30 min human / ~10 min CC. Check that `referralCode` exists in `subscribers.referral_code` before using it, reject self-referral.
**Depends on:** Nothing

### Guard remaining env var assertions in subscribe route
**Why:** `SUBSCRIBE_TOKEN_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM` use `!` non-null assertions with no validation. If `SUBSCRIBE_TOKEN_SECRET` is missing, tokens are signed with the string "undefined", making them predictable and forgeable. SITE_URL already has a guard, the other three need the same pattern.
**Effort:** ~15 min human / ~5 min CC.
**Depends on:** Nothing

## Database Hygiene

### Add UNIQUE constraint on referral_code column
**Why:** nanoid at 8 chars has ~1 in 2.8 trillion collision odds, but a UNIQUE constraint is cheap insurance. Without it, a collision would silently corrupt referral attribution.
**Effort:** One Supabase migration. ~30 min human / ~5 min CC.
**Depends on:** Nothing
