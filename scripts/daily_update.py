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
    API_BASE_URL    Backend API base including /api (e.g. https://barakfi-api.onrender.com/api)
    INTERNAL_SERVICE_TOKEN  Service token for authenticated endpoints

Examples:
    python scripts/daily_update.py --full-pipeline   # prices + news + screening (Render Cron)
    python scripts/daily_update.py                    # prices only (legacy)
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


def _normalize_api_base_url(raw: str) -> str:
    """Accept full URL or Render ``fromService`` hostport (``name:10000``)."""
    raw = (raw or "").strip().rstrip("/")
    if not raw:
        return "http://localhost:8001/api"
    if "://" not in raw:
        raw = "http://" + raw
    path = raw.split("://", 1)[-1]
    if "/" not in path:
        raw = raw + "/api"
    elif not raw.endswith("/api"):
        raw = raw + "/api"
    return raw.rstrip("/")


API_BASE = _normalize_api_base_url(os.getenv("API_BASE_URL", "http://localhost:8001/api"))
SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")


def _unwrap_api_json(data: dict) -> dict:
    """FastAPI envelope middleware returns { success, data, error }."""
    if isinstance(data, dict) and data.get("success") is True and "data" in data:
        inner = data["data"]
        return inner if isinstance(inner, dict) else {}
    return data


def sync_prices(provider: str = "auto_global", max_stocks: int | None = None, dry_run: bool = False):
    """Call the backend price sync endpoint."""
    url = f"{API_BASE}/market-data/sync-prices"
    headers = {}
    if SERVICE_TOKEN:
        headers["X-Internal-Service-Token"] = SERVICE_TOKEN

    params: dict[str, str | int] = {"provider": provider}
    if max_stocks:
        params["max_stocks"] = max_stocks

    log.info("Syncing prices via %s", url)
    log.info("Provider: %s", provider)

    if dry_run:
        log.info("DRY RUN: Would POST to %s with params %s", url, params)
        return

    try:
        if hasattr(httpx, "post"):
            r = httpx.post(url, params=params, headers=headers, timeout=300.0)
        else:
            r = httpx.post(url, params=params, headers=headers, timeout=300.0)

        if hasattr(r, "status_code"):
            if r.status_code == 200:
                data = _unwrap_api_json(r.json())
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


def run_full_daily_pipeline(dry_run: bool = False) -> None:
    """
    POST /api/internal/daily-refresh — full price sync, news, screening warm-up.
    Use a long read timeout (below) so Render Cron can finish in one HTTP call.
    """
    url = f"{API_BASE.rstrip('/')}/internal/daily-refresh"
    headers = {"Accept": "application/json"}
    if SERVICE_TOKEN:
        headers["X-Internal-Service-Token"] = SERVICE_TOKEN
    else:
        log.error("INTERNAL_SERVICE_TOKEN is not set. Aborting.")
        sys.exit(1)

    # Render allows up to 12h per cron run; use an 11h total timeout (seconds).
    long_timeout = 11 * 3600.0

    log.info("Full pipeline POST %s", url)
    if dry_run:
        log.info("DRY RUN: would POST with %.0fs timeout", long_timeout)
        return

    try:
        if hasattr(httpx, "post"):
            r = httpx.post(url, headers=headers, timeout=long_timeout)
        else:
            r = httpx.post(url, headers=headers, timeout=long_timeout)

        if not hasattr(r, "status_code"):
            log.error("Unexpected response: %s", r)
            sys.exit(1)
        body = r.json() if r.text else {}
        inner = _unwrap_api_json(body) if isinstance(body, dict) else {}
        if r.status_code != 200:
            log.error("Pipeline failed HTTP %s: %s", r.status_code, r.text[:2000])
            sys.exit(1)
        log.info("Pipeline OK: %s", inner)
    except Exception as exc:
        log.error("Pipeline request failed: %s", exc)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Daily data update for Barakfi")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without executing")
    parser.add_argument("--provider", default="auto_global", help="Quote provider (default: auto_global)")
    parser.add_argument("--max-stocks", type=int, default=None, help="Limit stocks to update")
    parser.add_argument("--exchange", choices=["NSE", "US", "LSE"], help="Only update specific exchange")
    parser.add_argument(
        "--full-pipeline",
        action="store_true",
        help="POST /internal/daily-refresh (prices + news + screening). For Render single cron job.",
    )
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("Barakfi Daily Update")
    log.info("API: %s", API_BASE)
    log.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE")
    log.info("=" * 60)

    if not health_check():
        log.error("Backend is not reachable. Aborting.")
        sys.exit(1)

    if args.full_pipeline:
        run_full_daily_pipeline(dry_run=args.dry_run)
        log.info("Full pipeline finished.")
        return

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
