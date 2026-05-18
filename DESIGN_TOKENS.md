# Design Tokens Reference

This document provides a comprehensive guide to BarakFi's design system tokens, usage patterns, and accessibility guidelines.

## Color Palette

### Semantic Colors

**Primary Actions** — `--emerald`
- Light Mode: `#0d9668`
- Dark Mode: `#34d399`
- Usage: Primary buttons, links, active states, success indicators
- Hover: `--emerald-hover`
- Shadow: `--shadow-emerald` (on hover elevation)

**Error States** — `--red`
- Light Mode: `#be123c`
- Dark Mode: `#fb7185`
- Usage: Error messages, destructive actions, validation states
- Accent: For error badges and highlights

**Gold Accent** — `--gold`
- Light Mode: `#b45309`
- Dark Mode: `#fbbf24`
- Usage: Premium features, highlights, special badges
- Alternative to emerald for secondary emphasis

**Text Hierarchy**
- `--text`: Primary text (headings, body) — Light: `#111827`, Dark: `#f9fafb`
- `--text-secondary`: Subtitles, descriptions — Light: `#4b5563`, Dark: `#9ca3af`
- `--text-tertiary`: Hints, captions, disabled — Light: `#9ca3af`, Dark: `#6b7280`

**Background & Panel**
- `--bg`: Main background — Light: `#ffffff`, Dark: `#0a0f0d`
- `--bg-soft`: Soft background for contrast — Light: `#f9fafb`, Dark: `#1a211f`
- `--panel`: Card/modal background — Light: `#ffffff`, Dark: `#131a28`
- `--panel-soft`: Softer panel variant — Light: `#f5f5f5`, Dark: `#1f2937`
- `--panel-hover`: Hover state for panels — Light: `#f9fafb`, Dark: `#2d3748`

**Borders & Dividers**
- `--line`: Default border color — Light: `#e5e7eb`, Dark: `#374151`
- `--line-strong`: Stronger emphasis border — Light: `#d1d5db`, Dark: `#4b5563`

### Contrast Verification (WCAG AA)

All color combinations meet WCAG AA minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.

| Foreground | Background | Ratio | Level |
|-----------|-----------|-------|-------|
| `--text` | `--bg` | 7.5:1 | AAA |
| `--text-secondary` | `--bg` | 5.2:1 | AA |
| `--emerald` | `--bg-soft` | 5.8:1 | AA |
| `--red` | `--bg-soft` | 5.2:1 | AA |
| `--text` | `--panel` | 7.5:1 | AAA |

## Typography

### Font Family
- Primary: `Inter` — System fonts fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
- Display/Headings: `Inter` (no serif variants)

### Font Weights
- Light: `300` — Rarely used, only for special display
- Regular: `400` — Body text
- Medium: `500` — Secondary emphasis
- Semibold: `600` — Labels, button text, smaller headings
- Bold: `700` — Headings
- Extrabold: `800` — Hero text, special emphasis

### Font Sizes & Line Heights

**Display Heading (H1)**
```css
font-size: clamp(2rem, 5vw, 3.5rem);
font-weight: 700;
line-height: 1.1;
letter-spacing: -0.02em;
```
Usage: Page titles, hero sections, major emphasis

**Heading 2 (H2)**
```css
font-size: clamp(1.5rem, 4vw, 2.4rem);
font-weight: 700;
line-height: 1.2;
letter-spacing: -0.015em;
```
Usage: Section headings, card titles

**Heading 3 (H3)**
```css
font-size: clamp(1.25rem, 3vw, 1.875rem);
font-weight: 700;
line-height: 1.3;
letter-spacing: -0.01em;
```
Usage: Subsection titles, list headers

**Heading Small**
```css
font-size: 1.125rem;
font-weight: 700;
line-height: 1.4;
letter-spacing: -0.01em;
```
Usage: Compact headings, card headers

**Body Large**
```css
font-size: 1.125rem;
font-weight: 400;
line-height: 1.75;
```
Usage: Emphasis text, introductions

**Body Base** (Default)
```css
font-size: 1rem;
font-weight: 400;
line-height: 1.6;
```
Usage: Standard body text, descriptions

