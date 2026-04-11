"""Resolve a stock row by symbol with optional exchange (multi-listing safe)."""

from sqlalchemy.orm import Session

from app.models import Stock


def resolve_stock(
    db: Session,
    symbol: str,
    exchange: str | None = None,
    *,
    is_etf: bool | None = None,
    active_only: bool = True,
) -> Stock | None:
    sym = symbol.strip().upper()
    q = db.query(Stock).filter(Stock.symbol == sym)
    if active_only:
        q = q.filter(Stock.is_active.is_(True))
    if is_etf is True:
        q = q.filter(Stock.is_etf.is_(True))
    elif is_etf is False:
        q = q.filter(Stock.is_etf.is_(False))
    if exchange:
        ex = exchange.strip().upper()
        return q.filter(Stock.exchange == ex).first()
    row = q.filter(Stock.exchange == "NSE").first()
    if row:
        return row
    return q.order_by(Stock.id.asc()).first()
