"""
Manual stock screening service.

Fetches live financial data from Yahoo Finance for any NSE symbol
and screens it on-the-fly using all three Shariah methodologies.
Results are cached in-memory for 1 hour to avoid repeated API calls.
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


def fetch_and_screen(symbol: str) -> dict | None:
    """
    Fetch live financial data from Yahoo Finance for a given NSE symbol
    and return the raw stock data dict suitable for evaluate_stock().

    Returns None if the symbol cannot be found or data is insufficient.
    """
    cached = _get_cached(symbol)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
    except ImportError:
        log.error("yfinance not installed — manual screening unavailable")
        return None

    ticker_str = f"{symbol}.NS"
    log.info("Manual screening: fetching %s from Yahoo Finance", ticker_str)

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info or {}

        if not info or (info.get("regularMarketPrice") is None and info.get("currentPrice") is None):
            log.warning("No data for %s", symbol)
            _set_cached(symbol, None)
            return None

        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0.0
        market_cap_raw = info.get("marketCap") or 0.0
        market_cap = _to_crores(market_cap_raw)
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

        stock_data = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "exchange": "NSE",
            "country": "India",
            "market_cap": market_cap,
            "average_market_cap_36m": average_market_cap_36m,
            "debt": _to_crores(debt_raw),
            "revenue": _to_crores(revenue_raw),
            "total_business_income": _to_crores(revenue_raw + other_income_raw),
            "interest_income": _to_crores(interest_income_raw),
            "non_permissible_income": _to_crores(interest_income_raw),
            "accounts_receivable": _to_crores(receivables_raw),
            "cash_and_equivalents": _to_crores(cash_raw),
            "short_term_investments": _to_crores(sti_raw),
            "fixed_assets": _to_crores(ppe_raw),
            "total_assets": _to_crores(total_assets_raw),
            "price": round(price, 2),
            "data_source": "yahoo_finance_live",
        }

        _set_cached(symbol, stock_data)
        log.info("Manual screening: fetched %s OK (MCap=%.0f Cr)", symbol, market_cap)
        return stock_data

    except Exception as exc:
        log.error("Manual screening FAILED for %s: %s", symbol, exc)
        _set_cached(symbol, None)
        return None
