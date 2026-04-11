"""Trending stocks service — derives trending data from the stock universe."""

from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import Stock


def _stock_to_dict(s: Stock) -> dict:
    return {
        "symbol": s.symbol,
        "name": s.name,
        "sector": s.sector,
        "exchange": s.exchange,
        "country": s.country,
        "price": s.price,
        "market_cap": s.market_cap,
        "currency": s.currency,
    }


def get_trending(
    db: Session,
    category: str = "popular",
    exchange: str | None = None,
    limit: int = 20,
) -> list[dict]:
    query = db.query(Stock).filter(Stock.is_active.is_(True))
    if exchange:
        query = query.filter(Stock.exchange == exchange.upper())
    else:
        query = query.filter(Stock.exchange.in_(("NSE", "BSE")))

    if category in ("gainers", "most-active", "popular"):
        query = query.order_by(Stock.market_cap.desc())
    elif category == "losers":
        query = query.filter(Stock.market_cap > 0).order_by(Stock.market_cap.asc())
    elif category == "52w-high":
        query = query.order_by(Stock.price.desc())
    elif category == "52w-low":
        query = query.filter(Stock.price > 0).order_by(Stock.price.asc())
    else:
        query = query.order_by(Stock.market_cap.desc())

    stocks = query.limit(limit).all()
    return [_stock_to_dict(s) for s in stocks]
