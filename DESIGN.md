# Design System

Source of truth for /thepaymentsnerd visual identity. Every UI decision should trace back here.

## Brand

**Name:** /thepaymentsnerd (forward slash is part of the mark)
**Tagline:** "Five critical payments insights. Zero noise. Daily."
**Aesthetic:** Modern minimalist tech. Glassmorphism cards, subtle depth, clean typography. The site should feel like a well-made tool, not a marketing page.

## Color Palette

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fafaf9` (stone-50) | Page background, warm off-white |
| `--foreground` | `#0a0a0a` | Primary text, nearly black |
| `--muted-foreground` | `#475569` (slate-600) | Secondary text, timestamps, meta |
| `--card` | `rgba(255,255,255,0.85)` | Card backgrounds with blur |
| `--card-strong` | `rgba(255,255,255,0.95)` | Hero/featured card backgrounds |
| `--card-border` | `rgba(15,23,42,0.08)` | Subtle card borders |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0e1a` | Deep navy, OLED-friendly |
| `--foreground` | `#f5f5f4` (stone-100) | Primary text, warm light |
| `--muted-foreground` | `#94a3b8` (slate-400) | Secondary text |
| `--card` | `rgba(15,23,42,0.60)` | Card backgrounds |
| `--card-strong` | `rgba(15,23,42,0.85)` | Hero/featured cards |
| `--card-border` | `rgba(148,163,184,0.15)` | Card borders |

### Accent Colors

| Color | Value | Usage |
|-------|-------|-------|
| Blue | `#2563eb` (blue-600) | Primary interactive: links, CTAs, focus rings |
| Indigo | `#4f46e5` (indigo-600) | Gradient accents, secondary emphasis |
| Cyan | `#06b6d4` | Dark mode link alternative |
| Sky | `#0ea5e9` | Glow variety accent |
| Green | `#22c55e` | Success states |
| Amber | `#f59e0b` | Warning states |
| Red | `#ef4444` | Error states, destructive actions |

### Glow Effects

Radial gradient overlays for depth. Two gradients using `--glow-1` and `--glow-2` CSS custom properties (blue/indigo tones). Applied via `.glow-bg` class.

## Typography

### Fonts

| Font | Variable | Usage |
|------|----------|-------|
| **Archivo** | `--font-archivo` | Logo, headings, display text. Geometric, tech-forward. |
| **Inter** | `--font-inter` | Body text, UI elements, forms. Clean, readable. |

Both loaded via Next.js Font API with `display: swap`.

### Scale

| Level | Classes | When to use |
|-------|---------|-------------|
| Logo | `font-display text-2xl font-extrabold tracking-tighter` | Site mark only |
| Page heading | `font-display text-4xl font-black tracking-tighter` | One per page |
| Section heading | `text-xl font-semibold` | Major content sections |
| Card title | `text-lg font-semibold` | News items, feature cards |
| Body | `text-base font-sans` | Default content |
| Small/meta | `text-sm text-muted` | Timestamps, source labels, captions |
| Tiny | `text-xs` | Badges, labels, fine print |

## Spacing

Tailwind's default rem-based scale. Key patterns:

| Context | Pattern |
|---------|---------|
| Page container | `max-w-4xl mx-auto px-4 sm:px-8 lg:px-16` |
| Section vertical | `py-8 sm:py-12 lg:py-16` |
| Card padding | `p-4` to `p-6` |
| Input padding | `px-4 py-3.5` |
| Button padding (md) | `px-6 py-3` |
| Flex gaps | `gap-2` (tight), `gap-3` (comfortable), `gap-6` (sections) |
| Stacking items | `space-y-3` to `space-y-6` |

## Border Radius

| Element | Value |
|---------|-------|
| Cards (standard) | `rounded-lg` / `1rem` (16px) |
| Cards (hero/featured) | `rounded-[1.5rem]` / 24px |
| Buttons | `rounded-lg` |
| Inputs | `rounded-lg` |
| Badges/pills | `rounded-full` |
| Focus rings | `rounded` (4px) |

## Shadows

Layered shadows for realistic depth. Defined as CSS custom properties.

**Light:**
- Standard: `0 1px 3px rgba(0,0,0,0.05), 0 20px 45px rgba(2,6,23,0.08)`
- Strong: `0 4px 12px rgba(0,0,0,0.08), 0 30px 70px rgba(2,6,23,0.12)`

**Dark:**
- Standard: `0 2px 8px rgba(0,0,0,0.25), 0 18px 40px rgba(0,0,0,0.35)`
- Strong: `0 8px 24px rgba(0,0,0,0.35), 0 26px 70px rgba(0,0,0,0.45)`

## Components

### Cards

Two tiers defined in `globals.css`:

- **`.card-surface`** — Standard content cards. Backdrop blur 14px, standard shadow.
- **`.card-surface-strong`** — Hero sections, featured content. Stronger opacity, 16px blur, stronger shadow, 24px radius.

Both include semi-transparent backgrounds, subtle borders, and blur for glassmorphism.

