This is the Next.js frontend for **Halal Stock Checker** (Barakfi) — check if a stock is Halal; instant Halal status.

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

## Mobile UX

- **Bottom nav**: Home, Screener, Watchlist, and **More** (opens the slide-out menu for Compare, Admin, etc.). This avoids duplicating **Watchlist** in the header on small screens.
- **Top bar**: On viewports under 768px the **Watchlist** link is hidden in the header (still in bottom nav + drawer).
- **Screener**: Filter sidebar starts **collapsed** on narrow screens; tap **Filters** to open; tap the dimmed overlay to close.
- **Rate limits**: If you see “Too many requests” from the API on mobile, the backend rate limit was raised; ensure the latest API is deployed.

## Verify

```bash
npm run lint
npm run build
```

## Production (Vercel + Clerk)

- **Root directory**: In Vercel → Project → Settings → General, set **Root Directory** to `frontend` (the folder that contains `src/middleware.ts`). If this is wrong, `clerkMiddleware()` may not run and routes that use `auth()` can fail.
- **Clerk env (Production and Preview)**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. For preview deployments (`*.vercel.app`), add the host under **Clerk Dashboard → Domains** if sign-in fails on previews.
- **API URL**: `NEXT_PUBLIC_API_BASE_URL` must be the FastAPI base URL **including `/api`**, e.g. `https://api.barakfi.in/api`. **Do not** set this to `https://barakfi.in` (that is the Vercel frontend). If you do, the app now falls back to `https://api.barakfi.in/api` in production when it detects the marketing hostname.

## Daily refresh (frontend cron bridge)

- `GET /api/cron/daily-pipeline` forwards to backend `POST /api/internal/daily-refresh` using `INTERNAL_SERVICE_TOKEN`.
- Recommended weekday schedule is **04:30 IST (UTC `0 23 * * 1-5`)**.
- Keep-alive (`/api/keep-alive`) should only be scheduled when the backend deployment can sleep on idle.

## Watchlist market / currency (US vs India)

- **`GET /api/me/watchlist`** returns each entry’s `stock` with **`exchange`**, **`currency`**, and **`country`** from the database. The watchlist page uses these for USD/GBP vs INR and the market pill.
- If a US ticker still shows as India + rupees, fix the **`stocks`** row in PostgreSQL (`exchange`, `currency`) or run **`scripts/audit_stock_exchange.py`** on the API host.
- **`latest_research_summary`** on each watchlist row is the latest research note line for that symbol (see API response).

## Stock detail 404 (e.g. M&M, AVGO)

- The stock page calls **`GET /api/stocks/{symbol}`** and **`GET /api/screen/{symbol}`**. If the symbol is **missing** from the `stocks` table or **`is_active = false`**, the API returns **404** and the site shows “Page not found.”
- On production Postgres, verify:

```sql
SELECT symbol, is_active, exchange FROM stocks WHERE symbol IN ('M&M', 'AVGO');
```

- If no rows are returned, **seed or import** those symbols (see repo seed data / `fetch_data.py` / your ETL). Symbols with **`&`** (e.g. `M&M`) must match exactly in the DB; the URL uses **`/stocks/M%26M`**, which decodes to `M&M`.
- Slow loads followed by errors are often **API cold starts**; the stock page shows a **try again** state when the API times out or returns 5xx instead of a generic 404.
