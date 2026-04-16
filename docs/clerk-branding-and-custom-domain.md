# Clerk Branding and Custom Auth Domain

This rollout keeps Clerk infrastructure while presenting BarakFi identity end-to-end.

## 1) Clerk Dashboard Branding
- Open Clerk Dashboard -> Configure -> Branding.
- Set application name to `BarakFi`.
- Upload logo from `frontend/public/brand/barakfi-logo-mark.svg`.
- Set primary brand color to `#059669`.
- Disable any default development badge for production instances.

## 2) Auth UI Branding in App
- `SignIn` and `SignUp` use `appearance.layout.logoImageUrl` with `/brand/barakfi-logo-mark.svg`.
- Sidebar and mobile intro now use `Logo` component text `BarakFi`.
- Global CSS hides residual Clerk footer links where possible.

## 3) Custom Auth Domain Plan
1. Choose auth subdomain, for example `auth.barakfi.in`.
2. In Clerk -> Domains, add `auth.barakfi.in`.
3. Add required DNS records (typically CNAME to Clerk target).
4. Wait for TLS issuance and domain verification.
5. Update app env vars:
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://auth.barakfi.in/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://auth.barakfi.in/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/workspace`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding`
6. Verify redirect flows on desktop and mobile.

## 4) Brand Asset Pack
Source vector files are versioned under `frontend/public/brand/`:
- `barakfi-logo-mark.svg` (square mark)
- `barakfi-logo-wordmark.svg` (horizontal brand lockup)

Recommended export sizes for social/web:
- 1024, 512, 256, 128, 64 px (transparent PNG)
- 1200x630 OG variant for social cards
- 180 and 192 favicon/app icon variants
