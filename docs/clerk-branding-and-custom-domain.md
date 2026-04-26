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

## 5) Google sign-in: `redirect_uri_mismatch` (400)

Google rejects the request when **Authorized redirect URIs** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) do not **exactly** match the URI Clerk uses (character-for-character: scheme, host, path, no extra slash).

1. **Clerk Dashboard** → **Configure** → **SSO connections** → **Google** → copy the **Authorized redirect URI** Clerk shows (keep **Use custom credentials** instructions open if you use your own Google client).
2. **Google Cloud Console** → **APIs & Services** → **Credentials** → your **OAuth 2.0 Client ID** (type *Web application*) → **Authorized redirect URIs** → **Add URI** → paste that value only. Save.
3. **Authorized JavaScript origins**: add origins you actually use, e.g. `https://barakfi.in`, `https://www.barakfi.in`, and for local dev `http://localhost:3000` (port must match). If you use a Clerk **custom auth domain** (e.g. `https://clerk.barakfi.in`), add that origin too if Google or Clerk’s setup page calls for it.
4. **Development vs production**: Clerk [dev can use shared Google credentials](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google); **production** requires **custom** credentials and a redirect URI from the **production** Clerk instance. Do not reuse one Google OAuth client’s redirect list for both if Clerk shows different callback URLs per instance.
5. After saving in Google, wait a minute and retry incognito. Typos, `http` vs `https`, and trailing `/` are the usual causes.

If you recently enabled **custom credentials** on the **Development** instance but pasted only the **production** redirect URI (or vice versa), you will see this error until both match the Clerk screen for that instance.

## 6) "Redirection error" loading `clerk.barakfi.in/npm/.../clerk.browser.js`

The browser loads Clerk JS from your **Frontend API** host (custom domain or `*.clerk.accounts.dev`). A **redirect loop** or broken chain usually means DNS / TLS / Clerk domain settings — not app code.

1. **Clerk Dashboard** → **Domains** → confirm `clerk.barakfi.in` (or your Frontend API domain) is **verified** and **SSL** is active.
2. **DNS** — a single **CNAME** to the target Clerk shows; remove duplicate A/AAAA records pointing elsewhere.
3. **Cloudflare** (if used) — set SSL mode to **Full (strict)**; avoid **Flexible** (can loop between HTTP/HTTPS). Pause orange-cloud proxy briefly to test.
4. **Key/instance mismatch** — a **development** `pk_test_` key while the script URL is production custom domain (or the reverse) can produce odd failures; use **Production** keys with the production Frontend API domain.
5. **Ad blockers / privacy extensions** — can surface spurious "redirection" or blocked script errors; test incognito without extensions.
