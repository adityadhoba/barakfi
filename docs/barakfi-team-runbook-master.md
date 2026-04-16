# BarakFi Team Runbook (One-Stop)

Last updated: 2026-04-15 (IST)  
Audience: Engineering, Product, Ops, Support, Founders  
Purpose: One page that explains how BarakFi works, where data comes from, how screening is computed, and what to do when something breaks.

---

## Table of Contents
1. What BarakFi Is
2. System Map
3. Data Source Map
4. Screening Engine Map
5. Daily Ops SOP
6. Troubleshooting Matrix
7. Change Map (Where to Edit)
8. Environments and Secrets Policy
9. Release Workflow
10. Non-Technical FAQ
11. New Member Onboarding Checklist
12. Ownership and Update Cadence
13. Operator Quick Commands

---

<details>
<summary><strong>1) What BarakFi Is</strong></summary>

BarakFi is a Shariah stock screening and research platform focused on Indian equities.

Business goals:
- Help users check stock compliance status quickly.
- Provide transparent methodology-based reasoning (not religious certification).
- Keep data freshness and explainability as product trust pillars.

Core product surfaces:
- Screener
- Stock detail page
- Compare
- Watchlist/Workspace
- Governance/admin and quota controls

</details>

<details>
<summary><strong>2) System Map</strong></summary>

### Frontend (Next.js)
- Path: `frontend/`
- Key responsibilities:
  - Public pages, screener, stock detail, compare, workspace
  - Same-origin API proxies for auth-safe browser calls
  - UI wording and status-label mapping
- Primary reference docs:
  - `frontend/README.md`

### Backend (FastAPI)
- Path: `app/`
- Key responsibilities:
  - Stock/fundamental APIs
  - Screening engine execution
  - Quota and compare enforcement
  - Daily refresh pipeline endpoints
- Primary reference files:
  - `app/api/routes.py`
  - `app/services/halal_service.py`
  - `app/services/quota_service.py`
  - `app/services/market_data_service.py`

### Data Jobs / Cron
- Fundamentals ingestion: `fetch_real_data.py`
- Daily refresh trigger: `scripts/run_daily_refresh.py`
- Cron/IaC config: `render.yaml`
- Operations guide: `docs/data-freshness.md`

### External Providers
- Fundamentals/quotes ingestion currently uses Yahoo Finance paths in ingestion.
- Market quote APIs include NSE public + Yahoo fallback flows.
- Auth: Clerk.
- Deploy: Render (backend/cron), Vercel (frontend).

</details>

<details>
<summary><strong>3) Data Source Map</strong></summary>

### What data is used
- Price and quote fields (for UI and market snapshots)
- Financial statement-derived fields (debt, receivables, income, assets)
- Screening outputs (status, reasons, ratios, flags)

### Where it comes from
- Fundamentals ingestion: `fetch_real_data.py` (Yahoo Finance-driven pull and DB upsert)
- Live quote/sync paths:
  - `app/services/indian_market_client.py`
  - `app/services/quote_sync_service.py`
  - `/api/market-data/*` routes

### When it updates
- Weekdays:
  - Job A (fundamentals) at 04:30 PM IST
  - Job B (daily refresh) at 05:45 PM IST
- Reference:
  - `docs/data-freshness.md`
  - `render.yaml`

### Trust and limits
- Public/free providers can lag or vary from vendor UIs.
- Data parity target is best effort after conversion and normalization.
- Always check freshness endpoints before concluding a data bug.

</details>

<details>
<summary><strong>4) Screening Engine Map</strong></summary>

### Engine ownership
- Main logic: `app/services/halal_service.py`
- Rulebook narrative: `docs/rulebook.md`
- API orchestration and outputs: `app/api/routes.py`

### Methodology handling
- Multi-methodology outputs supported (S&P, AAOIFI, FTSE/Yasaar, Khatkhatay).
- Product primary path is strict methodology-aligned flow.

