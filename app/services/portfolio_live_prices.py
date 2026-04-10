"""Batch-fetch public quotes for portfolio holdings (Yahoo/NSE via indian_market_client)."""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING

from app.services.indian_market_client import fetch_quote_by_provider

if TYPE_CHECKING:
    from app.models import PortfolioHolding

QUOTE_PROVIDER = "auto_global"

# Align with frontend batch-quote refresh; reduces duplicate HTTP on rapid workspace refreshes.
_CACHE_TTL_SECONDS = 60.0
_CACHE_LOCK = threading.Lock()
# (symbol, exchange) -> (last_price, expiry_monotonic)
_PRICE_CACHE: dict[tuple[str, str], tuple[float, float]] = {}


def _exchange_for_quote(stock: object) -> str:
    cur = (getattr(stock, "currency", None) or "INR").upper()
    ex = (getattr(stock, "exchange", None) or "NSE").upper()
    if cur == "USD":
        return "US"
    if cur == "GBP":
        return "LSE"
    return ex


def _fetch_one(symbol: str, exchange: str) -> tuple[str, str, float | None]:
    try:
        q = fetch_quote_by_provider(symbol, exchange, QUOTE_PROVIDER)
        if q and q.last_price is not None and q.last_price > 0:
            return symbol, exchange, float(q.last_price)
    except Exception:
        pass
    return symbol, exchange, None


def _cache_get_price(symbol: str, exchange: str) -> float | None:
    """Return cached last_price if fresh; None if missing or expired."""
    key = (symbol.upper(), exchange.upper())
    now = time.monotonic()
    with _CACHE_LOCK:
        row = _PRICE_CACHE.get(key)
        if not row:
            return None
        price, expires = row
        if now >= expires:
            del _PRICE_CACHE[key]
            return None
        return price


def _cache_set_price(symbol: str, exchange: str, price: float) -> None:
    key = (symbol.upper(), exchange.upper())
    expires = time.monotonic() + _CACHE_TTL_SECONDS
    with _CACHE_LOCK:
        _PRICE_CACHE[key] = (price, expires)


def clear_portfolio_quote_cache() -> None:
    """Test helper: drop all cached entries."""
    with _CACHE_LOCK:
        _PRICE_CACHE.clear()


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
    to_fetch: list[tuple[str, str]] = []
    for sym, ex in tasks:
        cached = _cache_get_price(sym, ex)
        if cached is not None:
            out[sym] = cached
        else:
            to_fetch.append((sym, ex))

    if not to_fetch:
        return out

    # Cap workers to avoid tripping Yahoo/NSE rate limits when many holdings refresh at once.
    max_workers = min(4, len(to_fetch))
    workspace_quote_wait_seconds = 25.0
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_fetch_one, sym, ex): (sym, ex) for sym, ex in to_fetch}
        try:
            for fut in as_completed(futures, timeout=workspace_quote_wait_seconds):
                try:
                    sym, ex, px = fut.result()
                except Exception:
                    continue
                if px is not None:
                    _cache_set_price(sym, ex, px)
                    out[sym] = px
        except TimeoutError:
            # Partial quotes + DB fallback for remaining symbols; avoids blocking workspace on slow vendors.
            pass

    return out