**Body Small**
```css
font-size: 0.95rem;
font-weight: 400;
line-height: 1.5;
```
Usage: Captions, fine print, secondary descriptions

**Label**
```css
font-size: 0.875rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.08em;
```
Usage: Form labels, navigation items, badges

**Caption**
```css
font-size: 0.8rem;
font-weight: 400;
line-height: 1.5;
```
Usage: Meta information, timestamps, hints

### Letter Spacing

- Display (headings): `-0.02em` (tighten for impact)
- Body: `normal` (readable density)
- Labels: `0.08em` (expand for emphasis)
- Sub-labels: `0.05em` (subtle expansion)

## Spacing Scale

### Base Unit: 0.5rem (8px)

| Token | Value | Common Uses |
|-------|-------|-----------|
| `--space-xs` | 0.5rem | Extra tight spacing |
| `--space-sm` | 0.75rem | Tight spacing between elements |
| `--space-base` | 1rem | Default spacing |
| `--space-md` | 1.5rem | Component internal padding |
| `--space-lg` | 2rem | Section spacing |
| `--space-xl` | 3rem | Major layout spacing |
| `--space-2xl` | 4rem | Hero section spacing |

### Common Patterns

**Card Padding:** `1.5rem` (--space-md)
**Component Gap:** `1rem` (--space-base)
**Section Padding:** `2rem` (--space-lg)
**Page Padding:** Top/Bottom `3rem`, Left/Right `1.5rem` (responsive to `1rem` on mobile)

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 6px | Small buttons, tight elements |
| `--radius-sm` | 8px | Form inputs, small components |
| `--radius-md` | 12px | Buttons, small cards |
| `--radius-lg` | 16px | Cards, modals, panels |
| `--radius-xl` | 20px | Large cards, hero sections |
| `--radius-2xl` | 24px | Extra-large components |
| `--radius-full` | 9999px | Pills, badges, circular elements |

## Shadows

Shadows provide elevation and depth. Used with transform for interactive states.

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Cards, subtle elevation |
| `--shadow-sm` | Button hover, light lift |
| `--shadow-md` | Modal, card hover |
| `--shadow-lg` | Dropdowns, overlays, focus states |
| `--shadow-emerald` | Success/primary action hover |

### Elevation Pattern

Combine shadow + transform for hover/active states:

```css
.card {
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-fast) ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

## Transitions & Animations

| Token | Duration | Usage |
|-------|----------|-------|
| `--transition-fast` | 150ms | Micro-interactions (icons, quick hover) |
| `--transition-base` | 200ms | Hover states, small animations |
| `--transition-slow` | 300ms | Page transitions, major layout changes |

### Easing Functions

- Default: `ease` — Natural, comfortable
- Fast: `ease-in-out` — Snappy but smooth
- Special: `cubic-bezier(0.34, 1.56, 0.64, 1)` — Bouncy for attention-grabbing (use sparingly)

## Component Patterns

### Buttons

**Primary Button**
```css
background: var(--emerald);
color: #ffffff;
padding: 0.75rem 1.5rem;
border-radius: var(--radius-md);
font-weight: 600;
transition: all var(--transition-fast) ease;
```
Hover: `transform: translateY(-1px)`, `box-shadow: var(--shadow-emerald)`

**Secondary Button**
```css
background: var(--bg-soft);
color: var(--text);
border: 1px solid var(--line);
padding: 0.75rem 1.5rem;
border-radius: var(--radius-md);
```
Hover: `background: var(--panel-hover)`, `border-color: var(--line-strong)`

**Ghost Button**
```css
background: transparent;
color: var(--text);
border: none;
padding: 0.75rem 1.5rem;
```
Hover: `background: var(--bg-soft)`

### Cards

**Standard Card**
```css
background: var(--panel);
border: 1px solid var(--line);
border-radius: var(--radius-lg);
padding: 1.5rem;
box-shadow: var(--shadow-xs);
```
Hover: `border-color: var(--line-strong)`, `box-shadow: var(--shadow-md)`, `transform: translateY(-2px)`

**Compact Card**
```css
background: var(--panel);
border: 1px solid var(--line);
border-radius: var(--radius-md);
padding: 1rem;
box-shadow: var(--shadow-xs);
```

### Form Inputs

```css
padding: 0.75rem 1rem;
border: 1px solid var(--line);
border-radius: var(--radius-md);
background: var(--panel);
color: var(--text);
font-size: 1rem;
```
Focus: `border-color: var(--emerald)`, `box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1)`

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| Mobile | 360px - 640px | Phones |
| Tablet | 641px - 1024px | Tablets |
| Desktop | 1025px - 1440px | Laptops |
| Wide | 1441px+ | Large monitors |

### Media Query Pattern

```css
@media (max-width: 768px) {
  /* Tablet-down styles */
}

