"""Batch-fetch public quotes for portfolio holdings (Yahoo/NSE via indian_market_client)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from app.services.indian_market_client import fetch_quote_by_provider

if TYPE_CHECKING:
    from app.models import PortfolioHolding

QUOTE_PROVIDER = "auto_global"


def _exchange_for_quote(stock: object) -> str:
    cur = (getattr(stock, "currency", None) or "INR").upper()
    ex = (getattr(stock, "exchange", None) or "NSE").upper()
    if cur == "USD":
        return "US"
    if cur == "GBP":
        return "LSE"
    return ex


def _fetch_one(symbol: str, exchange: str) -> tuple[str, float | None]:
    q = fetch_quote_by_provider(symbol, exchange, QUOTE_PROVIDER)
    if q and q.last_price is not None and q.last_price > 0:
        return symbol, float(q.last_price)
    return symbol, None


def build_live_last_price_by_symbol(holdings: list["PortfolioHolding"]) -> dict[str, float]:
    """
    One Yahoo/NSE quote per distinct symbol. Values are in the quote currency
    (same units as Stock.price for that listing).
    """
    if not holdings:
        return {}

    tasks: list[tuple[str, str]] = []
    seen: set[str] = set()
    for h in holdings:
        sym = h.stock.symbol.upper()
        if sym in seen:
            continue
        seen.add(sym)
        tasks.append((sym, _exchange_for_quote(h.stock)))

    if not tasks:
        return {}

    out: dict[str, float] = {}
    max_workers = min(16, len(tasks))
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_fetch_one, sym, ex): sym for sym, ex in tasks}
        for fut in as_completed(futures):
            sym, px = fut.result()
            if px is not None:
                out[sym] = px

    return out
