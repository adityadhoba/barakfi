"""Seed stock_index_memberships from curated NSE lists."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.data.index_constituents import NIFTY_MIDCAP_100, NIFTY_NEXT_50, NIFTY_50
from app.models import Stock, StockIndexMembership

logger = logging.getLogger("barakfi")

_CORE = NIFTY_50 | NIFTY_NEXT_50 | NIFTY_MIDCAP_100


def seed_index_memberships(db: Session) -> int:
    """
    Refresh index membership rows for all NSE stocks in DB.
    Returns number of membership rows inserted.
    """
    nse_stocks = db.query(Stock).filter(Stock.exchange == "NSE", Stock.is_active.is_(True)).all()
    if not nse_stocks:
        return 0

    db.query(StockIndexMembership).delete(synchronize_session=False)
    added = 0
    for s in nse_stocks:
        sym = s.symbol.upper()
        codes: set[str] = {"NIFTY_500"}
        if sym in NIFTY_50:
            codes.add("NIFTY_50")
            codes.add("NIFTY_100")
        if sym in NIFTY_NEXT_50:
            codes.add("NIFTY_NEXT_50")
            codes.add("NIFTY_100")
        if sym in NIFTY_MIDCAP_100:
            codes.add("NIFTY_MIDCAP_100")
        if sym not in _CORE:
            codes.add("NIFTY_SMALLCAP_100")
        for code in sorted(codes):
            db.add(StockIndexMembership(stock_id=s.id, index_code=code))
            added += 1
    db.commit()
    logger.info("[index-membership] Seeded %d membership rows for %d NSE stocks", added, len(nse_stocks))
    return added
