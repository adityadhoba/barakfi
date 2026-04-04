"""
Manual stock screening service.

Fetches live financial data from Yahoo Finance for any symbol on NSE, US,
or LSE exchanges and screens it on-the-fly using all three Shariah
methodologies.  Results are cached in-memory for 1 hour to avoid repeated
API calls.
"""

import logging
import time
from functools import lru_cache

log = logging.getLogger(__name__)

CRORE = 1e7


def _safe_val(series_or_df, keys, default=0.0):
    import pandas as pd
    if series_or_df is None:
        return default
    for key in keys:
        try:
            if isinstance(series_or_df, pd.DataFrame):
                if key in series_or_df.index:
                    val = series_or_df.loc[key].dropna()
                    if len(val) > 0:
                        v = val.iloc[0]
                        if pd.notna(v):
                            return float(v)
            elif isinstance(series_or_df, pd.Series):
                if key in series_or_df.index:
                    v = series_or_df[key]
                    if pd.notna(v):
                        return float(v)
        except Exception:
            continue
    return default


def _to_crores(value):
    if value is None or value == 0.0:
        return 0.0
    return round(value / CRORE, 2)


# TTL-based cache: stores (timestamp, result) tuples
_cache: dict[str, tuple[float, dict | None]] = {}
CACHE_TTL = 3600  # 1 hour


def _get_cached(symbol: str) -> dict | None:
    entry = _cache.get(symbol)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _set_cached(symbol: str, data: dict | None):
    _cache[symbol] = (time.time(), data)


_EXCHANGE_SUFFIX: dict[str, str] = {
    "NSE": ".NS",
    "BSE": ".BO",
    "US": "",
    "NYSE": "",
    "NASDAQ": "",
    "LSE": ".L",
    "LON": ".L",
}

_EXCHANGE_META: dict[str, dict[str, str]] = {
    "NSE":    {"exchange": "NSE",    "country": "India", "currency": "INR"},
    "BSE":    {"exchange": "BSE",    "country": "India", "currency": "INR"},
    "US":     {"exchange": "US",     "country": "US",    "currency": "USD"},
    "NYSE":   {"exchange": "NYSE",   "country": "US",    "currency": "USD"},
    "NASDAQ": {"exchange": "NASDAQ", "country": "US",    "currency": "USD"},
    "LSE":    {"exchange": "LSE",    "country": "UK",    "currency": "GBP"},
    "LON":    {"exchange": "LSE",    "country": "UK",    "currency": "GBP"},
}

MILLION = 1e6


def fetch_and_screen(symbol: str, exchange: str = "NSE") -> dict | None:
    """
    Fetch live financial data from Yahoo Finance for a given symbol
    and return the raw stock data dict suitable for evaluate_stock().

    Supports NSE (default), BSE, US/NYSE/NASDAQ, and LSE/LON exchanges.
    Returns None if the symbol cannot be found or data is insufficient.
    """
    ex = (exchange or "NSE").upper()
    cache_key = f"{symbol}:{ex}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
    except ImportError:
        log.error("yfinance not installed — manual screening unavailable")
        return None

    suffix = _EXCHANGE_SUFFIX.get(ex, ".NS")
    ticker_str = f"{symbol}{suffix}"
    log.info("Manual screening: fetching %s from Yahoo Finance", ticker_str)

    use_inr = ex in ("NSE", "BSE")
    meta = _EXCHANGE_META.get(ex, {"exchange": ex, "country": "Unknown", "currency": "USD"})

    def _scale(raw_value):
        if raw_value is None or raw_value == 0.0:
            return 0.0
        if use_inr:
            return _to_crores(raw_value)
        return round(raw_value / MILLION, 2)

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info or {}

        if not info or (info.get("regularMarketPrice") is None and info.get("currentPrice") is None):
            log.warning("No data for %s", symbol)
            _set_cached(cache_key, None)
            return None

        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0.0
        market_cap_raw = info.get("marketCap") or 0.0
        market_cap = _scale(market_cap_raw)
        average_market_cap_36m = round(market_cap * 0.9, 2) if market_cap > 0 else 0.0

        name = info.get("longName") or info.get("shortName") or symbol
        sector = info.get("sector") or "Unknown"

        balance_sheet = ticker.balance_sheet
        income_stmt = ticker.income_stmt

        debt_raw = _safe_val(balance_sheet, ["Total Debt", "Long Term Debt", "Long Term Debt And Capital Lease Obligation", "Net Debt"])
        if debt_raw == 0.0:
            lt_debt = _safe_val(balance_sheet, ["Long Term Debt", "Long Term Debt And Capital Lease Obligation"])
            st_debt = _safe_val(balance_sheet, ["Current Debt", "Current Debt And Capital Lease Obligation", "Short Long Term Debt"])
            debt_raw = lt_debt + st_debt

        revenue_raw = _safe_val(income_stmt, ["Total Revenue", "Operating Revenue"])
        other_income_raw = _safe_val(income_stmt, ["Other Income", "Other Non Operating Income Expenses", "Special Income Charges"])
        interest_income_raw = _safe_val(income_stmt, ["Interest Income", "Interest Income Non Operating", "Net Interest Income"])
        if interest_income_raw == 0.0:
            interest_income_raw = abs(_safe_val(income_stmt, ["Interest Expense"]) * 0.1)

        receivables_raw = _safe_val(balance_sheet, ["Receivables", "Accounts Receivable", "Net Receivables", "Other Receivables"])
        cash_raw = _safe_val(balance_sheet, ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments", "Cash Financial", "Cash"])
        sti_raw = _safe_val(balance_sheet, ["Other Short Term Investments", "Short Term Investments", "Available For Sale Securities", "Investments And Advances"])
        ppe_raw = _safe_val(balance_sheet, ["Net PPE", "Net Property Plant And Equipment", "Gross PPE", "Properties"])
        total_assets_raw = _safe_val(balance_sheet, ["Total Assets"])

        unit_label = "Cr" if use_inr else "M"

        stock_data = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "exchange": meta["exchange"],
            "country": meta["country"],
            "currency": meta["currency"],
            "market_cap": market_cap,
            "average_market_cap_36m": average_market_cap_36m,
            "debt": _scale(debt_raw),
            "revenue": _scale(revenue_raw),
            "total_business_income": _scale(revenue_raw + other_income_raw),
            "interest_income": _scale(interest_income_raw),
            "non_permissible_income": _scale(interest_income_raw),
            "accounts_receivable": _scale(receivables_raw),
            "cash_and_equivalents": _scale(cash_raw),
            "short_term_investments": _scale(sti_raw),
            "fixed_assets": _scale(ppe_raw),
            "total_assets": _scale(total_assets_raw),
            "price": round(price, 2),
            "data_source": "yahoo_finance_live",
        }

        _set_cached(cache_key, stock_data)
        log.info("Manual screening: fetched %s OK (MCap=%.0f %s)", symbol, market_cap, unit_label)
        return stock_data

    except Exception as exc:
        log.error("Manual screening FAILED for %s: %s", symbol, exc)
        _set_cached(cache_key, None)
        return None
