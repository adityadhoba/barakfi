# UI Migration v2 Completion Checklist

This document tracks progress through the full-stack UI migration to design system v2.

## Overview

- **Total Pages:** 10
- **High-Priority:** 3 (compare, super-investors, academy)
- **Medium-Priority:** 4 (tools, explore, collections, error states)
- **Low-Priority:** 3 (account page audit, token alignment, responsive testing)

## Phase 1: Infrastructure ✅ COMPLETE

Setup and create reusable utilities for design system.

- [x] Create `ui-patterns.module.css` with reusable CSS patterns
  - [x] Typography patterns (h1-h3, body, label, caption)
  - [x] Card patterns (standard, compact, interactive)
  - [x] Button patterns (primary, secondary, ghost, sizes)
  - [x] Badge patterns (success, error, warning, info, muted)
  - [x] Layout patterns (container, grid, flex utilities)
  - [x] Input patterns
  - [x] Link patterns
  - [x] Divider patterns
  - [x] Responsive utilities
- [x] Create `DESIGN_TOKENS.md` documentation
  - [x] Color palette with contrast verification
  - [x] Typography scale and usage
  - [x] Spacing scale
  - [x] Border radius tokens
  - [x] Shadows and elevation
  - [x] Transitions and animations
  - [x] Component patterns
  - [x] Responsive breakpoints
  - [x] Accessibility guidelines
  - [x] Dark mode notes
- [x] Create `COMPONENT_CHECKLIST.md` (this file)
- [x] Create `error-state.tsx` component
  - [x] Icon + message + CTA layout
  - [x] Reusable across all error boundaries (NotFoundState, AccessDeniedState, ServerErrorState)
  - [x] CSS module with design system styles
  - [x] Animations (gentle bounce)
  - [x] Responsive design
- [x] Create `skeleton-loader.tsx` component
  - [x] Shimmer animation using CSS variables
  - [x] Pulse animation alternative
  - [x] Configurable for different content shapes (rect, circle, text)
  - [x] Specialized loaders (SkeletonCard, SkeletonTable, SkeletonAvatar, SkeletonHeading, SkeletonParagraph)
  - [x] CSS module with design system styles
  - [x] Responsive grid layout

**Status:** 100% complete (4/4 subtasks) ✅
**Build Status:** 0 TypeScript errors, 0 ESLint errors ✅

---

## Phase 2: High-Impact Public Pages

Redesign core public pages from old UI to design system v2.

### 2.1 Compare Page (`/compare`) — CRITICAL PREREQUISITE ✅

**Status:** COMPLETE
- [x] Part 5.0 implementation complete
- [x] Remove auth redirect (allow guests to see page)
- [x] Add market ticker ribbon (NIFTY indices)
- [x] Add navigation bar (logo, links, auth state)
- [x] Conditional rendering (gating for guests, full interface for authenticated)
- [x] Gating hero message: "Compare Stocks Side by Side"
- [x] Sign In / Create Account buttons
- [x] CSS using screenerStyles for consistency
- [x] Responsive design
- [x] Build succeeds with 0 TypeScript errors
- [x] Page loads at localhost:3000/compare

**PR Ready:** Yes — Can be merged to main

---

### 2.2 Super-Investors Detail Page (`/super-investors/[slug]`)

Redesign investor profile page with design system tokens.

**Current State:** Has CSS module but with inline styles
**Target:** Remove all inline styles, use CSS variables, responsive design

**Subtasks:**
- [ ] Audit current implementation for inline styles
- [ ] Create/update `super-investors-detail.module.css`
  - [ ] Investor header card (name, firm, title, bio)
  - [ ] Holdings table/grid (symbol, sector, price, weight %)
  - [ ] Portfolio stats (top holding, concentration, sector breakdown)
  - [ ] Hover states with elevation
  - [ ] Mobile responsive (1-column at 768px)
- [ ] Remove inline styles from `/super-investors/[slug]/page.tsx`
- [ ] Apply design system typography scale
- [ ] Apply design system colors (no hardcoded hex)
- [ ] Apply design system spacing
- [ ] Add skeleton loader for profile loading
- [ ] Test responsive: 1920px, 1024px, 768px, 375px
- [ ] Verify dark mode works (CSS variables)
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors
- [ ] Visual review: Design matches system

