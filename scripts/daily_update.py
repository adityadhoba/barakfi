#!/usr/bin/env python3
"""
Daily data update script for Barakfi.

Calls the backend API to sync stock prices for all exchanges.
Can be run as a cron job via Render, cron-job.org, or locally.

Usage:
    python scripts/daily_update.py                    # Update all exchanges
    python scripts/daily_update.py --exchange NSE     # Only NSE stocks
    python scripts/daily_update.py --dry-run          # Print what would happen

Environment:
    API_BASE_URL    Backend API URL (default: http://localhost:8001/api)
    INTERNAL_SERVICE_TOKEN  Service token for authenticated endpoints
"""

import argparse
import logging
import os
import sys
import time

try:
    import httpx
except ImportError:
    try:
        import requests as httpx
    except ImportError:
        print("ERROR: httpx or requests required. pip install httpx")
        sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("daily_update")

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8001/api")
SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")


def sync_prices(provider: str = "auto_global", max_stocks: int | None = None, dry_run: bool = False):
    """Call the backend price sync endpoint."""
    url = f"{API_BASE}/market-data/sync-prices"
    headers = {}
    if SERVICE_TOKEN:
        headers["X-Internal-Service-Token"] = SERVICE_TOKEN

    payload = {"provider": provider}
    if max_stocks:
        payload["max_stocks"] = max_stocks

    log.info("Syncing prices via %s", url)
    log.info("Provider: %s", provider)

    if dry_run:
        log.info("DRY RUN: Would POST to %s with %s", url, payload)
        return

    try:
        if hasattr(httpx, "post"):
            r = httpx.post(url, json=payload, headers=headers, timeout=300)
        else:
            r = httpx.post(url, json=payload, headers=headers, timeout=300)

        if hasattr(r, "status_code"):
            if r.status_code == 200:
                data = r.json()
                log.info("Price sync complete: %s", data)
            else:
                log.error("Price sync failed: HTTP %d — %s", r.status_code, r.text[:500])
        else:
            log.error("Unexpected response: %s", r)
    except Exception as exc:
        log.error("Price sync request failed: %s", exc)


def health_check():
    """Verify the backend is reachable."""
    url = f"{API_BASE.replace('/api', '')}/health"
    try:
        if hasattr(httpx, "get"):
            r = httpx.get(url, timeout=10)
        else:
            r = httpx.get(url, timeout=10)
        if hasattr(r, "status_code") and r.status_code == 200:
            log.info("Backend health check: OK")
            return True
        log.warning("Backend health check: HTTP %s", getattr(r, "status_code", "?"))
        return False
    except Exception as exc:
        log.error("Backend unreachable: %s", exc)
        return False


def main():
    parser = argparse.ArgumentParser(description="Daily data update for Barakfi")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without executing")
    parser.add_argument("--provider", default="auto_global", help="Quote provider (default: auto_global)")
    parser.add_argument("--max-stocks", type=int, default=None, help="Limit stocks to update")
    parser.add_argument("--exchange", choices=["NSE", "US", "LSE"], help="Only update specific exchange")
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("Barakfi Daily Update")
    log.info("API: %s", API_BASE)
    log.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE")
    log.info("=" * 60)

    if not health_check():
        log.error("Backend is not reachable. Aborting.")
        sys.exit(1)

    provider = args.provider
    if args.exchange == "NSE":
        provider = "auto_india"
    elif args.exchange in ("US", "LSE"):
        provider = "yahoo_global"

    sync_prices(provider=provider, max_stocks=args.max_stocks, dry_run=args.dry_run)

    log.info("")
    log.info("Daily update complete.")


if __name__ == "__main__":
    main()
