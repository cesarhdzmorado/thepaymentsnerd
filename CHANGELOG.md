# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4.0] - 2026-04-24

### Added
- Archive index at `/archive` — every prior issue grouped by month, links to the day view. Reachable from the footer alongside "Latest issue" and "Subscribe".

### Fixed
- Inter now actually renders on every page. The `@theme` block was missing `--font-sans`, so every heading and body text silently fell back to the system sans stack. Headings across home, archive, privacy, legal, and cookies now render in Inter as the design system intended.
- Legal, privacy, and cookies pages had two `<h1>` tags (brand mark wrapped in `<h1>` plus the page title). Screen readers saw two page titles. The brand is now a `<span>`; each page has exactly one `<h1>`.
- Nav "Subscribe →" link on mobile was a 32px-tall tap target. Bumped to 44px on mobile only (desktop pill stays the same size). Main's `pt` adjusted so content doesn't slip under the taller nav.
- Legal pages shed the pre-Swiss glassmorphism (grid pattern, glow backgrounds, card surface). They now share the Swiss masthead and footer with the homepage, with `prose-legal` tokens (`--ink`, `--ink-3`, `--muted`, `--rule`, `--accent`) replacing hardcoded blue links and `--muted-foreground`. Legal links now preserve visited vs unvisited distinction.

### Changed
- "Share:" label, referral share block inside the subscribe success state, and the scroll-to-top arrow all used Tailwind slate/blue/indigo utilities outside the Swiss palette. Now wired to Swiss tokens (`--muted`, `--ink`, `--ink-3`, `--paper-2`, `--rule`).
- "What's Hot" type tags (Fundraising / Product / Expansion / M&A) previously mixed `--accent` with emerald/amber/violet Tailwind defaults. All four tags now render in `--ink`; the label text carries the category, color stays inside the Swiss one-accent rule.
- Archive query now caps at 500 issues (`.limit(500)`) instead of an unbounded scan. Two years of weekday issues fit inside that cap.

## [0.1.3.0] - 2026-04-19

### Changed
- Swiss minimal redesign: new CSS token system (paper/ink/rule/accent) replaces the blue-indigo gradient palette
- Typography swap: JetBrains Mono for labels and datelines, Inter weight-driven hierarchy instead of Archivo headings
- Navigation bar: centered brand wordmark, issue dateline, vermillion scroll progress bar, 3px ink top rule
- Footer: 4-column grid layout with read/company/legal sections, warm paper-2 background
- Homepage hero: oversized headline at display scale, live-dot pulsing indicator, drop-cap lead story
- Full-bleed ink-band sections for Curiosity and Tomorrow CTA with proper dark mode contrast
- All buttons and inputs use sharp 2px corners and ink/accent color scheme
- Archive pages now show "Archive" eyebrow instead of "LIVE" and hide the Tomorrow CTA section

### Fixed
- Dark mode contrast in CTA band and Curiosity section (hardcoded rgba colors replaced with theme-aware tokens)
- Nav border shorthand collision (bottom border was rendering ink color instead of rule)
- Scroll progress bar CSS conflict (w-full overriding inline width)
- Unknown whats_hot types no longer render "undefined" (fallback to raw type string)
- Stats strip subscriber count now respects the >10 threshold guard
- Misleading "Weekly recap" footer link renamed to "Subscribe"

## [0.1.2.0] - 2026-04-04

### Added
- Skip-to-content keyboard navigation link for screen readers and keyboard users
- Gradient text contrast fallback for non-WebKit browsers via `@supports` query
- Scroll-triggered animations using IntersectionObserver, replacing the old CSS-only approach that left the page blank for over a second on load
- Bottom subscribe CTA section after newsletter content
- Warm empty state with subscribe form when no newsletter is available
- 17 new tests covering animation logic, hero stagger behavior, and regression guards

### Changed
- Homepage content now loads visible immediately (SSR-safe), animates on scroll instead of all-at-once on page load
- Hero section compacted on mobile: smaller logo, tighter spacing, share buttons hidden below `sm` breakpoint
- SubscribeForm accepts `idPrefix` prop to prevent duplicate HTML IDs when rendered multiple times

### Removed
- Colored gradient left-border from lead story card (AI slop pattern)
- `animate-fade-in-up` CSS class and `@keyframes fade-in-up` (replaced by JS-controlled transitions)
- Staggered animation delay utility classes (`.delay-100` through `.delay-400`)

## [0.1.1.1] - 2026-04-03

### Added
- DESIGN.md as single source of truth for the visual identity and design system — covers color palette (light/dark), typography (Archivo + Inter), spacing, border radius, shadows, card system, button variants, animations, email template tokens, accessibility, and decision log

### Changed
- All design debt TODO items now marked complete

## [0.1.1.0] - 2026-04-03

### Added
- Three React Email templates (ConfirmSubscription, AlreadySubscribed, Welcome) replacing raw inline HTML in transactional emails
- Shared render helper in `lib/transactionalEmails.ts` for consistent email generation
- Full test suite for `/api/confirm` route (8 tests covering token validation, activation, duplicate prevention, referral URLs)
- Environment variable validation guard on `/api/confirm` route, matching existing subscribe route pattern

### Changed
- Subscribe and confirm routes now use branded React Email templates instead of inline HTML strings
- All transactional emails now match DailyNewsletter brand styling (colors, fonts, layout)

## [0.1.0.0] - 2026-04-03

### Added
- IP-based rate limiting on `/api/subscribe`: 5 requests per 15-minute window per IP, returns 429 on excess
- Two new test cases covering rate limit enforcement and cross-IP independence

### Changed
- Weekly recap perspective format now uses 1-sentence theme line (max 25 words) matching daily newsletter voice
- Writer and editor prompts in weekly recap pipeline updated for consistency
