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


def compute_fundamentals_data_quality(stock: Stock) -> DataQuality:
    """
    High: core denominators present for ratio screening.
    Medium: partial.
    Low: missing multiple critical inputs (ratios unreliable).
    """
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
