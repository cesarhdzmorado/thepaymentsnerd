# TODOS

## Design Debt

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

## Database Hygiene

### Add UNIQUE constraint on referral_code column
**Why:** nanoid at 8 chars has ~1 in 2.8 trillion collision odds, but a UNIQUE constraint is cheap insurance. Without it, a collision would silently corrupt referral attribution.
**Effort:** One Supabase migration. ~30 min human / ~5 min CC.
**Depends on:** Nothing
