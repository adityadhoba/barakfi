# Feature Gating Implementation

## Overview
This document describes the complete feature gating system implemented across the Barakfi frontend to lock premium features behind the Pro and Founding membership tiers.

## Architecture

### 1. EntitlementsProvider Context
**File:** `frontend/src/components/entitlements-provider.tsx`

A React context provider that:
- Fetches user entitlements from `/api/me/billing` on mount
- Caches entitlements in client-side state
- Provides `useEntitlements()` hook for consuming components
- Returns: `{ entitlements: Record<string, boolean>, plan: string, isLoading: boolean, error: Error | null }`

**Entitlements tracked:**
- `saved_screeners_unlimited` - Pro+
- `priority_compliance_queue` - Pro+
- `advanced_alerts` - Pro+
- `founder_circle_access` - Founding only
- `csv_export` - Pro+ (new)
- `peer_comparison` - Pro+ (new)

### 2. ProGate Component
**File:** `frontend/src/components/pro-gate.tsx`

A reusable gate component that:
- Takes `feature` prop (entitlement code) and `children`
- Renders children normally if user is entitled
- Shows blurred overlay with "PRO" badge and "Upgrade to Pro" CTA if not entitled
- Links to `/billing` page
- Handles loading state by showing children optimistically

**CSS Module:** `frontend/src/components/pro-gate.module.css`
- Blur effect (4px) on locked content
- Emerald-colored badge with lock icon
- Responsive design
- Dark mode support

### 3. Layout Integration
**File:** `frontend/src/app/layout.tsx`

- Imports `EntitlementsProvider`
- Wraps main content with `EntitlementsProvider` ONLY for authenticated users
- Unauthenticated users bypass the provider (no API call, no errors)

## Feature Gating Points

### Screener Page
**File:** `frontend/src/components/stock-screener-table.tsx`

#### Save Filter Button
```tsx
<ProGate feature="saved_screeners_unlimited" fallbackText="Pro: Unlimited saves">
  <button onClick={() => setShowSaveModal(true)}>
    Save Filter
  </button>
</ProGate>
```
- Free users see locked button with CTA
- Pro users can save unlimited filters
- Free users implicitly limited to 3 saves via backend

#### Export to CSV Button
```tsx
<ProGate feature="csv_export" fallbackText="Pro feature">
  <button onClick={() => exportToCsv(sorted)}>
    &#x2913; Export
  </button>
</ProGate>
```
- CSV export locked behind Pro tier
- Free users see blurred export button with overlay

### Stock Detail Page - Research Tab
**File:** `frontend/src/components/stock-research-section.tsx` (new client component)

#### Peer Comparison Table
```tsx
<ProGate feature="peer_comparison" fallbackText="Upgrade to Pro for peer analysis">
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      {/* Peer comparison table */}
    </table>
  </div>
</ProGate>
```
- Quick analysis compliance score shown to all (free feature)
- Peer comparison table locked behind Pro tier
- Shows lock overlay with message

**Integration in Stock Page:**
- `frontend/src/app/stocks/[symbol]/page.tsx` imports and uses `StockResearchSection`
- Passes compliance score data and peer comparison data
- Client component handles gating internally

### Billing Page
**File:** `frontend/src/components/billing-shell.tsx`

**Updated Feature Comparison Table:**

Features now clearly mapped by tier:
```
Free Plan:
- Core workspace & portfolio
- Basic stock screening
- 3 saved screeners
- 10-stock watchlist
- Basic stock detail page

Pro Plan:
- All of Free +
- Unlimited saved screeners
- CSV export
- Peer comparison analysis
- Priority compliance queue
- Advanced alerts & notifications
- Unlimited watchlist

Founding Plan:
- All of Pro +
- Founder circle access
- Early access to features
```

## Entitlements API Contract

Backend endpoint: `GET /api/me/billing`

Response structure:
```typescript
type BillingOverview = {
  current_subscription: UserSubscription | null;
  available_plans: SubscriptionPlan[];
  entitlements: Entitlement[];
};

type Entitlement = {
  code: string;
  enabled: boolean;
  reason: string;
};
```

