# Barakfi API

Lean backend MVP for screening Indian stocks using a source-backed Shariah rulebook.

## What it does today

- Stores a local stock universe in SQLite
- Applies a rulebook-driven compliance engine
- Separates hard failures from manual-review cases
- Exposes FastAPI endpoints for stocks, screening, and rulebook metadata
- Keeps broker execution out of scope until compliance, data, and governance are stronger

## Quick start

```bash
source halal-env/bin/activate
pip install -r requirements.txt
python fetch_data.py
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for Swagger UI.
Open `http://127.0.0.1:8000/app` for the founder dashboard UI.

## Environment settings

Current local `.env` supports:

- `DATABASE_URL`
- `APP_ENV`
- `APP_VERSION`
- `DEBUG`
- `CORS_ORIGINS`
- `AUTH_PROVIDER`
- `AUTH_GOOGLE_ENABLED`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWKS_URL`
- `CLERK_JS_URL`

## Current API

- `GET /`
- `GET /health`
- `GET /app`
- `GET /api/auth/strategy`
- `GET /api/stocks`
- `GET /api/stocks?halal_only=true`
- `GET /api/stocks/{symbol}`
- `GET /api/screen/{symbol}`
- `GET /api/rulebook`

## Compliance approach

The app now exposes one strict product profile:

- `india_strict`: the only screening profile used by the product

This primary profile is anchored to the current S&P Shariah methodology and uses ICIF-referenced India screens as a secondary verification layer.
Read the detailed compliance note in `docs/rulebook.md`.

## Important note

This project should not claim final Shariah certification yet. Production use needs:

- a qualified Shariah supervisory/advisory review
- licensed financial data feeds
- documented change control for compliance rules
- legal and regulatory review before broker execution

## Data Automation

### Weekday Daily Refresh Jobs

Run two jobs in order (Mon–Fri, IST):

1. **Job A — Fundamentals ingestion first**
2. **Job B — Internal daily refresh (prices + screening warm-up)**

### Job A: Fundamentals

```bash
PYTHONPATH=. python3 fetch_real_data.py
```

Schedule:

- **03:15 IST, Mon–Fri**
- UTC cron: `45 21 * * 1-5`

### Job B: Daily refresh pipeline

```bash
PYTHONPATH=. python3 scripts/run_daily_refresh.py
```

This calls backend `POST /api/internal/daily-refresh` with `X-Internal-Service-Token`.

Schedule:

- **04:30 IST, Mon–Fri**
- UTC cron: `0 23 * * 1-5`

### Render Cron Jobs

The `render.yaml` Blueprint includes both jobs above. To activate:

1. Go to Render Dashboard → Blueprints
2. Connect the repository
3. Render will create both weekday cron jobs automatically

### Manual fundamentals refresh

To fetch fresh financial data:

```bash
PYTHONPATH=. python3 fetch_real_data.py --dry-run
PYTHONPATH=. python3 fetch_real_data.py
```

### External scheduler (alternative)

If you use an external scheduler, keep the same two-job order and times.

Keep-alive pings are optional and should be enabled only when your backend plan can sleep on idle.

## Lean build strategy

This project is intentionally designed for a low-budget founder path:

- start with FastAPI + SQLite for local validation
- add governance and screening audit trails before broker execution
- keep payments and login external-first where possible
- move to managed infrastructure only when usage justifies the cost

Read `docs/architecture.md` and `docs/security.md` for the recommended scale-up path.
Read `docs/auth.md` for the chosen auth strategy.