**Success Criteria:**
- ✅ 0 inline styles in JSX
- ✅ 0 hardcoded colors (all use CSS variables)
- ✅ Responsive at 5 breakpoints
- ✅ Dark mode works automatically
- ✅ Lighthouse score >90
- ✅ No backend API changes

**Estimated Effort:** 2-3 hours

---

### 2.3 Academy Article Page (`/academy/[slug]`)

Redesign educational article page from old UI to design system.

**Current State:** 40+ inline styles, no design tokens
**Target:** CSS modules, design system tokens, article-specific styling

**Subtasks:**
- [ ] Audit current implementation (count inline style lines)
- [ ] Create `academy-article.module.css` (NEW)
  - [ ] Article header (title, byline, date, reading time)
  - [ ] Body text styling (paragraphs, lists, blockquotes)
  - [ ] Code blocks (dark background, syntax highlight colors)
  - [ ] Links (emerald color, hover underline)
  - [ ] Tables (header styling, borders, padding)
  - [ ] Breadcrumb navigation
  - [ ] Table of contents sidebar
  - [ ] Related articles section
  - [ ] Mobile responsive (single column at 768px)
- [ ] Remove 40+ inline style lines from JSX
- [ ] Apply design system typography scale (especially body large/base)
- [ ] Apply design system colors (emerald for links, text hierarchy)
- [ ] Apply design system spacing (clamp() for responsive padding)
- [ ] Create code block syntax highlighting with design tokens
- [ ] Add skeleton loader for content loading
- [ ] Test responsive: 1920px, 1024px, 768px, 375px
- [ ] Verify dark mode works (code blocks, blockquotes)
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors
- [ ] Link color contrast verification (WCAG AA)

**Success Criteria:**
- ✅ 0 inline styles (all moved to CSS module)
- ✅ 0 hardcoded colors
- ✅ Code blocks readable in both light/dark mode
- ✅ Typography scale applied throughout
- ✅ Responsive at 5 breakpoints
- ✅ Dark mode works with automatic CSS variable switching
- ✅ Lighthouse score >90
- ✅ Link contrast meets WCAG AA

**Estimated Effort:** 3-4 hours

---

## Phase 3: Token Alignment

Audit pages already using CSS modules for token consistency.

### 3.1 Tools Page (`/tools`)

