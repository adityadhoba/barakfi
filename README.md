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

## Lean build strategy

This project is intentionally designed for a low-budget founder path:

- start with FastAPI + SQLite for local validation
- add governance and screening audit trails before broker execution
- keep payments and login external-first where possible
- move to managed infrastructure only when usage justifies the cost

Read `docs/architecture.md` and `docs/security.md` for the recommended scale-up path.
Read `docs/auth.md` for the chosen auth strategy.
