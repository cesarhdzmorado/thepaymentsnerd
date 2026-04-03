# Changelog

All notable changes to this project will be documented in this file.

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