**Current State:** Has CSS module but with isolated color theme (#091410, #e6e2d8, #7ec8a0)
**Target:** Align to design system tokens

**Subtasks:**
- [ ] Audit `tools.module.css` color usage
- [ ] Map isolated colors to design system tokens
  - [ ] #091410 (dark bg) → `--bg` or `--panel`
  - [ ] #e6e2d8 (text) → `--text` or `--text-secondary`
  - [ ] #7ec8a0 (gold) → `--emerald`
- [ ] Update `tools.module.css` to use CSS variables
- [ ] Test all tools functionality after token update
- [ ] Verify color contrast still meets WCAG AA
- [ ] Dark mode compatibility check
- [ ] Screenshot comparison (before/after visual check)

**Success Criteria:**
- ✅ All colors use CSS variables
- ✅ 0 hardcoded hex codes
- ✅ Color contrast maintained ≥ WCAG AA
- ✅ All tools functionality works
- ✅ Dark mode displays correctly

**Estimated Effort:** 1-2 hours

---

### 3.2 Explore Page (`/explore`)

**Current State:** Uses CSS modules with design tokens
**Target:** Consistency audit and verification

**Subtasks:**
- [ ] Audit color usage (verify all CSS variables)
- [ ] Audit spacing usage (verify all token values)
- [ ] Audit typography (verify clamp() fluid sizing)
- [ ] Audit shadows and elevation (verify consistent patterns)
- [ ] Verify dark mode works automatically
- [ ] No changes needed if all checks pass

**Success Criteria:**
- ✅ 100% CSS variable usage (0 hardcoded colors)
- ✅ All spacing from tokens
- ✅ Typography scale consistent
- ✅ Dark mode verified working

**Estimated Effort:** 30 minutes - 1 hour

---

### 3.3 Collections Page (`/collections/[slug]`)

**Current State:** Uses CSS modules with design tokens
**Target:** Consistency audit and verification

**Subtasks:**
- [ ] Same audit as Explore page
- [ ] Verify responsive design at breakpoints
- [ ] Check dark mode compatibility

**Success Criteria:** Same as Explore page

**Estimated Effort:** 30 minutes - 1 hour

---

## Phase 4: Error & Loading States

Create reusable components for error boundaries and skeleton loaders.

### 4.1 Error State Component

**File:** `/frontend/src/components/error-state.tsx` (NEW)

```typescript
interface ErrorStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  primaryButton?: boolean;
}
```

**Subtasks:**
- [ ] Create component with props for customization
- [ ] Design error layout (icon + title + description + CTA)
- [ ] Use design system patterns
- [ ] Add hover effects for button
- [ ] Export from components/index.ts
- [ ] Add to Storybook (if exists)

**Usage Examples:**
- `/compare/error` page
- API error boundaries
- 404 pages
- Access denied pages

**Estimated Effort:** 1 hour

---

### 4.2 Skeleton Loader Component

**File:** `/frontend/src/components/skeleton-loader.tsx` (NEW)

```typescript
interface SkeletonProps {
  height?: string;
  width?: string;
  shape?: 'rect' | 'circle' | 'text';
  count?: number;
  animation?: 'pulse' | 'shimmer';
}
```

**Subtasks:**
- [ ] Create component with shape variants
- [ ] Implement shimmer animation using CSS variables
- [ ] Create `.module.css` with animation keyframes
- [ ] Support count prop for multi-skeleton layouts
- [ ] Export from components/index.ts

**Usage Examples:**
- Super-investors profile loading
- Academy article loading
- Collections list loading
- Any async data fetch

**Estimated Effort:** 1.5 hours

---

## Phase 5: Responsive Testing & Polish

Comprehensive testing across devices and responsive breakpoints.

### 5.1 Responsive Design Verification

**Test at Breakpoints:**
- [ ] 1920px (desktop/large monitor)
- [ ] 1200px (laptop/desktop)
- [ ] 1024px (tablet landscape)
- [ ] 768px (tablet/mobile landscape)
- [ ] 640px (mobile portrait)
- [ ] 375px (small mobile)
- [ ] 360px (very small mobile)

**For Each Page:**
- [ ] Compare: Ticker, nav, gating/interface layout
- [ ] Super-investors: Header, holdings table/grid, sidebar
- [ ] Academy: Article width, code blocks, sidebar TOC
- [ ] Tools/Explore/Collections: Grid layout, card sizing

**Subtasks:**
- [ ] Test compare page at all breakpoints
- [ ] Test super-investors page at all breakpoints
- [ ] Test academy article page at all breakpoints
- [ ] Test tools page at all breakpoints
- [ ] Test explore page at all breakpoints
- [ ] Test collections page at all breakpoints
- [ ] Screenshot each at 3 key breakpoints (375px, 768px, 1920px)
- [ ] Compare with design reference images

**Success Criteria:**
- ✅ No horizontal scrolling at any breakpoint
- ✅ Text readable (font size ≥ 16px on mobile)
- ✅ Touch targets ≥ 44px on mobile
- ✅ Images scale correctly
- ✅ Layout reflows smoothly at breakpoints
- ✅ No overlapping elements

**Estimated Effort:** 2-3 hours

---

### 5.2 Dark Mode Verification

**Test in both modes:**
- [ ] Light mode: All pages readable, good contrast
- [ ] Dark mode: All pages readable, good contrast
- [ ] Code blocks: Readable in both modes
- [ ] Images: Visible in both modes
- [ ] Links: Color visible in both modes

**Testing Tool:**
```
DevTools → Settings → Emulate CSS media feature `prefers-color-scheme`
→ Select dark / light
```

**For Each Page:**
- [ ] Compare: Ticker, nav colors correct
- [ ] Super-investors: Card/table colors correct
- [ ] Academy: Code blocks, blockquotes readable
- [ ] Tools/Explore/Collections: Panel colors, text contrast

**Success Criteria:**
- ✅ All pages readable in both light and dark mode
- ✅ Text contrast ≥ WCAG AA in both modes
- ✅ No hardcoded colors (all use CSS variables)
- ✅ Automatic switching works (no manual toggle needed)

**Estimated Effort:** 1 hour

---

### 5.3 Accessibility Testing

**Keyboard Navigation:**
- [ ] Tab key works through all interactive elements
- [ ] Buttons/links are focusable
- [ ] Focus indicators visible
- [ ] No keyboard traps

**Screen Reader (VoiceOver on Mac / NVDA on Windows):**
- [ ] All text content read correctly
- [ ] Images have alt text
- [ ] Links describe destination
- [ ] Buttons announce purpose
- [ ] Headings properly structured (h1 → h2 → h3)

**Color Contrast (using WebAIM Contrast Checker):**
- [ ] All text ≥ 4.5:1 (normal) or 3:1 (large)
- [ ] Links sufficient contrast
- [ ] Buttons sufficient contrast
- [ ] Code blocks readable

**Subtasks:**
- [ ] Test compare page accessibility
- [ ] Test super-investors page accessibility
- [ ] Test academy page accessibility
- [ ] Test tools/explore/collections accessibility

**Success Criteria:**
- ✅ Keyboard accessible (no mouse required)
- ✅ Screen reader compatible
- ✅ Color contrast WCAG AA minimum
- ✅ Focus indicators visible
- ✅ No keyboard traps

**Estimated Effort:** 2 hours

---

## Phase 6: Performance & Build Validation

Final verification before merge.

### 6.1 Build & TypeScript

- [ ] Run `npm run build` in /frontend
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] Build completes in <2 minutes
- [ ] No warnings in console

