"""
Sync ETF holdings into `etf_holdings` from yfinance (and optional FMP).

Usage from repo root:
  python -m app.scripts.sync_etf_holdings
"""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models import Stock
from app.services.etf_holdings_sync import sync_etf_holdings_for_stock

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("sync_etf_holdings")


def main() -> None:
    db = SessionLocal()
    try:
        etfs = db.query(Stock).filter(Stock.is_etf.is_(True), Stock.is_active.is_(True)).all()
        if not etfs:
            log.warning("No ETFs found (fetch stocks with is_etf or quoteType ETF).")
            return
        for e in etfs:
            n = sync_etf_holdings_for_stock(db, e)
            log.info("%s (%s): %d holdings", e.symbol, e.exchange, n)
    finally:
        db.close()


if __name__ == "__main__":
    main()
