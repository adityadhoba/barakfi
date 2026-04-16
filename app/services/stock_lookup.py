"""Resolve a stock row by symbol with optional exchange (multi-listing safe)."""

from sqlalchemy.orm import Session

from app.models import Stock, StockSymbolAlias

# Public product APIs only expose Indian listings (safe mode; global rows may still exist in DB).
INDIAN_EXCHANGES: frozenset[str] = frozenset({"NSE", "BSE"})


def is_indian_exchange(exchange: str | None) -> bool:
    if not exchange:
        return False
    return exchange.strip().upper() in INDIAN_EXCHANGES


def resolve_stock(
    db: Session,
    symbol: str,
    exchange: str | None = None,
    *,
    is_etf: bool | None = None,
    active_only: bool = True,
    require_indian_listing: bool = False,
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
        row = q.filter(Stock.exchange == ex).first()
        if not row:
            return None
        if require_indian_listing and not is_indian_exchange(row.exchange):
            return None
        return row
    row = q.filter(Stock.exchange == "NSE").first()
    if row:
        return row
    row = q.filter(Stock.exchange == "BSE").first()
    if row:
        return row
    if require_indian_listing:
        alias = (
            db.query(StockSymbolAlias)
            .filter(
                StockSymbolAlias.old_symbol == sym,
                StockSymbolAlias.status == "active",
            )
            .first()
        )
        if alias and alias.new_symbol:
            return resolve_stock(
                db,
                alias.new_symbol,
                exchange,
                is_etf=is_etf,
                active_only=active_only,
                require_indian_listing=require_indian_listing,
            )
        return None
    fallback = q.order_by(Stock.id.asc()).first()
    if fallback:
        return fallback
    alias = (
        db.query(StockSymbolAlias)
        .filter(
            StockSymbolAlias.old_symbol == sym,
            StockSymbolAlias.status == "active",
        )
        .first()
    )
    if alias and alias.new_symbol:
        return resolve_stock(
            db,
            alias.new_symbol,
            exchange,
            is_etf=is_etf,
            active_only=active_only,
            require_indian_listing=require_indian_listing,
        )
    return None
