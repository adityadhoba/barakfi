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

1. Full **price sync** (same behaviour as `POST /api/market-data/sync-prices`).
2. **News** upsert (same as `POST /api/internal/news/sync`).
3. **Screening warm-up** in chunks (default 150 symbols per chunk, max 500) via the same logic as bulk screen — no HTTP rate-limit path.

**Headers**

- `X-Internal-Service-Token`: must match `INTERNAL_SERVICE_TOKEN` on the API host.

**Query**

- `screen_chunk_size` (optional, 50–500): symbols per bulk-screen chunk.
- `max_price_stocks` (optional, 1–5000): cap how many stocks get a price quote update (omit = entire active universe).
- `max_screen_symbols` (optional): cap screening warm-up to the first *N* symbols (sorted by symbol); omit = all active stocks.
- `skip_prices=true` | `skip_news=true` | `skip_screen=true`: run only the remaining steps (useful when an HTTP client enforces a short timeout).

**Short timeouts (e.g. cron-job.org test at 30s)**

A **full** refresh usually needs **many minutes**. Either:

1. Set the cron job **timeout to the maximum** your plan allows, **or**
2. **Split into multiple jobs** (same header on each), for example:
   - **Prices only:**  
     `POST .../daily-refresh?skip_news=true&skip_screen=true`
   - **News only:**  
     `POST .../daily-refresh?skip_prices=true&skip_screen=true`
   - **Screening only (full universe):**  
     `POST .../daily-refresh?skip_prices=true&skip_news=true`  
     (still long if you have hundreds of symbols — add `max_screen_symbols` and use several jobs with offsets later if needed), **or**
3. Combine **caps** for a single quick smoke test, e.g.  
   `?max_price_stocks=50&max_screen_symbols=50` (still depends on provider speed).

For **production** full runs, **Render Cron** (or another worker) calling this endpoint with a **long** HTTP or process timeout is more reliable than a 30s-limited URL pinger.

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
