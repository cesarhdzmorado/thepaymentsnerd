# Design System

Source of truth for /thepaymentsnerd visual identity. Every UI decision should trace back here.

## Brand

**Name:** /thepaymentsnerd (forward slash is part of the mark, rendered in vermillion)
**Tagline:** "Five critical payments insights. Zero noise. Daily."
**Aesthetic:** Swiss minimal. Sharp corners, ink-on-paper contrast, one accent color, type-driven hierarchy. The site should feel like a well-designed broadsheet, not a SaaS landing page.

## Color Palette

### Swiss Tokens (Primary)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--paper` | `#FAFAF7` | `#0A0A0A` | Page background |
| `--paper-2` | `#F2F2EC` | `#151515` | Footer, alternate surfaces |
| `--ink` | `#0A0A0A` | `#FAFAF7` | Headlines, primary text |
| `--ink-2` | `#1A1A1A` | `#E5E5E0` | Body text, one tick lighter |
| `--ink-3` | `#444444` | `#C5C5BD` | Paragraph body |
| `--muted` | `#6E6E6E` | `#9A9A92` | Metadata, captions |
| `--muted-2` | `#9A9A92` | `#6E6E6E` | Placeholders, faint labels |
| `--rule` | `#E3E3DC` | `#262626` | Hairlines, borders |
| `--accent` | `#E5361C` | `#FF4826` | Vermillion. Single accent, use sparingly |
| `--accent-hover` | `#FF4826` | `#FF6240` | Accent on hover |

### Legacy Tokens (Other Pages)

These map to the Swiss tokens via `--background: var(--paper)` and `--foreground: var(--ink)`. They exist so non-home pages (legal, privacy, cookies, unsubscribe) keep working until ported.

| Token | Purpose |
|-------|---------|
| `--muted-foreground` | Secondary text for legacy pages |
| `--card` / `--card-strong` | Card backgrounds with blur |
| `--card-border` | Subtle card borders |
| `--glow-1/2/3` | Glow effects (legacy, not used on home) |

### Accent Usage Rules

- Vermillion (`--accent`) is the only accent color. No blue, indigo, or gradient accents on home.
- Use for: the `/` in the wordmark, the live dot, section dots, CTA hover states, error states, drop-cap first letter.
- Never use on large surfaces (backgrounds, full sections). The ink-band sections use `--ink` for background.

## Typography

### Fonts

| Font | Variable | Usage |
|------|----------|-------|
| **Inter** | `--font-inter` | Everything: body, headings, display, UI. Weight drives hierarchy. |
| **JetBrains Mono** | `--font-mono` | Labels, datelines, numerals, tags, kickers. Uppercase tracked. |

Both loaded via Next.js Font API with `display: swap`.

### Scale

| Level | Style | When to use |
|-------|-------|-------------|
| Display | `text-[96px] font-extrabold leading-[0.95] tracking-[-0.035em]` | Hero headline only |
| Section heading | `text-[56px] font-extrabold leading-[1.02] tracking-[-0.025em]` | Lead story title |
| Subsection | `text-[32px] font-extrabold` | Quick hits titles |
| Body | `text-[16px] leading-[1.7] text-[var(--ink-3)]` | Paragraph content |
| Label (mono) | `.label-mono` — 11px, 500 weight, 0.14em tracking, uppercase | Kickers, datelines, sources, tags |

### Label Mono Variants

```css
.label-mono           /* color: var(--muted) — default */
.label-mono--ink      /* color: var(--ink) */
.label-mono--accent   /* color: var(--accent) */
```

## Spacing

| Context | Pattern |
|---------|---------|
| Page container | `max-w-[1240px] mx-auto px-4 sm:px-8 lg:px-16` |
| Section vertical | `py-20 sm:py-24` to `py-24 sm:py-28 lg:py-32` |
| Section header | `mb-10 border-b-2 border-[var(--ink)] pb-4` |
| Input padding | `px-4 py-3.5` |
| Button padding (md) | `px-6 py-3` |

## Border Radius

| Element | Value |
|---------|-------|
| Everything | `rounded-[2px]` (sharp, Swiss) |
| Exceptions: focus rings, live dot | `rounded-full` |

Cards do not have visible border-radius. The Swiss system uses borders and rules instead of rounded containers.

## Components

### Buttons

Defined in `components/ui.tsx`. Four variants, three sizes. All use `rounded-[2px]`, `tracking-[0.02em]`, 150ms transitions.

| Variant | Style | Usage |
|---------|-------|-------|
| `primary` | `bg-[var(--ink)] text-[var(--paper)]`, hover: `bg-[var(--accent)]` | Main CTAs |
| `secondary` | `border border-[var(--ink)]`, hover: inverts to solid ink | Secondary actions |
| `ghost` | `border border-[var(--rule)]`, hover: accent border + text | Tertiary, navigation |
| `danger` | `bg-[var(--accent)]`, hover: `bg-[var(--accent-hover)]` | Destructive actions |

Focus: `ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]`.

### Inputs

`rounded-[2px]`, `border-[1.5px] border-[var(--ink)]`, `bg-[var(--paper)]`. Focus: `border-[var(--accent)]`. No ring/glow on focus — just border color change.

### Badges

