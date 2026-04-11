"""
Hybrid market data: optional Financial Modeling Prep (FMP) + local fallbacks.

Set MARKET_DATA_API_KEY in the environment for FMP ETF holdings / fundamentals.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import FMP_API_BASE, MARKET_DATA_API_KEY

logger = logging.getLogger("barakfi")

# ---------------------------------------------------------------------------
# ETF holdings (FMP: etf-holder/{symbol})
# ---------------------------------------------------------------------------


def fetch_etf_holdings_fmp(symbol: str) -> list[dict[str, Any]]:
    """
    Return holdings like [{"symbol": "AAPL", "name": "...", "weight": 6.2}, ...]
    weight is percentage of NAV (0–100) when provided.
    """
    if not MARKET_DATA_API_KEY:
        return []
    sym = symbol.upper().replace(".NS", "").replace(".L", "")
    url = f"{FMP_API_BASE}/etf-holder/{sym}"
    try:
        with httpx.Client(timeout=25.0) as client:
            r = client.get(url, params={"apikey": MARKET_DATA_API_KEY})
            if r.status_code != 200:
                logger.debug("FMP etf-holder %s: HTTP %s", sym, r.status_code)
                return []
            data = r.json()
    except Exception as exc:
        logger.warning("FMP etf-holder failed for %s: %s", sym, exc)
        return []

    if not isinstance(data, list):
        return []

    out: list[dict[str, Any]] = []
    for row in data:
        if not isinstance(row, dict):
            continue
        # FMP field names vary; normalize
        hs = row.get("symbol") or row.get("asset") or row.get("ticker")
        if not hs:
            continue
        name = str(row.get("name") or row.get("assetName") or "")
        w = row.get("weightPercentage") or row.get("weight") or row.get("portfolioWeight")
        try:
            weight = float(w) if w is not None else None
        except (TypeError, ValueError):
            weight = None
        out.append({"symbol": str(hs).upper(), "name": name, "weight": weight})
    return out
