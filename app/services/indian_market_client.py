"""
Public delayed-style equity quotes (NSE website JSON + Yahoo chart API).

Supports Indian exchanges (NSE, BSE), US exchanges (NYSE, NASDAQ), and the
London Stock Exchange (LSE).  Not an official exchange feed.  Production apps
typically use a licensed vendor (Groww/Kite/Upstox CMOTS, etc.).  These
sources may change or rate-limit without notice.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
}

YAHOO_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Barakfi/1.0; +https://barakfi.in)"}


@dataclass
class EquityQuote:
    symbol: str
    exchange: str
    last_price: float | None
    previous_close: float | None
    change: float | None
    change_percent: float | None
    day_high: float | None
    day_low: float | None
    volume: int | None
    week_52_high: float | None
    week_52_low: float | None
    source: str
    as_of: str
    currency: str = "INR"


IndianEquityQuote = EquityQuote


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _to_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def fetch_nse_equity_quote(symbol: str) -> EquityQuote | None:
    """NSE India `quote-equity` (session cookie required)."""
    sym = symbol.upper().strip()
    try:
        with httpx.Client(timeout=25.0, follow_redirects=True) as client:
            client.get("https://www.nseindia.com/", headers=NSE_HEADERS)
            r = client.get(
                f"https://www.nseindia.com/api/quote-equity?symbol={sym}",
                headers=NSE_HEADERS,
            )
    except httpx.HTTPError:
        return None
    if r.status_code != 200:
        return None
    try:
        data = r.json()
    except Exception:
        return None
    pi = data.get("priceInfo") or {}
    last = _to_float(pi.get("lastPrice"))
    if last is None:
        return None
    prev = _to_float(pi.get("previousClose"))
    change = _to_float(pi.get("change"))
    pchg = _to_float(pi.get("pChange"))
    idhl = pi.get("intraDayHighLow") or {}
    day_hi = _to_float(idhl.get("max"))
    day_lo = _to_float(idhl.get("min"))
    whl = pi.get("weekHighLow") or {}
    w52h = _to_float(whl.get("max"))
    w52l = _to_float(whl.get("min"))
    return EquityQuote(
        symbol=sym,
        exchange="NSE",
        last_price=last,
        previous_close=prev,
        change=change,
        change_percent=pchg,
        day_high=day_hi,
        day_low=day_lo,
        volume=None,
        week_52_high=w52h,
        week_52_low=w52l,
        source="nse_india_public",
        as_of=_iso_now(),
        currency="INR",
    )


def fetch_yahoo_india_quote(symbol: str, exchange: str = "NSE") -> EquityQuote | None:
    """Yahoo Finance chart API: `.NS` for NSE, `.BO` for common BSE tickers."""
    sym = symbol.upper().strip()
    ex = (exchange or "NSE").upper()
    suffix = ".BO" if ex == "BSE" else ".NS"
    ysym = f"{sym}{suffix}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ysym}?interval=1d&range=5d"
    try:
        r = httpx.get(url, headers=YAHOO_HEADERS, timeout=20.0)
    except httpx.HTTPError:
        return None
    if r.status_code != 200:
        return None
    try:
        chart = r.json()["chart"]["result"][0]
    except (KeyError, IndexError, TypeError):
        return None
    meta = chart.get("meta") or {}
    last = _to_float(meta.get("regularMarketPrice"))
    if last is None:
        return None
    prev = _to_float(meta.get("chartPreviousClose"))
    day_hi = _to_float(meta.get("regularMarketDayHigh"))
    day_lo = _to_float(meta.get("regularMarketDayLow"))
    vol = _to_int(meta.get("regularMarketVolume"))
    w52h = _to_float(meta.get("fiftyTwoWeekHigh"))
    w52l = _to_float(meta.get("fiftyTwoWeekLow"))
    chg = (last - prev) if prev is not None else None
    pchg = (100.0 * chg / prev) if prev not in (None, 0) and chg is not None else None
    ycur = (meta.get("currency") or "").strip().upper()
    if isinstance(ycur, str) and len(ycur) == 3:
        currency = ycur
    elif ex in ("LSE", "LON"):
        currency = "GBP"
    elif ex in ("US", "NYSE", "NASDAQ"):
        currency = "USD"
    else:
        currency = "INR"
    return EquityQuote(
        symbol=sym,
        exchange="BSE" if suffix == ".BO" else "NSE",
        last_price=last,
        previous_close=prev,
        change=chg,
        change_percent=pchg,
        day_high=day_hi,
        day_low=day_lo,
        volume=vol,
        week_52_high=w52h,
        week_52_low=w52l,
        source="yahoo_finance_chart",
        as_of=_iso_now(),
        currency=currency,
    )


_EXCHANGE_SUFFIX: dict[str, str] = {
    "NSE": ".NS",
    "BSE": ".BO",
    "US": "",
    "NYSE": "",
    "NASDAQ": "",
    "LSE": ".L",
    "LON": ".L",
}

_EXCHANGE_CANONICAL: dict[str, str] = {
    "NSE": "NSE",
    "BSE": "BSE",
    "US": "US",
    "NYSE": "NYSE",
    "NASDAQ": "NASDAQ",
    "LSE": "LSE",
    "LON": "LSE",
}


def fetch_yahoo_global_quote(symbol: str, exchange: str = "NSE") -> EquityQuote | None:
    """Yahoo Finance chart API for any supported exchange."""
    sym = symbol.upper().strip()
    ex = (exchange or "NSE").upper()
    suffix = _EXCHANGE_SUFFIX.get(ex, ".NS")
    ysym = f"{sym}{suffix}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ysym}?interval=1d&range=5d"
    try:
        r = httpx.get(url, headers=YAHOO_HEADERS, timeout=20.0)
    except httpx.HTTPError:
        return None
    if r.status_code != 200:
        return None
    try:
        chart = r.json()["chart"]["result"][0]
    except (KeyError, IndexError, TypeError):
        return None
    meta = chart.get("meta") or {}
    last = _to_float(meta.get("regularMarketPrice"))
    if last is None:
        return None
    prev = _to_float(meta.get("chartPreviousClose"))
    day_hi = _to_float(meta.get("regularMarketDayHigh"))
    day_lo = _to_float(meta.get("regularMarketDayLow"))
    vol = _to_int(meta.get("regularMarketVolume"))
    w52h = _to_float(meta.get("fiftyTwoWeekHigh"))
    w52l = _to_float(meta.get("fiftyTwoWeekLow"))
    chg = (last - prev) if prev is not None else None
    pchg = (100.0 * chg / prev) if prev not in (None, 0) and chg is not None else None
    ycur = (meta.get("currency") or "").strip().upper()
    if isinstance(ycur, str) and len(ycur) == 3:
        currency = ycur
    elif ex in ("LSE", "LON"):
        currency = "GBP"
    elif ex in ("US", "NYSE", "NASDAQ"):
        currency = "USD"
    else:
        currency = "INR"
    return EquityQuote(
        symbol=sym,
        exchange=_EXCHANGE_CANONICAL.get(ex, ex),
        last_price=last,
        previous_close=prev,
        change=chg,
        change_percent=pchg,
        day_high=day_hi,
        day_low=day_lo,
        volume=vol,
        week_52_high=w52h,
        week_52_low=w52l,
        source="yahoo_finance_chart",
        as_of=_iso_now(),
        currency=currency,
    )


@dataclass
class IndexQuote:
    name: str
    value: float
    change: float
    change_percent: float
    source: str
    as_of: str


NSE_INDEX_NAMES = [
    "NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY PHARMA",
    "NIFTY AUTO", "NIFTY FMCG", "NIFTY METAL", "INDIA VIX",
]


def fetch_nse_indices() -> list[IndexQuote]:
    """Fetch major NSE index values from public JSON endpoint."""
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            client.get("https://www.nseindia.com/", headers=NSE_HEADERS)
            r = client.get(
                "https://www.nseindia.com/api/allIndices",
                headers=NSE_HEADERS,
            )
    except httpx.HTTPError:
        return []
    if r.status_code != 200:
        return []
    try:
        data = r.json().get("data", [])
    except Exception:
        return []

    wanted = set(NSE_INDEX_NAMES)
    results: list[IndexQuote] = []
    for item in data:
        name = item.get("index", "")
        if name not in wanted:
            continue
        val = _to_float(item.get("last"))
        chg = _to_float(item.get("variation"))
        pchg = _to_float(item.get("percentChange"))
        if val is not None:
            results.append(IndexQuote(
                name=name,
                value=val,
                change=chg or 0.0,
                change_percent=pchg or 0.0,
                source="nse_india_public",
                as_of=_iso_now(),
            ))
    return results


def fetch_quote_by_provider(symbol: str, exchange: str, provider: str) -> EquityQuote | None:
    """Resolve quote using configured public provider code."""
    ex = (exchange or "NSE").upper()
    p = provider.strip().lower()

    if p == "nse_public":
        if ex == "BSE":
            return fetch_yahoo_india_quote(symbol, "BSE")
        return fetch_nse_equity_quote(symbol)

    if p == "yahoo_india":
        return fetch_yahoo_india_quote(symbol, ex)

    if p == "auto_india":
        if ex == "BSE":
            return fetch_yahoo_india_quote(symbol, "BSE")
        nse = fetch_nse_equity_quote(symbol)
        if nse:
            return nse
        return fetch_yahoo_india_quote(symbol, "NSE")

    if p == "yahoo_global":
        return fetch_yahoo_global_quote(symbol, ex)

    if p == "auto_global":
        if ex in ("NSE", "BSE"):
            if ex == "BSE":
                return fetch_yahoo_global_quote(symbol, "BSE")
            nse = fetch_nse_equity_quote(symbol)
            if nse:
                return nse
            return fetch_yahoo_global_quote(symbol, "NSE")
        return fetch_yahoo_global_quote(symbol, ex)

    return None


def quote_to_dict(q: EquityQuote) -> dict:
    return {
        "symbol": q.symbol,
        "exchange": q.exchange,
        "last_price": q.last_price,
        "previous_close": q.previous_close,
        "change": q.change,
        "change_percent": q.change_percent,
        "day_high": q.day_high,
        "day_low": q.day_low,
        "volume": q.volume,
        "week_52_high": q.week_52_high,
        "week_52_low": q.week_52_low,
        "source": q.source,
        "as_of": q.as_of,
        "currency": getattr(q, "currency", None) or "INR",
    }
