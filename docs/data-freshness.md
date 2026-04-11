# Data freshness

This document describes how Barakfi refreshes **prices**, **fundamentals**, **news**, and **screening cache**, and how operators can run jobs manually.

## What updates when

| Layer | Typical source | Notes |
| --- | --- | --- |
| **Equity prices** | `POST /api/market-data/sync-prices` (internal token) | Batch job; throttled per provider. Uses `MARKET_DATA_PROVIDER` unless overridden by query param. |
| **Fundamentals** | Separate ingestion / provider jobs (e.g. seed scripts, SignalX, Xaro) | Not run on every price sync. See `/api/fundamentals/status` and `/api/data-stack/status`. |
| **News** | `POST /api/internal/news/sync` (internal token) | RSS + optional NewsData.io (`NEWSDATA_API_KEY`). |
| **Screening cache** | `POST /api/screen/bulk` or `POST /api/bulk-screen` (public, budget-limited) or internal warm-up | Per-symbol in-memory cache TTL; bulk endpoints populate it. |

## Daily pipeline (recommended for production)

`POST /api/internal/daily-refresh` runs, in order:

1. **Fundamentals** (Yahoo Finance via `fetch_real_data.fetch_stock_data` → DB), **active non-ETF stocks only**, unless `skip_fundamentals=true`. Paging: `fundamentals_offset`, `max_fundamentals_stocks`. Ensures screening ratios match **persisted** statement fields.
2. Full **price sync** (same behaviour as `POST /api/market-data/sync-prices`).
3. **News** upsert (same as `POST /api/internal/news/sync`).
4. **Screening warm-up** in chunks (default 150 symbols per chunk, max 500) via the same logic as bulk screen — no HTTP rate-limit path.

### What one Render cron (`--full-pipeline`) refreshes on the product

| User-visible area | Covered by daily-refresh? | Why |
| --- | --- | --- |
| **Stock prices** in DB (screener, lists, detail fallbacks) | **Yes** | Step 1 updates `Stock.price` / `data_source`. |
| **Home / header “live” prices** | **Partly** | Tiles use client quote polling where configured; **DB price** (after sync) is the fallback and drives rankings that sort by price. |
| **Shariah screening** results & cache (stock pages, screener, home halal stats) | **Yes** | Step 3 recomputes and fills the screening cache used by SSR/API. |
| **News feed** | **Yes** | Step 2 upserts articles. |
| **Trending** (`/trending`, home preview) | **Indirectly yes** | Trending is computed from **DB** `Stock` rows (e.g. market cap, price); after price sync, lists reflect newer values. |
| **Financial ratios / fundamentals** (debt, revenue, statements in DB) | **Yes** (step 1) | Pulled from **Yahoo Finance** through the same logic as `python fetch_real_data.py`, then screening runs on updated rows. Optional `skip_fundamentals=true` for tests or short jobs. **SignalX/Xaro** are not wired into this path yet — set `FUNDAMENTALS_PROVIDER` for status only; live pull here is Yahoo-based. |
| **ETF holdings** (halal % on `/etfs`) | **No** | Holdings come from `python -m app.scripts.sync_etf_holdings` (or your own schedule). Not wired into `daily-refresh` today. |
| **Collections / super-investors** curated lists | **No** | Static or separately maintained data, not this pipeline. |

To extend the single job later, add explicit steps (e.g. optional internal **ETF holdings** batch) in the API and call them from the same cron **after** measuring runtime impact.

**Headers**

- `X-Internal-Service-Token`: must match `INTERNAL_SERVICE_TOKEN` on the API host.

**Query**

- `screen_chunk_size` (optional, 50–500): symbols per bulk-screen chunk.
- `max_price_stocks` (optional, 1–5000): cap how many stocks get a price quote update (omit = entire active universe).
- `price_sync_offset` (optional, default 0): skip the first *N* active stocks (by symbol) before applying `max_price_stocks` — use to **page** price sync across many short requests.
- `max_screen_symbols` (optional): cap screening warm-up to at most *N* symbols after `screen_sync_offset`.
- `screen_sync_offset` (optional, default 0): skip the first *N* symbols — page screening across jobs.
- `skip_prices=true` | `skip_news=true` | `skip_screen=true` | `skip_fundamentals=true`: run only the remaining steps.
- `max_fundamentals_stocks`, `fundamentals_offset`: page the fundamentals pass (same idea as price paging).

**cron-job.org (hard 30s timeout)**

A **single** call with no skips and no caps will usually **exceed 30 seconds**. You cannot raise that limit on cron-job.org; instead create **several cron jobs** (stagger times so they do not overlap), each finishing one slice:

1. **News (once per day)** — usually fits in 30s:  
   `POST .../daily-refresh?skip_prices=true&skip_screen=true`

2. **Prices — one slice per job** (~0.35s throttle per stock → budget **~50–70 stocks** per request to stay under 30s, depending on provider):  
   `POST .../daily-refresh?skip_news=true&skip_screen=true&max_price_stocks=60&price_sync_offset=0`  
   Then duplicate jobs with `price_sync_offset=60`, `120`, `180`, … until `next_offset` in the JSON response reaches your active stock count (see `/api/market-data/status` or DB).

3. **Screening — one slice per job** (cheap per symbol, but cap to be safe):  
   `POST .../daily-refresh?skip_prices=true&skip_news=true&max_screen_symbols=200&screen_sync_offset=0`  
   Then `screen_sync_offset=200`, `400`, … until you have covered the universe. The response includes `screening.next_offset` for the next slice.

**Easier alternative:** use **Render Cron** (or another worker) with a **long** timeout or a one-shot shell script on a machine you control, and keep cron-job.org only for **wake** or **news-only** if you prefer.

### Invoking from Vercel Cron

The Next.js route `GET /api/cron/daily-pipeline` is intended for Vercel Cron.

**Vercel (server-only) env**

- `CRON_SECRET`: Vercel injects `Authorization: Bearer <CRON_SECRET>` on cron invocations when this variable is set.
- `INTERNAL_SERVICE_TOKEN`: must match the Render (or API) `INTERNAL_SERVICE_TOKEN` so the route can call the Python API.
- `NEXT_PUBLIC_API_BASE_URL`: must point at the API origin including `/api` (e.g. `https://api.barakfi.in/api`).

**Limits**

Vercel **Hobby** has strict execution time limits; a full-universe price sync plus bulk screen may **timeout**. For large universes, prefer **Render Cron** (or another worker) calling `POST /api/internal/daily-refresh` directly with a long timeout, and use the Vercel cron only for light keep-wake or omit it.

## Manual news sync (operators)

```bash
curl -sS -X POST "https://<api-host>/api/internal/news/sync" \
  -H "X-Internal-Service-Token: $INTERNAL_SERVICE_TOKEN"
```

Optional: `NEWS_RSS_URL`, `NEWSDATA_API_KEY` on the API service.

## Manual price sync (operators)

```bash
curl -sS -X POST "https://<api-host>/api/market-data/sync-prices" \
  -H "X-Internal-Service-Token: $INTERNAL_SERVICE_TOKEN"
```

Optional query: `max_stocks`, `provider`.
