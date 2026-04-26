"""
HTTP client for Financial Modeling Prep (FMP) **stable** API.

Used for experiments toward a single fundamentals source. BarakFi stores Indian
statement totals in **INR Crores** (same convention as ``fundamentals_sync`` /
``yfinance_fallback``); this module normalizes FMP statement numbers when the
vendor reports full INR.

Env:
  FMP_API_KEY — required for live calls (also accepts FINANCIAL_MODELING_PREP_API_KEY).

Docs / pricing:
  https://site.financialmodelingprep.com/developer/docs
  Free tier: 250 calls/day (verify current limits on the pricing page). Many endpoints
return **HTTP 402** on Basic (e.g. ``quote`` for non-US tickers, ``search-isin``).
Use ``profile`` for price/mcap when quote is blocked; resolve ISIN → symbol locally.

Terms:
  Redistribution/display may require a separate FMP agreement — confirm before
  exposing FMP-derived data publicly.
"""

from __future__ import annotations

import os
from typing import Any, Optional

import requests

DEFAULT_STABLE_BASE = "https://financialmodelingprep.com/stable"
_INR_PER_CRORE = 10_000_000.0


class FMPError(RuntimeError):
    """FMP returned an error payload or non-success HTTP status."""


def resolve_api_key() -> str:
    key = (os.getenv("FMP_API_KEY") or os.getenv("FINANCIAL_MODELING_PREP_API_KEY") or "").strip()
    if not key:
        raise FMPError(
            "Missing API key: set FMP_API_KEY (or FINANCIAL_MODELING_PREP_API_KEY) in the environment."
        )
    return key


def fmp_ticker(symbol: str, exchange: str) -> str:
    """Map BarakFi native symbol + exchange to Yahoo-style FMP symbol."""
    sym = symbol.upper().strip()
    ex = exchange.upper().strip()
    if ex == "NSE":
        return f"{sym}.NS"
    if ex == "BSE":
        return f"{sym}.BO"
    return sym


class FMPClient:
    def __init__(self, api_key: str | None = None, base_url: str = DEFAULT_STABLE_BASE, timeout_s: float = 45.0):
        self.api_key = api_key or resolve_api_key()
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def _get(
        self,
        path: str,
        params: Optional[dict[str, Any]] = None,
        *,
        allow_payment_required: bool = False,
    ) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        q = dict(params or {})
        q["apikey"] = self.api_key
        resp = requests.get(url, params=q, timeout=self.timeout_s)
        if resp.status_code == 402 and allow_payment_required:
            return None
        if resp.status_code >= 400:
            raise FMPError(f"HTTP {resp.status_code} for {path}: {resp.text[:500]}")
        data = resp.json()
        if isinstance(data, dict) and data.get("Error Message"):
            raise FMPError(str(data["Error Message"]))
        return data

    def search_isin(self, isin: str, *, allow_payment_required: bool = False) -> Any:
        return self._get(
            "search-isin",
            {"isin": isin.strip().upper()},
            allow_payment_required=allow_payment_required,
        )

    def profile(self, symbol: str) -> Any:
        return self._get("profile", {"symbol": symbol})

    def quote(self, symbol: str, *, allow_payment_required: bool = False) -> Any:
        return self._get("quote", {"symbol": symbol}, allow_payment_required=allow_payment_required)

    def income_statement(self, symbol: str, *, period: str = "annual", limit: int = 5) -> Any:
        return self._get(
            "income-statement",
            {"symbol": symbol, "period": period, "limit": str(limit)},
        )

    def balance_sheet_statement(self, symbol: str, *, period: str = "annual", limit: int = 5) -> Any:
        return self._get(
            "balance-sheet-statement",
            {"symbol": symbol, "period": period, "limit": str(limit)},
        )

    def historical_market_capitalization(self, symbol: str, *, allow_payment_required: bool = False) -> Any:
        return self._get(
            "historical-market-capitalization",
            {"symbol": symbol},
            allow_payment_required=allow_payment_required,
        )


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        x = float(val)
        return x if x == x else None
    except (TypeError, ValueError):
        return None


