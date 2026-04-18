"""
API v1 routes — ISIN-first, provenance-first architecture.

Endpoints:
  GET /api/v1/universe                      — Coverage universe (Nifty 500 etc.)
  GET /api/v1/stocks/{exchange}/{symbol}    — Stock master + latest screening + provenance
  GET /api/v1/stocks/{exchange}/{symbol}/history — Screening history + corporate actions
  GET /api/v1/admin/freshness              — Data freshness dashboard (internal)
  GET /api/v1/admin/job-runs              — Job run log (internal)
  POST /api/v1/admin/trigger-screening    — Trigger screening recompute for a symbol

All responses follow the envelope format: {success, data, error, meta}.
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.envelope import api_error

logger = logging.getLogger("barakfi.v1")
UTC = timezone.utc

router_v1 = APIRouter(prefix="/api/v1", tags=["v1"])


# ---------------------------------------------------------------------------
# Internal auth helper
# ---------------------------------------------------------------------------

def _require_internal_token(x_service_token: Optional[str] = Header(None, alias="X-Service-Token")):
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not token or x_service_token != token:
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# Helper: format a screening result for the public API
# ---------------------------------------------------------------------------

def _format_screening_result(result, issuer, listing) -> Dict[str, Any]:
    """Build the public-facing screening payload from ORM objects."""
    return {
        "overall_status": result.overall_status if result else "insufficient_data",
        "short_reason": result.short_reason if result else "No screening result available yet.",
        "detailed_reason": result.detailed_reason if result else "",
        "explainability": result.explainability_json if result else {},
        "last_updated": result.last_updated.isoformat() if result and result.last_updated else None,
        "screened_at": result.screened_at.isoformat() if result and result.screened_at else None,
        "methodology_version": (
            result.explainability_json.get("methodology_version")
            if result and result.explainability_json
            else None
        ),
        "disclosure": (
            result.explainability_json.get("disclosure")
            if result and result.explainability_json
            else None
        ),
        "freshness": (
            result.explainability_json.get("freshness")
            if result and result.explainability_json
            else {"stale": True}
        ),
    }


def _format_issuer_listing(issuer, listing) -> Dict[str, Any]:
    """Build issuer+listing metadata payload."""
    return {
        "isin": issuer.canonical_isin,
        "symbol": listing.symbol if listing else None,
        "exchange_code": listing.exchange_code if listing else None,
        "name": issuer.display_name or issuer.legal_name,
        "legal_name": issuer.legal_name,
        "sector": issuer.sector_label,
        "industry": issuer.industry_label,
        "coverage_universe": issuer.coverage_universe,
        "lifecycle_status": issuer.lifecycle_status,
        "bse_scrip_code": listing.bse_scrip_code if listing else None,
        "listing_date": listing.listing_date.isoformat() if listing and listing.listing_date else None,
        "listing_status": listing.listing_status if listing else None,
    }


# ---------------------------------------------------------------------------
# GET /api/v1/universe
# ---------------------------------------------------------------------------

@router_v1.get("/universe")
def get_universe(
    scope: str = Query(default="nifty500", description="Coverage universe scope"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    List all covered issuers in the given universe scope.

    Returns: {items: [...], total, page, page_size, scope}
    """
    try:
        from app.models_v2 import Issuer, ListingV2, ScreeningResultV2

        q = db.query(Issuer).filter(
            Issuer.lifecycle_status == "active",
            Issuer.coverage_universe == scope,
        )
        total = q.count()
        issuers = q.offset((page - 1) * page_size).limit(page_size).all()

        items = []
        for issuer in issuers:
            primary_listing = (
                db.query(ListingV2)
                .filter_by(issuer_id=issuer.id, current_is_primary=True)
                .first()
            ) or (
                db.query(ListingV2).filter_by(issuer_id=issuer.id).first()
            )

            latest_result = (
                db.query(ScreeningResultV2)
                .filter_by(issuer_id=issuer.id)
                .order_by(ScreeningResultV2.last_updated.desc())
                .first()
            )

            items.append({
                **_format_issuer_listing(issuer, primary_listing),
                "screening_status": latest_result.overall_status if latest_result else "insufficient_data",
                "last_screened_at": latest_result.last_updated.isoformat() if latest_result else None,
            })

        return {
            "success": True,
            "data": {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "scope": scope,
            },
        }
    except Exception as exc:
        logger.exception("Universe endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /api/v1/stocks/{exchange}/{symbol}
# ---------------------------------------------------------------------------

@router_v1.get("/stocks/{exchange}/{symbol}")
def get_stock_v1(
    exchange: str,
    symbol: str,
    db: Session = Depends(get_db),
):
    """
    Full stock detail: master data + latest screening result + provenance.

    Provenance fields include:
    - methodology_version
    - financials_basis (annual_audited, quarterly_reported, etc.)
    - financial_snapshot_date
    - source_refs (links to official filings)
    - freshness (stale flag)
    """
    from app.models_v2 import Issuer, ListingV2, ScreeningResultV2, FundamentalsSnapshot, MarketPriceDaily

    exchange_upper = exchange.upper()
    symbol_upper = symbol.upper()

    listing = (
        db.query(ListingV2)
        .filter_by(exchange_code=exchange_upper, symbol=symbol_upper)
        .first()
    )
    if listing is None:
        raise HTTPException(
            status_code=404,
            detail=f"Symbol {symbol_upper} not found on {exchange_upper}",
        )

    issuer = db.query(Issuer).filter_by(id=listing.issuer_id).first()
    if issuer is None:
        raise HTTPException(status_code=404, detail="Issuer data missing")

    # Latest screening result
    latest_result = (
        db.query(ScreeningResultV2)
        .filter_by(issuer_id=issuer.id)
        .order_by(ScreeningResultV2.last_updated.desc())
        .first()
    )

    # Latest fundamentals snapshot
    latest_snapshot = (
        db.query(FundamentalsSnapshot)
        .filter_by(issuer_id=issuer.id)
        .order_by(FundamentalsSnapshot.snapshot_date.desc())
        .first()
    )

    fundamentals = None
    if latest_snapshot:
        fundamentals = {
            "snapshot_date": latest_snapshot.snapshot_date.isoformat() if latest_snapshot.snapshot_date else None,
            "basis": latest_snapshot.basis,
            "total_debt": float(latest_snapshot.total_debt) if latest_snapshot.total_debt else None,
            "cash_and_equivalents": float(latest_snapshot.cash_and_equivalents) if latest_snapshot.cash_and_equivalents else None,
            "revenue": float(latest_snapshot.revenue) if latest_snapshot.revenue else None,
            "net_income": float(latest_snapshot.net_income) if latest_snapshot.net_income else None,
            "ebitda": float(latest_snapshot.ebitda) if latest_snapshot.ebitda else None,
            "market_cap": float(latest_snapshot.market_cap) if latest_snapshot.market_cap else None,
            "shares_outstanding": float(latest_snapshot.shares_outstanding) if latest_snapshot.shares_outstanding else None,
            "currency": latest_snapshot.currency_code,
            "source_refs": latest_snapshot.source_refs_json or [],
            "completeness_score": float(latest_snapshot.completeness_score) if latest_snapshot.completeness_score else None,
        }

    # Latest price
    latest_price = (
        db.query(MarketPriceDaily)
        .filter_by(listing_id=listing.id)
        .order_by(MarketPriceDaily.trade_date.desc())
        .first()
    )
    price_data = None
    if latest_price:
        price_data = {
            "close": float(latest_price.close_price) if latest_price.close_price else None,
            "trade_date": latest_price.trade_date.isoformat() if latest_price.trade_date else None,
            "source": latest_price.source_name,
        }

    return {
        "success": True,
        "data": {
            "master": _format_issuer_listing(issuer, listing),
            "screening": _format_screening_result(latest_result, issuer, listing),
            "fundamentals": fundamentals,
            "price": price_data,
            "provenance_note": (
                "All screening data is sourced from official NSE/BSE filings and exchange archives. "
                "Financial figures come from audited annual reports or regulatory filings. "
                "Business activity classification is based on manual review of official company documents."
            ),
        },
    }


# ---------------------------------------------------------------------------
# GET /api/v1/stocks/{exchange}/{symbol}/history
# ---------------------------------------------------------------------------

@router_v1.get("/stocks/{exchange}/{symbol}/history")
def get_stock_history_v1(
    exchange: str,
    symbol: str,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """
    Screening and price history for a stock.

    Returns recent screening results (methodology-versioned) and EOD price bars.
    """
    from app.models_v2 import Issuer, ListingV2, ScreeningResultV2, MarketPriceDaily

    exchange_upper = exchange.upper()
    symbol_upper = symbol.upper()

    listing = (
        db.query(ListingV2)
        .filter_by(exchange_code=exchange_upper, symbol=symbol_upper)
        .first()
    )
    if listing is None:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol_upper} not found on {exchange_upper}")

    issuer = db.query(Issuer).filter_by(id=listing.issuer_id).first()
    if issuer is None:
        raise HTTPException(status_code=404, detail="Issuer data missing")

    cutoff = datetime.now(UTC) - timedelta(days=days)

    # Screening history
    screening_history = (
        db.query(ScreeningResultV2)
        .filter(
            ScreeningResultV2.issuer_id == issuer.id,
            ScreeningResultV2.screened_at >= cutoff,
        )
        .order_by(ScreeningResultV2.screened_at.desc())
        .limit(50)
        .all()
    )

    # Price history
    price_cutoff = date.today() - timedelta(days=days)
    prices = (
        db.query(MarketPriceDaily)
        .filter(
            MarketPriceDaily.listing_id == listing.id,
            MarketPriceDaily.trade_date >= price_cutoff,
        )
        .order_by(MarketPriceDaily.trade_date.desc())
        .limit(days)
        .all()
    )

    return {
        "success": True,
        "data": {
            "symbol": symbol_upper,
            "exchange": exchange_upper,
            "isin": issuer.canonical_isin,
            "screening_history": [
                {
                    "screened_at": r.screened_at.isoformat(),
                    "overall_status": r.overall_status,
                    "short_reason": r.short_reason,
                    "methodology_version": (
                        r.explainability_json.get("methodology_version")
                        if r.explainability_json else None
                    ),
                }
                for r in screening_history
            ],
            "price_history": [
                {
                    "trade_date": p.trade_date.isoformat(),
                    "close": float(p.close_price) if p.close_price else None,
                    "open": float(p.open_price) if p.open_price else None,
                    "high": float(p.high_price) if p.high_price else None,
                    "low": float(p.low_price) if p.low_price else None,
                    "volume": int(p.volume) if p.volume else None,
                    "source": p.source_name,
                }
                for p in prices
            ],
        },
    }


# ---------------------------------------------------------------------------
# GET /api/v1/admin/freshness
# ---------------------------------------------------------------------------

@router_v1.get("/admin/freshness")
def get_freshness(
    db: Session = Depends(get_db),
    _token=Depends(_require_internal_token),
):
    """
    Internal freshness dashboard.

    Reports:
    - Last successful run for each job family
    - Stale symbols (screening not updated in > 7 days)
    - Symbols with no fundamentals snapshot
    - Failed/dead-letter job runs
    """
    from app.models_v2 import Issuer, ListingV2, ScreeningResultV2, FundamentalsSnapshot, JobRun
    from sqlalchemy import func, text

    now = datetime.now(UTC)
    stale_cutoff = now - timedelta(days=7)

    # Last successful runs per job
    job_stats = (
        db.query(
            JobRun.job_name,
            func.max(JobRun.finished_at).label("last_success"),
            func.count().label("total_runs"),
        )
        .filter(JobRun.status == "succeeded")
        .group_by(JobRun.job_name)
        .all()
    )

    # Failed runs in last 24h
    failed_recent = (
        db.query(JobRun)
        .filter(
            JobRun.status.in_(["failed", "dead_letter"]),
            JobRun.started_at >= now - timedelta(hours=24),
        )
        .order_by(JobRun.started_at.desc())
        .limit(20)
        .all()
    )

    # Stale screening results
    stale_count = (
        db.query(func.count(Issuer.id))
        .filter(Issuer.lifecycle_status == "active")
        .outerjoin(
            ScreeningResultV2,
            ScreeningResultV2.issuer_id == Issuer.id,
        )
        .filter(
            (ScreeningResultV2.last_updated < stale_cutoff)
            | (ScreeningResultV2.id.is_(None))
        )
        .scalar()
    )

    # Active issuers without any fundamentals
    no_fundamentals_count = (
        db.query(func.count(Issuer.id))
        .filter(Issuer.lifecycle_status == "active")
        .outerjoin(FundamentalsSnapshot, FundamentalsSnapshot.issuer_id == Issuer.id)
        .filter(FundamentalsSnapshot.id.is_(None))
        .scalar()
    )

    total_active = db.query(func.count(Issuer.id)).filter(Issuer.lifecycle_status == "active").scalar()
    total_screened_today = (
        db.query(func.count(ScreeningResultV2.id))
        .filter(ScreeningResultV2.screened_at >= now.replace(hour=0, minute=0, second=0))
        .scalar()
    )

    return {
        "success": True,
        "data": {
            "as_of": now.isoformat(),
            "universe": {
                "total_active_issuers": total_active,
                "screened_today": total_screened_today,
                "stale_screening": stale_count,
                "missing_fundamentals": no_fundamentals_count,
            },
            "job_health": [
                {
                    "job_name": row.job_name,
                    "last_success": row.last_success.isoformat() if row.last_success else None,
                    "total_runs": row.total_runs,
                }
                for row in job_stats
            ],
            "recent_failures": [
                {
                    "job_name": r.job_name,
                    "status": r.status,
                    "started_at": r.started_at.isoformat() if r.started_at else None,
                    "error": r.error_json,
                }
                for r in failed_recent
            ],
        },
    }


# ---------------------------------------------------------------------------
# GET /api/v1/admin/job-runs
# ---------------------------------------------------------------------------

@router_v1.get("/admin/job-runs")
def get_job_runs(
    job_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _token=Depends(_require_internal_token),
):
    """List recent job runs with optional filters."""
    from app.models_v2 import JobRun

    q = db.query(JobRun).order_by(JobRun.created_at.desc())
    if job_name:
        q = q.filter(JobRun.job_name == job_name)
    if status:
        q = q.filter(JobRun.status == status)

    runs = q.limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "job_name": r.job_name,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "attempt_count": r.attempt_count,
                "metrics": r.metrics_json,
                "error": r.error_json,
            }
            for r in runs
        ],
    }


# ---------------------------------------------------------------------------
# POST /api/v1/admin/trigger-screening
# ---------------------------------------------------------------------------

@router_v1.post("/admin/trigger-screening")
def trigger_screening(
    symbol: Optional[str] = Query(None, description="NSE symbol to rescreen. Omit for full universe."),
    db: Session = Depends(get_db),
    _token=Depends(_require_internal_token),
):
    """
    Trigger an immediate screening recompute.

    This runs synchronously (blocking) so it should only be called for single
    symbols in production.  Full-universe recomputes should use the cron job.
    """
    try:
        import importlib.util
        import sys as _sys
        from pathlib import Path

        script_path = Path(__file__).parent.parent.parent / "scripts" / "pipeline" / "screening_recompute.py"
        spec = importlib.util.spec_from_file_location("screening_recompute", script_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        result = mod.run(symbol=symbol, dry_run=False)

        return {
            "success": True,
            "data": result,
            "message": f"Screening triggered for {'all issuers' if not symbol else symbol}",
        }
    except Exception as exc:
        logger.exception("Trigger screening failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
