#!/usr/bin/env python3
"""
Run the internal daily refresh pipeline.

Calls:
    POST /api/internal/daily-refresh
with:
    X-Internal-Service-Token

Usage:
    PYTHONPATH=. python3 scripts/run_daily_refresh.py
    PYTHONPATH=. python3 scripts/run_daily_refresh.py --screen-chunk-size 200
"""

import argparse
import logging
import os
import sys

try:
    import httpx
except ImportError:
    print("ERROR: httpx required. Install with `pip install httpx`.")
    sys.exit(1)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("run_daily_refresh")


def _normalize_api_base(raw: str) -> str:
    candidate = (raw or "").strip()
    if not candidate:
        candidate = "http://localhost:8001/api"
    if not candidate.startswith(("http://", "https://")):
        candidate = f"https://{candidate}"
    normalized = candidate.rstrip("/")
    if not normalized.endswith("/api"):
        normalized = f"{normalized}/api"
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description="Run /api/internal/daily-refresh")
    parser.add_argument(
        "--screen-chunk-size",
        type=int,
        default=150,
        help="Chunk size for internal screening warm-up (default: 150)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print request details without making network calls",
    )
    args = parser.parse_args()

    api_base = _normalize_api_base(os.getenv("API_BASE_URL", "http://localhost:8001/api"))
    token = (os.getenv("INTERNAL_SERVICE_TOKEN") or "").strip()

    url = f"{api_base}/internal/daily-refresh"
    params = {"screen_chunk_size": str(args.screen_chunk_size)}
    headers = {"Accept": "application/json"}
    if token:
        headers["X-Internal-Service-Token"] = token

    log.info("Daily refresh URL: %s", url)
    log.info("screen_chunk_size=%d", args.screen_chunk_size)
    if args.dry_run:
        log.info("DRY RUN: no request sent")
        return 0
    if not token:
        log.error("INTERNAL_SERVICE_TOKEN is required for /api/internal/daily-refresh")
        return 1

    try:
        with httpx.Client(timeout=360.0) as client:
            response = client.post(url, params=params, headers=headers)
        if response.status_code >= 400:
            snippet = response.text[:700]
            log.error("Daily refresh failed: HTTP %d — %s", response.status_code, snippet)
            return 1
        payload = response.json()
        log.info("Daily refresh completed: %s", payload)
        return 0
    except Exception as exc:
        log.error("Daily refresh request failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
