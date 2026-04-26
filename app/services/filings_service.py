"""
Filing-normalization helpers and confidence metadata utilities.

This module provides:
- canonical line-item dictionary
- null-vs-zero metric availability semantics
- stock-level confidence tier heuristics
- aggregate health summaries used by admin/ops APIs
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import FinancialLineItem, FinancialStatement, RawFiling, ScreeningMetrics, Stock

UTC = timezone.utc

# Controlled mapping dictionary used by filings ingest pipeline.
NORMALIZATION_DICTIONARY: dict[str, str] = {
    "borrowings": "total_debt",
    "long term borrowings": "long_term_debt",
    "short term borrowings": "short_term_debt",
    "debt securities": "total_debt",
    "lease liabilities": "lease_liabilities",
    "cash and cash equivalents": "cash",
    "bank balances": "cash",
    "revenue from operations": "revenue",
    "finance costs": "finance_cost",
    "other income": "other_income",
    "interest income": "interest_income",
    "accounts receivable": "accounts_receivable",
    "total assets": "total_assets",
}

REQUIRED_METRICS = (
    "total_debt",
    "total_assets",
    "cash",
    "interest_income",
    "revenue",
)


def normalize_metric_label(label: str) -> str:
    clean = " ".join((label or "").strip().lower().split())
    return NORMALIZATION_DICTIONARY.get(clean, clean.replace(" ", "_"))


def compute_metric_availability(stock: Stock) -> dict[str, str]:
    """
    Availability semantics:
    - available: non-zero numeric value
    - reported_zero: explicit numeric zero
    - unavailable: null/empty/unparseable
    """

    def _state(v: Any) -> str:
        if v is None:
            return "unavailable"
        try:
            n = float(v)
        except Exception:
            return "unavailable"
        return "reported_zero" if n == 0 else "available"

    return {
        "market_cap": _state(stock.market_cap),
        "debt": _state(stock.debt),
        "total_assets": _state(stock.total_assets),
        "cash": _state(stock.cash_and_equivalents),
        "interest_income": _state(stock.interest_income),
        "revenue": _state(stock.revenue),
        "accounts_receivable": _state(stock.accounts_receivable),
        "non_permissible_income": _state(stock.non_permissible_income),
    }


def _line_item_coverage_ratio(db: Session, stock_id: int) -> float:
    stmt = (
        db.query(FinancialStatement)
        .filter(FinancialStatement.company_id == stock_id)
        .order_by(FinancialStatement.created_at.desc())
        .first()
    )
    if not stmt:
        return 0.0
    items = (
        db.query(FinancialLineItem.normalized_metric, FinancialLineItem.value)
        .filter(FinancialLineItem.statement_id == stmt.id)
        .all()
    )
    item_map: dict[str, float | None] = {k: v for k, v in items}
    hits = 0
    for metric in REQUIRED_METRICS:
        val = item_map.get(metric)
        if val is not None:
            hits += 1
    return hits / len(REQUIRED_METRICS)


def estimate_confidence(stock: Stock, db: Session | None = None) -> tuple[float, str]:
    """
    Confidence tiers:
    - 95: xbrl + annual cross-signal and strong coverage
    - 80: filings present and acceptable coverage
    - 60: pdf extraction / weaker structured evidence
    - 40: key metrics missing
    """
    if stock.confidence_score is not None and stock.confidence_tier in {"95", "80", "60", "40"}:
        return float(stock.confidence_score), str(stock.confidence_tier)

    source = (stock.data_source or "").lower()
    availability = compute_metric_availability(stock)
    available_count = sum(1 for v in availability.values() if v == "available")
    coverage = available_count / max(len(availability), 1)

    has_xbrl = "xbrl" in source or "nse" in source
    has_annual = "annual" in source or "report" in source
    pdf_only = "pdf" in source and not has_xbrl

    line_item_cov = _line_item_coverage_ratio(db, stock.id) if db is not None else 0.0
    effective_cov = max(coverage, line_item_cov)

    if has_xbrl and has_annual and effective_cov >= 0.9:
        return 95.0, "95"
    if (has_xbrl or has_annual) and effective_cov >= 0.7:
        return 80.0, "80"
    if pdf_only or effective_cov >= 0.5:
        return 60.0, "60"
    return 40.0, "40"


def filing_ingestion_status(db: Session) -> dict[str, Any]:
    rows = db.query(RawFiling).all()
    if not rows:
        return {
            "total_filings": 0,
            "nse_filings": 0,
            "bse_filings": 0,
            "latest_filing_at": None,
            "extraction_methods": {},
            "confidence_distribution": {},
        }
    source_counter = Counter((r.source or "").upper() for r in rows)
    method_counter = Counter((r.extraction_method or "unknown") for r in rows)
    conf_counter = Counter()
    for r in rows:
        c = r.confidence_score
        if c is None:
            conf_counter["unknown"] += 1
        elif c >= 95:
            conf_counter["95"] += 1
        elif c >= 80:
            conf_counter["80"] += 1
        elif c >= 60:
            conf_counter["60"] += 1
        else:
            conf_counter["40"] += 1
    latest = max((r.filing_date for r in rows if r.filing_date is not None), default=None)
    return {
        "total_filings": len(rows),
        "nse_filings": int(source_counter.get("NSE", 0)),
        "bse_filings": int(source_counter.get("BSE", 0)),
        "latest_filing_at": latest,
        "extraction_methods": dict(method_counter),
        "confidence_distribution": dict(conf_counter),
    }


def metrics_quality_summary(db: Session) -> dict[str, Any]:
    stocks = db.query(Stock).filter(Stock.is_active.is_(True), Stock.exchange == "NSE").all()
    confidence_counter = Counter()
    missing_counter = Counter()
    low_conf_symbols: list[str] = []

    companies_with_metrics = db.query(ScreeningMetrics.company_id).distinct().count()
    for s in stocks:
        score, tier = estimate_confidence(s, db)
        confidence_counter[tier] += 1
        if tier in {"40", "60"} and len(low_conf_symbols) < 20:
            low_conf_symbols.append(s.symbol)
        availability = compute_metric_availability(s)
        for metric, state in availability.items():
            if state == "unavailable":
                missing_counter[metric] += 1

    return {
        "companies_total": len(stocks),
        "companies_with_metrics": int(companies_with_metrics),
        "confidence_distribution": dict(confidence_counter),
        "missing_metric_counts": dict(missing_counter),
        "low_confidence_symbols_preview": low_conf_symbols,
    }


def symbol_evidence_trace(db: Session, stock: Stock) -> dict[str, Any]:
    score, tier = estimate_confidence(stock, db)
    availability = compute_metric_availability(stock)
    filings = (
        db.query(RawFiling)
        .filter(RawFiling.company_id == stock.id)
        .order_by(RawFiling.filing_date.desc().nullslast(), RawFiling.id.desc())
        .limit(5)
        .all()
    )
    filing_refs = [
        {
            "source": (f.source or "NSE").upper(),
            "filing_type": f.filing_type,
            "period": f.period,
            "filing_date": f.filing_date.isoformat() if f.filing_date else None,
            "url": f.url or None,
            "extraction_method": f.extraction_method or None,
        }
        for f in filings
    ]
    notes = [
        "Based on publicly available filings and BarakFi normalization rules.",
        "0 means explicitly reported zero; NULL means unavailable.",
    ]
    return {
        "symbol": stock.symbol,
        "source_exchange": stock.source_exchange or stock.exchange,
        "source_date": stock.source_date or stock.fundamentals_updated_at,
        "confidence_score": score,
        "confidence_tier": tier,
        "metric_availability": availability,
        "filing_refs": filing_refs,
        "notes": notes,
    }
