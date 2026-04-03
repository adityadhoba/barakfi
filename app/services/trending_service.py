"""
Trending stocks service.

Provides categorised stock lists: gainers, losers, most active,
52-week highs/lows, and most popular (by watchlist count).
"""

from sqlalchemy.orm import Session
from app.models import Stock, WatchlistEntry
from sqlalchemy import func, desc, asc


def get_top_gainers(db: Session, exchange: str | None = None, limit: int = 20):
    q = db.query(Stock).filter(Stock.is_active == True, Stock.is_etf == False, Stock.price_change_pct != None)
    if exchange:
        q = q.filter(Stock.exchange == exchange)
    return q.order_by(desc(Stock.price_change_pct)).limit(limit).all()


def get_top_losers(db: Session, exchange: str | None = None, limit: int = 20):
    q = db.query(Stock).filter(Stock.is_active == True, Stock.is_etf == False, Stock.price_change_pct != None)
    if exchange:
        q = q.filter(Stock.exchange == exchange)
    return q.order_by(asc(Stock.price_change_pct)).limit(limit).all()


def get_most_active(db: Session, exchange: str | None = None, limit: int = 20):
    q = db.query(Stock).filter(Stock.is_active == True, Stock.is_etf == False, Stock.avg_volume != None)
    if exchange:
        q = q.filter(Stock.exchange == exchange)
    return q.order_by(desc(Stock.avg_volume)).limit(limit).all()


def get_52w_high(db: Session, exchange: str | None = None, limit: int = 20):
    q = db.query(Stock).filter(
        Stock.is_active == True, Stock.is_etf == False,
        Stock.week_52_high != None, Stock.price > 0,
    )
    if exchange:
        q = q.filter(Stock.exchange == exchange)
    stocks = q.all()
    ranked = sorted(stocks, key=lambda s: s.price / s.week_52_high if s.week_52_high else 0, reverse=True)
    return ranked[:limit]


def get_52w_low(db: Session, exchange: str | None = None, limit: int = 20):
    q = db.query(Stock).filter(
        Stock.is_active == True, Stock.is_etf == False,
        Stock.week_52_low != None, Stock.price > 0,
    )
    if exchange:
        q = q.filter(Stock.exchange == exchange)
    stocks = q.all()
    ranked = sorted(stocks, key=lambda s: s.price / s.week_52_low if s.week_52_low else 999, reverse=False)
    return ranked[:limit]


def get_most_popular(db: Session, limit: int = 20):
    results = (
        db.query(Stock, func.count(WatchlistEntry.id).label("wl_count"))
        .join(WatchlistEntry, WatchlistEntry.stock_id == Stock.id)
        .filter(Stock.is_active == True, Stock.is_etf == False)
        .group_by(Stock.id)
        .order_by(desc("wl_count"))
        .limit(limit)
        .all()
    )
    return [r[0] for r in results]
