"""
Batch-update Stock fundamentals from Yahoo Finance via ``fetch_real_data``.

Used by ``POST /api/internal/daily-refresh`` so screening runs on fresh DB ratios.
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

from app.database import SessionLocal
from app.models import Stock

logger = logging.getLogger("barakfi")

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def _exchange_for_yfinance(exchange: str | None) -> str:
    ex = (exchange or "NSE").strip().upper()
    if ex in ("NSE", "BSE"):
        return "NSE"
    if ex in ("NYSE", "NASDAQ", "US", "AMEX"):
        return "US"
    if ex in ("LSE", "LON"):
        return "LSE"
    return "NSE"


def sync_fundamentals_yfinance_batch(
    *,
    max_stocks: int | None = None,
    start_offset: int = 0,
) -> dict:
    """
    For each active non-ETF stock (ordered by symbol), call ``fetch_real_data.fetch_stock_data``
    and persist via ``write_to_database`` (same path as ``python fetch_real_data.py``).

    Returns counts and paging hints for cron slicing.
    """
    try:
        import fetch_real_data as frd  # noqa: WPS433 — repo-root module
    except ImportError as e:
        return {
            "ok": False,
            "error": "fetch_real_data_unavailable",
            "detail": str(e),
            "fetched": 0,
            "failed_symbols": [],
            "total_candidates": 0,
            "start_offset": start_offset,
            "next_offset": start_offset,
        }

    failed: list[str] = []
    batch: list[dict] = []

    db = SessionLocal()
    try:
        q = (
            db.query(Stock)
            .filter(Stock.is_active.is_(True), Stock.is_etf.is_(False))
            .order_by(Stock.symbol.asc())
        )
        rows = q.all()
        if start_offset > 0:
            rows = rows[start_offset:]
        if max_stocks is not None:
            rows = rows[: max(0, max_stocks)]

        for s in rows:
            ex = _exchange_for_yfinance(s.exchange)
            try:
                row = frd.fetch_stock_data(s.symbol, ex)
            except Exception as exc:
                logger.exception("fundamentals fetch %s: %s", s.symbol, exc)
                failed.append(s.symbol)
                row = None
            if row:
                batch.append(row)
            elif s.symbol not in failed:
                failed.append(s.symbol)
            time.sleep(getattr(frd, "RATE_LIMIT_SECONDS", 0.5))

        if batch:
            frd.write_to_database(batch)

        n = len(rows)
        return {
            "ok": True,
            "fetched": len(batch),
            "failed_symbols": failed,
            "total_candidates": n,
            "start_offset": start_offset,
            "next_offset": start_offset + n,
            "source": "yahoo_finance_via_fetch_real_data",
        }
    finally:
        db.close()