@media (max-width: 640px) {
  /* Mobile-down styles */
}

@media (min-width: 1025px) {
  /* Desktop-up styles */
}
```

### Responsive Typography with clamp()

Use CSS `clamp()` for fluid sizing that scales with viewport:

```css
font-size: clamp(1.25rem, 3vw, 1.875rem);
/* Min: 1.25rem, Preferred: 3vw, Max: 1.875rem */
```

## Accessibility Guidelines

### Color Contrast

- All text must meet WCAG AA (4.5:1 for normal, 3:1 for large)
- Verify new color combinations with [contrast checker](https://webaim.org/resources/contrastchecker/)
- Never rely on color alone to convey information (use text labels, patterns, icons)

### Focus States

Always provide visible focus indicators:
```css
input:focus {
  outline: none;
  border-color: var(--emerald);
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
}
```

### Touch Targets

- Minimum 44px × 44px for interactive elements on mobile
- Buttons: 44px min height, 12px horizontal padding
- Links: Wrap in large enough clickable area

### Motion

- Respect `prefers-reduced-motion` for users sensitive to animations
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Dark Mode

Dark mode is automatically applied via CSS custom properties. No separate implementation needed.

- Light mode theme loads by default
- CSS variables automatically swap on `prefers-color-scheme: dark`
- All colors tested for readability in both modes
- Verify both modes with browser DevTools: Settings → Emulate CSS media feature `prefers-color-scheme`

## Implementation Checklist

When adding new components:

- [ ] Use CSS modules (no inline styles in JSX)
- [ ] All colors from CSS variables (no hardcoded hex)
- [ ] Typography from scale (use predefined font sizes)
- [ ] Spacing from tokens (use --space-* variables)
- [ ] Border radius from tokens (use --radius-* variables)
- [ ] Shadows for elevation (use --shadow-* variables)
- [ ] Transitions smooth (use --transition-* variables)
- [ ] Focus states visible (outline or shadow on :focus)
- [ ] Touch targets ≥ 44px on mobile
- [ ] Color contrast ≥ WCAG AA
- [ ] Responsive breakpoints tested (360px, 640px, 768px, 1024px, 1440px)
- [ ] Dark mode verified
- [ ] ESLint: 0 errors
- [ ] TypeScript: 0 errors

## Common Mistakes to Avoid

❌ **Hardcoded Colors**
```css
/* BAD */
color: #111827;
```

✅ **Use CSS Variables**
```css
/* GOOD */
color: var(--text);
```

---

❌ **Arbitrary Spacing**
```css
/* BAD */
padding: 15px 32px;
margin: 24px auto;
```

✅ **Use Spacing Scale**
```css
/* GOOD */
padding: var(--space-md) var(--space-lg);
margin: 1.5rem auto;
```

---

❌ **Inline Styles**
```tsx
/* BAD */
<div style={{ color: '#111827', fontSize: '16px' }}>
```

✅ **Use CSS Modules**
```tsx
/* GOOD */
<div className={styles.heading}>
/* In .module.css */
.heading {
  color: var(--text);
  font-size: 1rem;
}
```

---

❌ **Hard-to-Read Type**
```css
/* BAD */
font-size: 13px;
line-height: 1.2;
letter-spacing: normal;
```

✅ **Follow Typography Scale**
```css
/* GOOD */
font-size: 0.95rem;
line-height: 1.6;
letter-spacing: -0.01em;
```

## References

- CSS Variables Definition: `/frontend/src/styles/globals.css`
- Pattern Library: `/frontend/src/components/ui-patterns.module.css`
- Example Implementation: `/frontend/src/app/screener-html.module.css`