def _coalesce_float(row: dict[str, Any], *keys: str) -> float | None:
    for k in keys:
        if k in row:
            v = _safe_float(row.get(k))
            if v is not None:
                return v
    return None


def statement_value_to_inr_crores(
    value: float | None,
    *,
    currency: str,
    exchange: str,
) -> float | None:
    """
    Convert a single statement total to INR Crores when we believe FMP used full INR.

    Heuristic matches ``yfinance_fallback``: NSE/BSE + INR → ÷ 1e7.
    For other cases, return the raw float (caller should tag units).
    """
    if value is None:
        return None
    ccy = (currency or "").upper()
    ex = (exchange or "").upper()
    if ex in {"NSE", "BSE"} and ccy == "INR":
        return round(value / _INR_PER_CRORE, 6)
    return round(value, 6)


def first_dict_or_none(payload: Any) -> dict[str, Any] | None:
    """FMP ``profile`` / ``quote`` may return an object or a one-element list."""
    if isinstance(payload, list) and payload and isinstance(payload[0], dict):
        return payload[0]
    if isinstance(payload, dict):
        return payload
    return None


def pick_latest_statement_row(rows: Any) -> dict[str, Any] | None:
    """Choose the most recent annual/quarter row from an FMP statement list."""
    if not isinstance(rows, list) or not rows:
        return None

    def year_of(r: dict[str, Any]) -> int:
        for k in ("calendarYear", "fiscalYear", "year"):
            y = _safe_float(r.get(k))
            if y is not None:
                return int(y)
        return 0

    def date_of(r: dict[str, Any]) -> str:
        return str(r.get("date") or r.get("acceptedDate") or "")

    return max(rows, key=lambda r: (year_of(r), date_of(r)))