`rounded-[2px]`, mono font, 10px, `tracking-[0.16em]`, uppercase. Border-based coloring (neutral, info, success).

### Section Headers

Ink dot + mono kicker + optional meta, separated by a 2px ink bottom border.

### Full-Bleed Ink Bands

Used for Curiosity and Tomorrow CTA sections. `bg-[var(--ink)] text-[var(--paper)]`. Subdued text uses `text-[var(--paper)] opacity-55` (theme-aware, works in both light and dark mode).

## Animation

### Scroll-Triggered Transitions (IntersectionObserver)

Content animates on scroll via `useInView` hook and `AnimateOnScroll` wrapper. All sections render SSR-visible (opacity 1) and transition in when they enter the viewport.

Timing constants in `web/lib/animationConfig.ts`:

| Token | Value | Purpose |
|-------|-------|---------|
| `SECTION_STAGGER_MS` | 120 | Delay between sibling sections |
| `HERO_STAGGER_MS` | 80 | Delay between hero child elements |
| `TRANSITION_DURATION_MS` | 600 | CSS transition duration |
| `VIEWPORT_THRESHOLD` | 0.15 | IntersectionObserver threshold |

### Live Dot

Pulsing vermillion dot (`.live-dot`) next to "LIVE · Today's Edition" eyebrow. 1.8s ease-in-out infinite animation. Disabled under `prefers-reduced-motion`.

### Drop Cap

First letter of lead story body: 3.5em, font-weight 800, vermillion color, floated left.

### Reduced Motion

`@media (prefers-reduced-motion: reduce)` disables all animations and transitions globally.

## Backgrounds

- **Paper:** Solid `var(--paper)` background. No grid pattern or glow overlays on the redesigned home.
- **Grid/Glow:** Legacy classes (`.bg-grid-pattern`, `.glow-bg`) still exist for other pages but are not used on home.

## Navigation

- **Top rule:** 3px `var(--ink)` top border
- **Bottom rule:** 1px `var(--rule)` hairline
- **Background:** `color-mix(in srgb, var(--paper) 92%, transparent)` with `backdrop-blur-md`
- **Layout:** 3-column grid — dateline left (desktop), brand center, CTA right
- **Scroll progress:** 1px vermillion bar along bottom edge

## Footer

- **Background:** `var(--paper-2)` with top `var(--rule)` border
- **Layout:** 4-column grid (brand + tagline, Read links, Company links, Legal links)
- **Bottom bar:** `label-mono` copyright + heart easter egg

## Email Templates

Email templates in `web/emails/` use inline styles (required for email clients). They follow the Swiss color scheme:

| Token | Email Value | Web Equivalent |
|-------|-------------|----------------|
| Background | `#fafaf9` | `--paper` |
| Text | `#0a0a0a`, `#404040` | `--ink`, body text |
| Muted | `#737373` | `--muted` |
| Accent | `#2563eb` | Blue-600 (emails still use blue, not vermillion) |
| Container | 600px max-width | `max-w-[1240px]` |
| Font | System font stack | Same as web fallback |

## Accessibility

- Skip-to-content link: visually hidden, appears on keyboard focus, jumps to `#main-content`
- Focus-visible rings on all interactive elements: `2px solid var(--accent)` with offset
- Color contrast: ink/paper passes WCAG AA in both modes
- Gradient text `@supports` fallback: non-WebKit browsers get solid color
- `color-scheme: light dark` on html element
- Semantic HTML, proper headings, labels, ARIA attributes
- `prefers-reduced-motion` support
- Archive pages show "Archive" eyebrow instead of "LIVE" indicator

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Swiss minimal over glassmorphism | Glassmorphism felt generic/AI-generated. Swiss puts content first. |
| Single accent (vermillion) | One color used sparingly creates stronger brand than a gradient palette. |
| Sharp corners (2px radius) | Swiss design language. Cards use borders/rules, not rounded containers. |
| Inter for everything | Weight-driven hierarchy (400-900) instead of two-font pairing. Simpler. |
| JetBrains Mono for labels | Tracked uppercase mono labels create a newspaper/editorial feel. |
| Ink-band full-bleed sections | Creates visual rhythm and breaks up the page without decorative elements. |
| `var(--paper)` + opacity for dark bands | Theme-aware: works correctly in both light and dark mode. |
| Drop cap on lead story | Editorial craft signal. Says "this is written by humans for humans." |

## File Reference

| File | What it defines |
|------|----------------|
| `web/app/globals.css` | CSS custom properties (Swiss tokens), label-mono, live-dot, drop-cap, swiss-subscribe |
| `web/app/layout.tsx` | Font loading (Inter, JetBrains Mono), skip-to-content, metadata |
| `web/components/ui.tsx` | Button, Input, Card, Badge component primitives |
| `web/components/AnimateOnScroll.tsx` | Scroll-triggered animation wrapper (IntersectionObserver) |
| `web/hooks/useInView.ts` | IntersectionObserver hook for viewport detection |
| `web/lib/animationConfig.ts` | Shared animation timing constants |
| `web/components/home/HeroAnimations.tsx` | Hero staggered entrance animation |
| `web/components/home/HomeSections.tsx` | All homepage section components |
| `web/components/NavigationBar.tsx` | Swiss masthead with scroll progress |
| `web/components/Footer.tsx` | 4-column Swiss footer |
