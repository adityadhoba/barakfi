# Data Freshness

This document describes BarakFi's daily refresh flow for **fundamentals**, **prices**, and **screening cache**.

## What updates when

| Layer | Source | Notes |
| --- | --- | --- |
| **Fundamentals** | `PYTHONPATH=. python3 fetch_real_data.py` | Writes latest fundamentals to DB and updates `fundamentals_updated_at`. |
| **Equity prices** | `POST /api/internal/daily-refresh` | Daily pipeline triggers full quote sync using `MARKET_DATA_PROVIDER`. |
| **Screening cache** | `POST /api/internal/daily-refresh` | Warmed in chunks after price sync so screening reads fresh data. |

## Production weekday schedule (IST)

Run these two jobs in strict order:

1. **Job A — Fundamentals first**
   - Command: `PYTHONPATH=. python3 fetch_real_data.py`
   - Time: **04:30 PM IST, Mon–Fri**
   - UTC cron: `0 11 * * 1-5`
2. **Job B — Daily refresh pipeline**
   - Command: `POST /api/internal/daily-refresh` with `X-Internal-Service-Token`
   - Time: **05:45 PM IST, Mon–Fri**
   - UTC cron: `15 12 * * 1-5`

This ordering ensures screening runs against freshly ingested fundamentals.
The daily refresh is now a **hard-guarantee** step: it returns failure when full screening coverage is not achieved.

## Internal daily refresh endpoint

`POST /api/internal/daily-refresh` performs:

1. full price sync
2. screening cache warm-up in chunks (`screen_chunk_size`, default 150)
3. retry per failed chunk (up to 3 attempts with backoff)
4. stale guard check (fails if fundamentals remain stale)

Success and failure notifications:
- Sends Slack failure alerts immediately for price sync failures, incomplete screening, and stale guard failures.
- Sends one final Slack success heartbeat after a fully successful run (`screening_complete=true` and not stale).
- Job A success alerts are optional and disabled by default to avoid noise.
- Controlled by env vars:
  - `OPS_SLACK_WEBHOOK_URL`
  - `OPS_ALERT_FAILURES_ENABLED`
  - `OPS_ALERT_SUCCESSES_ENABLED`
  - `OPS_ALERT_JOB_A_SUCCESSES_ENABLED`
  - `OPS_ALERT_QUIET_WINDOW_ENABLED`
  - `OPS_ALERT_QUIET_WINDOW_SECONDS`

Required header:

- `X-Internal-Service-Token` (must equal backend `INTERNAL_SERVICE_TOKEN`)

## Keep-alive policy

Use keep-alive pings **only** in environments where the backend can sleep (for example, free-tier deployments with idle shutdown). For always-on environments, keep-alive should remain disabled.

## Manual operator commands

Fundamentals ingestion:

```bash
PYTHONPATH=. python3 fetch_real_data.py
```

Daily refresh pipeline:

```bash
curl -sS -X POST "https://<api-host>/api/internal/daily-refresh" \
  -H "X-Internal-Service-Token: $INTERNAL_SERVICE_TOKEN"
```

## Production recovery checklist (ops)

Run this sequence when freshness regresses or `fundamentals_updated_at` is missing in production:

1. Validate cron job A (`barakfi-daily-fundamentals`) has `DATABASE_URL` set to production Postgres.
2. Validate cron job B (`barakfi-daily-refresh`) has valid `API_BASE_URL` and `INTERNAL_SERVICE_TOKEN`.
3. Manually run job A, wait for completion, then run job B.
4. Verify:
   - `GET /api/fundamentals/status` shows non-null `latest_fundamentals_updated_at`.
   - `GET /api/fundamentals/status` shows `screening_complete=true`.
   - `rows_missing_timestamp` trends down (ideally `0`).
   - `stale` is `false` and `staleness_hours` is below threshold.
5. Smoke-check live symbols:
   - `GET /api/stocks/BHARTIARTL`
   - `GET /api/stocks/RELIANCE`
   - `GET /api/stocks/HDFCBANK`
   Confirm `fundamentals_updated_at` is non-null and recent.
