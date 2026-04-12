# Scripts — BarakFi Operations

## Expanding the stock universe to ~800 names

The target is ~800 Indian stocks (NSE + BSE). Use the layered approach below.

### Step 1: Fetch index constituents

```bash
# Nifty 50 (default)
PYTHONPATH=. python3 scripts/fetch_nse_universe.py

# Nifty 100
PYTHONPATH=. python3 scripts/fetch_nse_universe.py --index NIFTY100

# Nifty 500 (gets you ~500 names in one go)
PYTHONPATH=. python3 scripts/fetch_nse_universe.py --index NIFTY500

# Dry-run: print symbols only
PYTHONPATH=. python3 scripts/fetch_nse_universe.py --index NIFTY500 --list-only
```

New stocks are inserted with placeholder fundamentals and will show as **CAUTIOUS** until real data loads.

### Step 2: Backfill fundamentals and prices

```bash
# Daily update (prices + fundamentals for all DB stocks)
PYTHONPATH=. python3 scripts/daily_update.py

# Prices only (faster, for intraday refresh)
PYTHONPATH=. python3 scripts/update_prices.py
```

Both scripts are idempotent and safe to run repeatedly. Watch rate limits — Yahoo Finance throttles after ~1 000 requests in quick succession.

### Step 3: Quality check

After bulk ingest, check data quality via the API:

```
GET /api/stocks?limit=20&sort=data_quality
```

Stocks with `data_quality: "low"` need fundamentals. Re-run `daily_update.py` or manually trigger Yahoo fetches.

### Step 4 (optional): DB purge of non-Indian stocks

```bash
# Dry run — lists what would be deleted
PYTHONPATH=. python3 scripts/purge_non_indian_stocks.py

# Execute — deletes non-NSE/BSE stocks and their dependents
PYTHONPATH=. python3 scripts/purge_non_indian_stocks.py --execute
```

**Always back up the database before running with `--execute`.**