### Status labels
- Engine statuses: `HALAL`, `CAUTIOUS`, `NON_COMPLIANT`
- UI labels should map through frontend helper:
  - `frontend/src/lib/screening-status.ts`
  - Product wording: `Shariah Compliant`, `Requires Review`, `Not Compliant`

### Data dependency
- Screening quality depends on fundamentals quality and freshness.
- Missing/old fundamentals can cause mismatch vs external platforms.

</details>

<details>
<summary><strong>5) Daily Ops SOP</strong></summary>

### Weekday sequence (must stay in order)
1. Run fundamentals ingestion (`fetch_real_data.py`)
2. Run daily refresh pipeline (`/api/internal/daily-refresh` via script)

### Cron schedule (IST)
- Job A: 04:30 PM IST (UTC `0 11 * * 1-5`)
- Job B: 05:45 PM IST (UTC `15 12 * * 1-5`)

### Validation after jobs
- `GET /api/fundamentals/status`
- `GET /api/data-stack/status`
- `GET /api/stocks/{symbol}` for spot symbols (`BHARTIARTL`, `RELIANCE`, `HDFCBANK`)

### Expected healthy signals
- `latest_fundamentals_updated_at` is non-null and recent
- `stale` is `false`
- key symbols show non-null `fundamentals_updated_at`

</details>

## Data Operations Table

| Data Type | Source | Script/Service | Frequency | Validation Endpoint | Owner | Fallback | Known Limits |
|---|---|---|---|---|---|---|---|
| Fundamentals | Yahoo Finance ingestion path | `fetch_real_data.py` | Weekdays 04:30 PM IST | `/api/fundamentals/status`, `/api/stocks/{symbol}` | Backend/Data Ops | Previous DB snapshot | Provider lag, symbol metadata inconsistencies |
| Daily quote sync + screening warm-up | Backend internal pipeline | `scripts/run_daily_refresh.py` -> `POST /api/internal/daily-refresh` | Weekdays 05:45 PM IST | `/api/data-stack/status`, `/api/market-data/status` | Backend/Ops | Next scheduled run or manual rerun | Dependent on service token, API availability |
| Live quote snapshot | NSE public / Yahoo fallback | `app/services/indian_market_client.py` + `/api/market-data/quote/{symbol}` | On demand | `/api/market-data/quote/{symbol}` | Backend | Provider fallback chain | Delay/rate-limit on public feeds |
| Screening output | Internal rules engine | `app/services/halal_service.py` + `/api/screen/*` | On demand + warmed by daily pipeline | `/api/screen/{symbol}`, `/api/screen/{symbol}/multi` | Compliance/Backend | Manual re-run and review | Depends on fundamentals freshness/completeness |
| Compare quotas | DB-backed IST-day quota service | `app/services/quota_service.py`, `/api/compare/bulk` | Real-time per request | `/api/quota`, compare responses | Backend/Product | Friendly limit payload + next day reset | Daily limits by actor and plan |

---

<details>
<summary><strong>6) Troubleshooting Matrix</strong></summary>

Use this first-response flow:
1. Reproduce with exact symbol/user role/time.
2. Check relevant status endpoints.
3. Use table below to locate root cause quickly.

</details>

## Incident Playbook Table

