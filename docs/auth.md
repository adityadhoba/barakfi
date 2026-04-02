# Authentication Strategy

## Chosen provider

This project should use `Clerk` as the primary authentication platform.

## Why Clerk is the best fit here

For this app's current stage, Clerk gives the best balance of:

- polished consumer auth UX
- fast Google sign-in setup
- lower implementation complexity than building auth yourself
- better product feel than a barebones auth utility
- clean path from solo MVP to production consumer app

## Official references

- Google OpenID Connect:
  `https://developers.google.com/identity/openid-connect/openid-connect`
- Clerk Google social connection:
  `https://clerk.com/docs/authentication/social-connections/google`
- Clerk manual JWT verification:
  `https://clerk.com/docs/backend-requests/handling/manual-jwt`

## Why not the other main options right now

- `Auth0`: very strong, but heavier and more enterprise-shaped than necessary for the current phase
- `Firebase Auth`: simple and proven, but less premium from a product-experience perspective for this app's direction
- `Supabase Auth`: good value and very capable, but strongest when your stack is already centered on Supabase

## Recommended integration path

1. Create a Clerk application
2. Enable Google as a social connection in Clerk
3. Add your local and production redirect domains
4. Set:
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_JWKS_URL`
   - `CLERK_JS_URL`
5. Render signed-in / signed-out UI states in the frontend
6. Verify Clerk session tokens in FastAPI before returning user-scoped data
7. Map Clerk user identity to the local `users` table using `auth_subject`

## Practical note for this codebase

This app uses a server-rendered page with lightweight JavaScript.
So the simplest Clerk setup is:

- copy the exact ClerkJS browser script URL from the Clerk dashboard
- place it into `CLERK_JS_URL`
- place the publishable key into `CLERK_PUBLISHABLE_KEY`

This avoids guessing the Clerk frontend URL format in code.

## Product policy

- Google sign-in is a login method, not the compliance engine
- auth must remain separate from compliance decisions
- only minimum scopes should be requested
- do not request extra Google data unless a product feature truly needs it