**Available Entitlement Codes:**
- `core_workspace` - All plans
- `saved_screeners_unlimited` - Pro, Founding
- `priority_compliance_queue` - Pro, Founding
- `advanced_alerts` - Pro, Founding
- `founder_circle_access` - Founding only
- `csv_export` - Pro, Founding (managed client-side)
- `peer_comparison` - Pro, Founding (managed client-side)

## User Experience

### Free Users
1. See all features available
2. Click "Save Filter" → See pro-gate overlay with "Upgrade to Pro" CTA
3. Click "Export" → See pro-gate overlay
4. View Research tab → Can see compliance score but peer table is blurred with overlay
5. Click "Upgrade to Pro" → Redirected to billing page

### Pro Users
1. All premium features work normally
2. No overlays or gates appear
3. Can save unlimited filters
4. Can export to CSV
5. Can view peer comparison

### Founding Users
1. Everything Pro users have
2. Plus founder circle access and early features

## Technical Details

### Dependencies
- React 19 (hooks: useContext, useState, useEffect)
- Next.js 16.2.1 (App Router, client components)
- Clerk.js (authentication via credentials="include")

### CSS Architecture
- Uses existing CSS custom properties from globals.css
- Respects light/dark theme via data-theme attribute
- Responsive design for mobile (480px breakpoint)
- Emerald color scheme: `var(--emerald)`, `var(--emerald-bg)`, `var(--emerald-border)`

### Performance
- Entitlements fetched once per session (cached in context)
- No refetches on navigation (context persists)
- Optimistic rendering during load (shows children while loading)
- Uses fetch with credentials="include" for authenticated endpoints

## Migration Notes

### For Backend
1. Ensure `/api/me/billing` endpoint includes all entitlement codes
2. Set `csv_export` entitlement for pro+ plans
3. Set `peer_comparison` entitlement for pro+ plans

### For Frontend
1. Install/build dependencies: `npm install`
2. No new external dependencies needed
3. All components use existing build setup
4. TypeScript typings from existing `@/lib/api` module

## Future Extensibility

To add new gated features:
1. Add new entitlement code to backend
2. Wrap UI component with: `<ProGate feature="new_feature">{...}</ProGate>`
3. Update billing comparison table to show feature
4. No code changes needed to provider or gate component

Example:
```tsx
<ProGate feature="advanced_reporting">
  <ReportingDashboard />
</ProGate>
```

## Testing Checklist

- [ ] Unauthenticated users don't see errors (no EntitlementsProvider loaded)
- [ ] Free users see locked overlays on all pro features
- [ ] Pro users see all features unlocked
- [ ] Founding users see all features unlocked
- [ ] "Upgrade to Pro" CTA links to /billing correctly
- [ ] Theme switching works (light/dark mode in overlays)
- [ ] Mobile responsive design works
- [ ] No console errors from entitlements provider
- [ ] Billing page comparison table clearly shows feature tiers
- [ ] CSV export works for pro users
- [ ] Save filter modal works for pro users
- [ ] Peer comparison table visible for pro users
- [ ] Page performance unaffected by new API call

## Files Modified

### Created
- `frontend/src/components/entitlements-provider.tsx`
- `frontend/src/components/pro-gate.tsx`
- `frontend/src/components/pro-gate.module.css`
- `frontend/src/components/stock-research-section.tsx`

### Modified
- `frontend/src/app/layout.tsx` - Added EntitlementsProvider wrapper
- `frontend/src/components/stock-screener-table.tsx` - Wrapped Save Filter and Export buttons
- `frontend/src/components/billing-shell.tsx` - Updated feature comparison table
- `frontend/src/app/stocks/[symbol]/page.tsx` - Used StockResearchSection component

## Known Limitations

1. Free tier limits (e.g., 3 saved filters) enforced by backend only
2. ProGate component doesn't show remaining quota for free users (could be enhanced)
3. No client-side enforcement of rate limiting (all backend-enforced)
4. CSS grid layout in gated sections may look odd if not responsive (use wrappers)
