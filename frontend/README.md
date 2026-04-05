This is the premium Next.js frontend for the Barakfi platform.

## Local setup

1. Make sure the FastAPI backend is running on `http://127.0.0.1:8001`
2. Copy `.env.local.example` to `.env.local`
3. Add your Clerk publishable and secret keys to `.env.local`
4. Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a normal browser.

Important:
- do not rely on IDE proxy preview tabs if they show `Failed to proxy ... socket hang up`
- use Chrome/Safari directly with `http://localhost:3000`
- keep the backend on `http://127.0.0.1:8001`

The homepage reads from the FastAPI API for:
- dashboard summary
- stock universe
- portfolio
- watchlist
- rulebook
- screening logs
- auth strategy

If the backend is unavailable, the frontend falls back gracefully for a few key sections so the shell can still render.

Clerk routes added:
- `/account`
- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/workspace` protected by Clerk middleware

Backend bridge:
- the Next.js server loads `/api/me/workspace` using the signed-in Clerk session token
- first-time users complete `/onboarding`, which bootstraps their backend profile through an authenticated route

## Why this stack

- `Next.js`: premium product UI, routing, and future auth flows
- `FastAPI`: compliance engine, screening logic, portfolio APIs
- `Clerk`: planned auth provider for Google sign-in
- `Managed payments later`: do not build card handling in-house early

## Production direction

- keep the moat in compliance, explainability, and trust
- outsource auth and payments to proven providers
- move the current founder dashboard into a full signed-in app over time
- connect this frontend to real Clerk sessions once your keys are ready

## Verify

```bash
npm run lint
npm run build
```

Both commands are currently passing.

## Production (Vercel + Clerk)

- **Root directory**: In Vercel → Project → Settings → General, set **Root Directory** to `frontend` (the folder that contains `src/middleware.ts`). If this is wrong, `clerkMiddleware()` may not run and routes that use `auth()` can fail.
- **Clerk env (Production and Preview)**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. For preview deployments (`*.vercel.app`), add the host under **Clerk Dashboard → Domains** if sign-in fails on previews.
- **API URL**: `NEXT_PUBLIC_API_BASE_URL` must be the FastAPI base URL **including `/api`**, e.g. `https://api.barakfi.in/api`. **Do not** set this to `https://barakfi.in` (that is the Vercel frontend). If you do, the app now falls back to `https://api.barakfi.in/api` in production when it detects the marketing hostname.

## News feed (why the home/news pages can be empty)

- The site reads **`GET {NEXT_PUBLIC_API_BASE_URL}/news`** (public). An empty array means no rows in `news_articles` yet, or the request failed (see on-page hints after deploy).
- **Ingestion**: On the API (Render), call **`POST /api/internal/news/sync`** with header **`X-Internal-Service-Token`** set to the same value as **`INTERNAL_SERVICE_TOKEN`** in the API environment. That runs RSS (`NEWS_RSS_URL`) and NewsData.io when configured.
- **NewsData.io**: Set **`NEWSDATA_API_KEY`** and optionally **`NEWSDATA_Q`** on the API service (not on Vercel). Legacy names **`NEWS_NEWSAPI_KEY`** / **`NEWS_NEWSAPI_QUERY`** are still read as fallbacks.