### Buttons

Defined in `components/ui.tsx`. Four variants, three sizes.

| Variant | Light | Dark | Usage |
|---------|-------|------|-------|
| `primary` | Dark gradient bg, white text | Light gradient bg, dark text | Main CTAs |
| `secondary` | Bordered, filled slate-100 bg | Bordered, filled slate-800 bg | Secondary actions |
| `ghost` | Bordered slate-200, slate-100 bg, hover blue | Bordered slate-700, slate-800 bg, hover blue | Tertiary, navigation |
| `danger` | Red bg, white text | Red bg, white text | Destructive actions |

| Size | Padding | Font |
|------|---------|------|
| `sm` | `px-3 py-1.5` | `text-sm` |
| `md` | `px-6 py-3` | `text-sm` |
| `lg` | `px-8 py-3.5` | `text-base` |

All buttons: `inline-flex`, `gap-2`, `rounded-lg`, `font-semibold`, 300ms transitions. Focus: `ring-2 ring-blue-500 ring-offset-2`. Disabled: `opacity-50 cursor-not-allowed`.

### Inputs

Full-width, `rounded-lg`, `px-4 py-3.5`, `text-base`. Border: 2px slate-300 (light) / slate-600 (dark). Focus: `border-blue-500, ring-4 ring-blue-500/10`. Background: white / slate-800.

### Badges

Inline flex, `rounded-full`, small padding, subtle background. Used for dates, tags, status.

## Animation

### Keyframes

| Name | Duration | Effect | Usage |
|------|----------|--------|-------|
| `fade-in-up` | 0.6s | Opacity + translateY(20px) | Content entrance |
| `fade-in` | 0.5s | Opacity only | Subtle reveals |
| `scale-in` | 0.3s | Opacity + scale(0.95) | Modals, success states |
| `pulse-glow` | 8s | Opacity breathing | Background accents |
| `shake` | 0.4s | Horizontal ±4px | Error feedback |

### Stagger Pattern

Cascading entrances use delay classes: `.delay-100` through `.delay-400` in 50-100ms increments. Apply to siblings with `.animate-fade-in-up` for a waterfall effect.

### Reduced Motion

`@media (prefers-reduced-motion: reduce)` disables all animations and transitions globally. Always respected.

## Backgrounds

- **Grid pattern:** `.bg-grid-pattern` — 2rem repeating grid lines. Opacity set per-consumer (typically `opacity-35 dark:opacity-20`). Adds subtle texture without distraction.
- **Glow overlay:** `.glow-bg` — Radial gradients positioned at top. Blue/indigo tones. Creates depth behind hero content.

## Email Templates

Email templates in `web/emails/` use inline styles (required for email clients) but follow the same visual language:

| Token | Email Value | Web Equivalent |
|-------|-------------|----------------|
| Background | `#fafaf9` | `--background` |
| Text | `#0a0a0a`, `#404040` | `--foreground`, body text |
| Muted | `#737373` | `--muted-foreground` (lighter for email readability) |
| Accent | `#2563eb` | Blue-600 |
| Container | 600px max-width, white bg | `max-w-4xl`, card surface |
| Font | System font stack | Same as web fallback |
| Border radius | 8px (buttons only) | Simplified from web 16px; containers have no radius |
| Dividers | `1px solid #e5e5e5` | `--card-border` equivalent |

Logo text in emails: `/thepaymentsnerd` at 26px, weight 700, color `#0a0a0a`, letter-spacing -0.5px.

## Accessibility

- Focus-visible rings on all interactive elements: `2px solid rgba(99,102,241,0.6)` with 2px offset
- Color contrast: foreground/background passes WCAG AA in both modes
- `color-scheme: light dark` on html element for native form control theming
- Semantic HTML throughout (proper headings, labels, ARIA attributes)
- `prefers-reduced-motion` support
- Selection highlight: `rgba(59,130,246,0.25)`

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Glassmorphism cards | Modern depth without heavy borders. Distinctive but not trendy. |
| Archivo for display | Geometric sans-serif reads as "tech" without being cold. Pairs well with Inter. |
| Warm off-white (#fafaf9) | Easier on eyes than pure white. Stone tone adds personality. |
| OLED navy dark mode (#0a0e1a) | True dark saves battery on OLED. Navy tint prevents "void" feeling. |
| System font stack in emails | Email clients don't load web fonts. System stack ensures consistent rendering. |
| 16px border radius | Large enough to feel modern, small enough to not waste space on mobile. |
| 8s pulse-glow | Slow enough to be ambient, not distracting. Adds life to static pages. |

## File Reference

| File | What it defines |
|------|----------------|
| `web/app/globals.css` | CSS custom properties, card classes, animations, grid/glow utilities |
| `web/tailwind.config.js` | Font family extensions, dark mode strategy |
| `web/app/layout.tsx` | Font loading (Archivo, Inter), metadata |
| `web/components/ui.tsx` | Button, Input, Card, Badge component primitives |
| `docs/business-context/brand.md` | Brand colors, typography, identity summary |
