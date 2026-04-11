"""Batch-update `Stock.price` from public market quote providers (India, US, LSE)."""

from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.config import MARKET_DATA_PROVIDER
from app.models import Stock
from app.services.indian_market_client import fetch_quote_by_provider

PUBLIC_MARKET_PROVIDERS = frozenset({
    "nse_public", "yahoo_india", "auto_india",
    "yahoo_global", "auto_global",
})

PUBLIC_INDIAN_MARKET_PROVIDERS = PUBLIC_MARKET_PROVIDERS


def sync_all_stock_prices(
    db: Session,
    *,
    provider: str | None = None,
    max_stocks: int | None = None,
    start_offset: int = 0,
    throttle_sec: float = 0.35,
) -> dict:
    """
    Refresh `price` and `data_source` for active stocks. Uses small delays to
    avoid hammering public endpoints.

    ``start_offset`` skips the first N rows (ordered by symbol) so callers can
    split work across short HTTP timeouts (e.g. 30s cron jobs).
    """
    code = (provider or MARKET_DATA_PROVIDER).strip().lower()
    if code not in PUBLIC_MARKET_PROVIDERS:
        return {
            "ok": False,
            "error": "unsupported_provider",
            "detail": f"Use one of {sorted(PUBLIC_MARKET_PROVIDERS)} or set MARKET_DATA_PROVIDER.",
            "provider": code,
            "updated": 0,
            "failed_symbols": [],
            "total": 0,
        }

    stocks = db.query(Stock).filter(Stock.is_active.is_(True)).order_by(Stock.symbol.asc()).all()
    if start_offset > 0:
        stocks = stocks[start_offset:]
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
        "start_offset": start_offset,
        "next_offset": start_offset + len(stocks),
    }
