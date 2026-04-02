"""Batch-update `Stock.price` from public Indian quote providers."""

from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.config import MARKET_DATA_PROVIDER
from app.models import Stock
from app.services.indian_market_client import fetch_quote_by_provider

PUBLIC_INDIAN_MARKET_PROVIDERS = frozenset({"nse_public", "yahoo_india", "auto_india"})


def sync_all_stock_prices(
    db: Session,
    *,
    provider: str | None = None,
    max_stocks: int | None = None,
    throttle_sec: float = 0.35,
) -> dict:
    """
    Refresh `price` and `data_source` for active stocks. Uses small delays to
    avoid hammering public endpoints.
    """
    code = (provider or MARKET_DATA_PROVIDER).strip().lower()
    if code not in PUBLIC_INDIAN_MARKET_PROVIDERS:
        return {
            "ok": False,
            "error": "unsupported_provider",
            "detail": f"Use one of {sorted(PUBLIC_INDIAN_MARKET_PROVIDERS)} or set MARKET_DATA_PROVIDER.",
            "provider": code,
            "updated": 0,
            "failed_symbols": [],
            "total": 0,
        }

    stocks = db.query(Stock).filter(Stock.is_active.is_(True)).order_by(Stock.symbol.asc()).all()
    if max_stocks is not None:
        stocks = stocks[: max(0, max_stocks)]

    updated = 0
    failed: list[str] = []
    for s in stocks:
        quote = fetch_quote_by_provider(s.symbol, s.exchange, code)
        if quote and quote.last_price is not None:
            s.price = float(quote.last_price)
            s.data_source = quote.source
            updated += 1
        else:
            failed.append(s.symbol)
        if throttle_sec > 0:
            time.sleep(throttle_sec)

    db.commit()
    return {
        "ok": True,
        "provider": code,
        "updated": updated,
        "failed_symbols": failed,
        "total": len(stocks),
    }
