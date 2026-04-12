"""Heuristic completeness score for fundamentals exposed on stock APIs."""

from __future__ import annotations

import math
from typing import Literal

from app.models import Stock

DataQuality = Literal["high", "medium", "low"]

def _f(v: object) -> float:
    try:
        x = float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if not math.isfinite(x) else x


def _missing_fundamentals_fields(stock: Stock) -> list[str]:
    """Return sorted list of field keys that are zero / unusable for screening."""
    missing: list[str] = []
    if _f(stock.market_cap) <= 0:
        missing.append("market_cap")
    if _f(stock.total_business_income) <= 0:
        missing.append("total_business_income")
    if _f(stock.total_assets) <= 0:
        missing.append("total_assets")
    if _f(stock.revenue) <= 0:
        missing.append("revenue")
    # debt may be legitimately 0 — do not flag
    if _f(stock.average_market_cap_36m) <= 0:
        missing.append("average_market_cap_36m")
    return sorted(missing)


def compute_fundamentals_data_quality(stock: Stock) -> DataQuality:
    """
    High: core denominators present for ratio screening.
    Medium: partial.
    Low: missing multiple critical inputs (ratios unreliable).
    """
    missing = _missing_fundamentals_fields(stock)
    mc = _f(stock.market_cap)
    tbi = _f(stock.total_business_income)
    ta = _f(stock.total_assets)
    rev = _f(stock.revenue)
    debt = _f(stock.debt)

    core_ok = mc > 0 and tbi > 0 and ta > 0
    secondary_ok = rev > 0 or debt >= 0  # debt can legitimately be 0

    if core_ok and secondary_ok:
        return "high"
    if (mc > 0 and ta > 0) or (mc > 0 and tbi > 0) or (ta > 0 and tbi > 0):
        return "medium"
    return "low"


def fundamentals_completeness_payload(stock: Stock) -> tuple[DataQuality, list[str]]:
    """data_quality plus explicit missing field keys for API transparency."""
    missing = _missing_fundamentals_fields(stock)
    return compute_fundamentals_data_quality(stock), missing