| Symptom | Severity | First Check | Commands / API checks | Code area | Fix path | Verification | Escalation |
|---|---|---|---|---|---|---|---|
| Fundamentals show old values / timestamp null | High | `/api/fundamentals/status` stale/null | Run Job A then Job B; check sample symbols | `fetch_real_data.py`, `docs/data-freshness.md`, `render.yaml` | Validate cron env (`DATABASE_URL`, token), rerun jobs, confirm timestamps written | `latest_fundamentals_updated_at` recent; symbol timestamp non-null | Backend lead + Ops |
| Compare shows internal error / quota confusion | High | `/api/compare/bulk` payload + `/api/quota` | Reproduce as non-admin and admin; inspect limit payload | `app/api/routes.py`, `app/services/quota_service.py`, `frontend/src/app/api/compare/bulk/route.ts`, `frontend/src/components/compare-table.tsx` | Ensure handled `429 limit_exhausted` and `401` paths surface correctly | Compare page shows friendly state, not 500 path | Backend + Frontend owner |
| Stock status mismatch vs expectation | Medium/High | Check fundamentals freshness first | `/api/stocks/{symbol}`, `/api/screen/{symbol}/multi` | `app/services/halal_service.py`, `docs/rulebook.md` | Confirm denominator/methodology expectations and refreshed inputs | Ratios and status match methodology rules | Compliance owner |
| Prices look stale | Medium | `/api/market-data/status` and quote endpoint | `/api/market-data/quote/{symbol}` and sync trigger | `app/services/indian_market_client.py`, `app/services/quote_sync_service.py` | Check provider mode and run sync | UI reflects updated quote source | Backend/Ops |
| Logo missing or initial letter avatar | Low/Medium | Verify token and symbol-domain mapping | Check `NEXT_PUBLIC_LOGO_DEV_TOKEN`, logo file mapping | `frontend/src/components/stock-logo.tsx` | Add/fix domain mapping and deploy | Logo appears on home/screener/detail | Frontend owner |
| Symbol missing from screener/search | Medium | Check stock exists and active in DB | Use stock API/search endpoints | `scripts/fetch_nse_universe.py`, `fetch_real_data.py`, stock import paths | Add symbol to universe, ingest fundamentals, run refresh | Symbol appears with data quality fields | Data Ops + Backend |
| UI wording/status inconsistency | Medium | Inspect current rendered label path | Compare component + helper usage | `frontend/src/lib/screening-status.ts` and consuming components | Route all labels through shared helper | Consistent labels across screener/detail/compare | Frontend owner |

---

<details>
<summary><strong>7) Change Map (Where to Edit)</strong></summary>

### Screening logic mismatch
- Edit: `app/services/halal_service.py`
- Validate via: `/api/screen/{symbol}`, `/api/screen/{symbol}/multi`

### Fundamentals freshness / staleness
- Edit: `fetch_real_data.py`, `app/services/market_data_service.py`, `docs/data-freshness.md`
- Infra: `render.yaml` cron/env

### Price sync / market data behavior
- Edit: `app/services/indian_market_client.py`, `app/services/quote_sync_service.py`, related `/market-data/*` routes in `app/api/routes.py`

### Compare and quota failures
- Backend: `app/services/quota_service.py`, `app/api/routes.py`
- Frontend: `frontend/src/app/api/compare/bulk/route.ts`, `frontend/src/components/compare-table.tsx`, compare pages

### UI status/copy inconsistencies
- Edit source mapping: `frontend/src/lib/screening-status.ts`
- Apply in component surfaces (screener, stock detail, compare, watchlist)

### Missing symbols or logos
- Universe/scripts: `scripts/fetch_nse_universe.py`, `fetch_real_data.py`
- Logo mapping/render: `frontend/src/components/stock-logo.tsx`

</details>

<details>
<summary><strong>8) Environments and Secrets Policy</strong></summary>

Policy:
- Keep only env var names and setup location in docs.
- Never store live tokens/keys in Notion.

### Backend env references
- File templates: `.env.example`, `.env.production.example`
- Critical:
  - `DATABASE_URL`
  - `APP_ENV`
  - `INTERNAL_SERVICE_TOKEN`
  - `MARKET_DATA_PROVIDER`
  - `FUNDAMENTALS_PROVIDER`
  - Clerk auth/admin vars

### Frontend env references
- File template: `frontend/.env.local.example`
- Critical:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - Clerk keys
  - `BACKEND_SERVICE_TOKEN`
  - `NEXT_PUBLIC_LOGO_DEV_TOKEN`