def build_barakfi_fundamentals_preview(
    *,
    profile_row: dict[str, Any] | None,
    quote_row: dict[str, Any] | None,
    income_latest: dict[str, Any] | None,
    balance_latest: dict[str, Any] | None,
    exchange: str,
    currency: str | None = None,
) -> dict[str, Any]:
    """
    Map FMP JSON to the **legacy Stock** scalar fields BarakFi screening expects.

    All monetary fields are **INR Crores** when ``exchange`` is NSE/BSE and
    ``currency`` is INR. ``average_market_cap_36m`` is not produced here — keep
    using ``MarketPriceDaily`` + paid-up capital (see ``fundamentals_sync``) or
    optionally derive from ``historical-market-capitalization`` (extra API call).

    ``non_permissible_income`` follows the yfinance-style proxy (other /
    non-operating income), not a Shariah audit.
    """
    ccy = (currency or profile_row.get("currency") if profile_row else None) or "INR"
    ex = exchange.upper()

    def _st(val: float | None) -> float | None:
        return statement_value_to_inr_crores(val, currency=ccy, exchange=ex)

    preview: dict[str, Any] = {
        "market_cap": None,
        "average_market_cap_36m": None,
        "debt": None,
        "revenue": None,
        "total_business_income": None,
        "interest_income": None,
        "non_permissible_income": None,
        "accounts_receivable": None,
        "cash_and_equivalents": None,
        "short_term_investments": None,
        "fixed_assets": None,
        "total_assets": None,
        "price": None,
        "currency": ccy,
        "mapping_notes": [],
    }

    if profile_row:
        mcap_raw = _coalesce_float(profile_row, "mktCap", "marketCap")
        if mcap_raw is not None and ex in {"NSE", "BSE"} and ccy.upper() == "INR":
            preview["market_cap"] = round(mcap_raw / _INR_PER_CRORE, 6)
        elif mcap_raw is not None:
            preview["market_cap"] = round(mcap_raw, 6)
            preview["mapping_notes"].append("market_cap: stored raw; confirm FMP unit for non-INR listings.")
        px = _coalesce_float(profile_row, "price")
        if px is not None:
            preview["price"] = px

    if quote_row:
        px = _coalesce_float(quote_row, "price", "previousClose")
        if px is not None:
            preview["price"] = px

    if income_latest:
        rev = _coalesce_float(
            income_latest,
            "revenue",
            "totalRevenue",
        )
        preview["revenue"] = _st(rev)
        op_rev = _coalesce_float(income_latest, "operatingRevenue")
        op_inc = _coalesce_float(income_latest, "operatingIncome")
        gross = _coalesce_float(income_latest, "grossProfit")
        # Align with yfinance warehouse: business income denominator ≈ total revenue
        tbi = rev
        preview["total_business_income"] = _st(tbi)
        preview["interest_income"] = _st(_coalesce_float(income_latest, "interestIncome"))

        other_net = _coalesce_float(
            income_latest,
            "totalOtherIncomeExpensesNet",
            "otherIncomeExpenseNet",
            "otherExpenses",
        )
        non_op = None
        if op_rev is not None and rev is not None and rev > op_rev:
            non_op = rev - op_rev
        elif other_net is not None and other_net > 0:
            non_op = other_net
        preview["non_permissible_income"] = _st(non_op)
        if non_op is None:
            preview["mapping_notes"].append(
                "non_permissible_income: no FMP proxy found (need operatingRevenue split or other income lines)."
            )
        if preview["total_business_income"] is None and gross is not None:
            preview["total_business_income"] = _st(gross)
            preview["mapping_notes"].append("total_business_income: fell back to grossProfit (revenue missing).")
        if preview["total_business_income"] is None and op_inc is not None:
            preview["total_business_income"] = _st(op_inc)
            preview["mapping_notes"].append("total_business_income: fell back to operatingIncome.")

    if balance_latest:
        td = _coalesce_float(balance_latest, "totalDebt")
        if td is None:
            std = _coalesce_float(balance_latest, "shortTermDebt")
            ltd = _coalesce_float(balance_latest, "longTermDebt")
            if std is not None or ltd is not None:
                td = (std or 0.0) + (ltd or 0.0)
        preview["debt"] = _st(td)
        preview["cash_and_equivalents"] = _st(
            _coalesce_float(balance_latest, "cashAndCashEquivalents", "cashAndShortTermInvestments")
        )
        preview["short_term_investments"] = _st(_coalesce_float(balance_latest, "shortTermInvestments"))
        preview["accounts_receivable"] = _st(
            _coalesce_float(balance_latest, "netReceivables", "accountsReceivables", "accountReceivables")
        )
        preview["fixed_assets"] = _st(
            _coalesce_float(balance_latest, "propertyPlantEquipmentNet", "ppeNet", "netPPE")
        )
        preview["total_assets"] = _st(_coalesce_float(balance_latest, "totalAssets"))

    return preview


def average_market_cap_from_history(
    hist: Any,
    *,
    months: int = 36,
    exchange: str,
    currency: str,
) -> float | None:
    """
    Approximate average market cap over the last *months* from FMP
    ``historical-market-capitalization`` rows (if present).

    Expects a list of objects with ``marketCap`` and ``date`` — verify shape on
    your plan; free tier may omit or limit history for non-US symbols.
    """
    if not isinstance(hist, list) or not hist:
        return None
    ex = exchange.upper()
    ccy = (currency or "INR").upper()
    caps: list[float] = []
    for row in hist:
        if not isinstance(row, dict):
            continue
        m = _safe_float(row.get("marketCap") or row.get("market_cap"))
        if m is None:
            continue
        if ex in {"NSE", "BSE"} and ccy == "INR":
            caps.append(m / _INR_PER_CRORE)
        else:
            caps.append(m)
    if not caps:
        return None
    # FMP usually returns newest first; average a trailing window by count proxy
    window = min(len(caps), max(1, months // 12 + 1))
    slice_caps = caps[:window]
    return round(sum(slice_caps) / len(slice_caps), 6)