### 6.2 Lighthouse Audit

**For each page, run Lighthouse and verify:**
- [ ] Performance >90
- [ ] Accessibility >90
- [ ] Best Practices >90
- [ ] SEO >90
- [ ] CLS (Cumulative Layout Shift) <0.1

**Subtasks:**
- [ ] Audit compare page
- [ ] Audit super-investors page
- [ ] Audit academy page
- [ ] Audit tools page
- [ ] Audit explore page
- [ ] Audit collections page

### 6.3 Browser Compatibility

**Test on:**
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] iOS Safari (iPhone)
- [ ] Chrome Mobile (Android)

**Verify:**
- [ ] All styles render correctly
- [ ] Fonts load properly
- [ ] Animations smooth
- [ ] No console errors

**Estimated Effort:** 1.5 hours

---

## Phase 7: Code Review & Merge

Final approval and integration.

- [ ] Self-review: All files check against DESIGN_TOKENS.md
- [ ] Create PR with description of changes
- [ ] Link to this checklist in PR description
- [ ] Request code review from design/frontend lead
- [ ] Address code review feedback
- [ ] Verify all checks pass (build, tests, etc.)
- [ ] Merge to main
- [ ] Deploy to staging/production
- [ ] Monitor for errors in first 24 hours

**Success Criteria:**
- ✅ Code review approved
- ✅ All checks passed
- ✅ No regressions in other features
- ✅ Merged to main

---

## Summary

| Phase | Status | Pages | Est. Hours | Actual Hours |
|-------|--------|-------|-----------|------------|
| 1: Infrastructure | ✅ 100% | N/A | 4 | 2.5 |
| 2: High-Impact Pages | 10% | 3 | 8 | - |
| 3: Token Alignment | 0% | 3 | 3 | - |
| 4: Error/Loading States | 100% (Part of Phase 1) | N/A | 2.5 | Included |
| 5: Responsive Testing | 0% | All | 4 | - |
| 6: Performance & Build | 0% | All | 1.5 | - |
| 7: Code Review & Merge | 0% | N/A | 1 | - |
| **TOTAL** | **~12%** | **10 pages** | **~28 hours** | **2.5 hrs** |

---

## Notes

- Compare page is a critical prerequisite and is already complete ✅
- Timeline assumes 1 developer working full-time
- Can be parallelized across team members (e.g., one person on super-investors, another on academy)
- Daily standup recommended to track blockers
- Visual regression testing (before/after screenshots) recommended to catch subtle style changes