### Deployment config
- Render jobs/services: `render.yaml`
- Vercel config: `frontend/vercel.json` and project env dashboard

</details>

<details>
<summary><strong>9) Release Workflow (Branch to Deploy)</strong></summary>

1. Create feature/fix branch from `main`.
2. Implement and run relevant checks.
3. Open PR with:
   - user impact summary
   - risk notes
   - verification evidence
4. Merge to `main`.
5. Confirm:
   - backend deploy healthy (`/health`)
   - frontend deploy healthy
   - key API smoke checks pass
6. Update this runbook if behavior, scripts, or ownership changed.

Minimum verification before merge:
- Backend tests for changed behavior
- Frontend lint/build checks where applicable
- One functional smoke scenario from changed area

</details>

<details>
<summary><strong>10) Non-Technical FAQ</strong></summary>

### Why can a stock look different from another platform?
Data providers differ by update timing, field mapping, and methodology interpretation. BarakFi uses defined internal methodology logic and documented data pipelines.

### What does “stale” mean?
It means fundamentals are older than expected operational threshold. Check freshness endpoints and rerun daily jobs.

### Is this a final religious ruling?
No. Screening is methodology-based analysis using public data and is not a fatwa/certification.

### Why does compare stop for some users?
Compare uses daily quota controls. Exhaustion should return a handled limit state and next-step CTA.

### What if a company logo is missing?
Usually symbol-domain mapping or token configuration issue. Update logo mapping and redeploy.

</details>

<details>
<summary><strong>11) New Member Onboarding Checklist</strong></summary>

### Day 1
- Read this runbook fully.
- Read `README.md`, `docs/rulebook.md`, `docs/data-freshness.md`.
- Understand daily jobs and core status endpoints.
- Run local app and verify one stock screening flow end-to-end.

### Week 1
- Handle one small bug in each area:
  - UI label/copy fix
  - API/status check fix
  - data/ops validation issue
- Perform one incident drill from Incident Playbook.
- Shadow one production deploy.

Expected Week 1 outcomes:
- Can identify correct file/script owner for all common issues.
- Can run and validate daily data refresh pipeline.
- Can explain screening status outputs to non-technical stakeholders.

</details>

<details>
<summary><strong>12) Ownership and Update Cadence</strong></summary>

Primary owner:
- Engineering Lead (BarakFi)

Contributors:
- Backend owner (API, data jobs, quota, screening)
- Frontend owner (UX, status labels, compare UI, logos)
- Ops owner (cron, env, deployment health)

Update trigger (mandatory):
- After every production release that changes:
  - data flow
  - screening behavior
  - compare/quota logic
  - ops scripts/cron
  - onboarding expectations

Monthly hygiene:
- Run a full runbook drill (3 top incidents + data freshness validation)
- Remove outdated paths and dead scripts

</details>

---

## 13) Operator Quick Commands

### Fundamentals refresh
```bash
cd /path/to/halal-invest-app
PYTHONPATH=. python3 fetch_real_data.py
```

### Daily refresh pipeline
```bash
cd /path/to/halal-invest-app
PYTHONPATH=. python3 scripts/run_daily_refresh.py
```

### Core health and status checks
```bash
curl -sS https://api.barakfi.in/health
curl -sS https://api.barakfi.in/api/market-data/status
curl -sS https://api.barakfi.in/api/fundamentals/status
curl -sS https://api.barakfi.in/api/data-stack/status
```

### Symbol freshness spot-check
```bash
curl -sS https://api.barakfi.in/api/stocks/BHARTIARTL
curl -sS https://api.barakfi.in/api/stocks/RELIANCE
curl -sS https://api.barakfi.in/api/stocks/HDFCBANK
```

### Compare and quota checks
```bash
curl -sS https://api.barakfi.in/api/quota
# Compare endpoint should be exercised through authenticated same-origin frontend proxy:
# POST /api/compare/bulk
```

