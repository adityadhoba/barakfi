"""Resolve a stock row by symbol with optional exchange (multi-listing safe)."""

from sqlalchemy.orm import Session

from app.models import Stock, StockCorporateEvent

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

    def _base_query(*, include_inactive: bool = False):
        query = db.query(Stock).filter(Stock.symbol == sym)
        if not include_inactive and active_only:
            query = query.filter(Stock.is_active.is_(True))
        if is_etf is True:
            query = query.filter(Stock.is_etf.is_(True))
        elif is_etf is False:
            query = query.filter(Stock.is_etf.is_(False))
        return query

    q = _base_query(include_inactive=False)
    if exchange:
        ex = exchange.strip().upper()
        row = q.filter(Stock.exchange == ex).first()
        if not row:
            if active_only:
                legacy = _base_query(include_inactive=True).filter(Stock.exchange == ex).first()
                if legacy:
                    return _resolve_canonical_successor(
                        db,
                        legacy,
                        exchange=exchange,
                        is_etf=is_etf,
                        require_indian_listing=require_indian_listing,
                    )
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
    if active_only:
        legacy = _base_query(include_inactive=True).filter(Stock.exchange == "NSE").first()
        if not legacy:
            legacy = _base_query(include_inactive=True).filter(Stock.exchange == "BSE").first()
        if legacy:
            return _resolve_canonical_successor(
                db,
                legacy,
                exchange=exchange,
                is_etf=is_etf,
                require_indian_listing=require_indian_listing,
            )
    if require_indian_listing:
        return None
    return q.order_by(Stock.id.asc()).first()


def _resolve_canonical_successor(
    db: Session,
    row: Stock,
    *,
    exchange: str | None,
    is_etf: bool | None,
    require_indian_listing: bool,
) -> Stock | None:
    target_symbol = (row.canonical_symbol or row.successor_symbol or "").strip().upper() or None
    if not target_symbol:
        event = (
            db.query(StockCorporateEvent)
            .filter(
                StockCorporateEvent.status == "active",
                StockCorporateEvent.symbol == row.symbol.upper(),
            )
            .order_by(StockCorporateEvent.effective_date.desc(), StockCorporateEvent.id.desc())
            .first()
        )
        if event:
            target_symbol = (
                (event.successor_symbol or event.canonical_symbol or "").strip().upper() or None
            )

    if not target_symbol or target_symbol == row.symbol.upper():
        return None if require_indian_listing and not is_indian_exchange(row.exchange) else row

    target = resolve_stock(
        db,
        target_symbol,
        exchange,
        is_etf=is_etf,
        active_only=True,
        require_indian_listing=require_indian_listing,
    )
    if target:
        return target
    return None if require_indian_listing and not is_indian_exchange(row.exchange) else row
