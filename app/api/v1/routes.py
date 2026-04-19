"""BarakFi API v1 — universe, stock detail with explainability, admin freshness."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.helpers import serialize_public_review_case
from app.models import ComplianceReviewCase, Stock, User
from app.models_data_warehouse import DataListing, DataScreeningSnapshot
from app.services.freshness_service import freshness_overview
from app.services.methodology_screening_engine import build_explainability
from app.services.rbac import require_reviewer_or_above
from app.api.envelope import api_success
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/api/v1", tags=["v1"])


def _stock_to_dict(s: Stock) -> dict[str, Any]:
    return {
        "symbol": s.symbol,
        "name": s.name,
        "exchange": s.exchange,
        "sector": s.sector,
        "market_cap": s.market_cap,
        "price": s.price,
        "currency": s.currency,
        "fundamentals_updated_at": s.fundamentals_updated_at.isoformat() if s.fundamentals_updated_at else None,
        "data_source": s.data_source,
        "isin": s.isin,
    }


@router.get("/universe")
def v1_universe(
    scope: str = Query("all", description="nifty500 or all"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    q = db.query(Stock).filter(Stock.is_active.is_(True), Stock.is_etf.is_(False))
    rows = q.order_by(Stock.symbol).limit(5000).all()
    return api_success(
        {
            "scope": scope,
            "count": len(rows),
            "stocks": [{"symbol": r.symbol, "exchange": r.exchange, "name": r.name} for r in rows],
        }
    )


@router.get("/stocks/{exchange}/{symbol}")
def v1_stock_detail(
    exchange: str,
    symbol: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ex = exchange.upper()
    sym = symbol.upper()
    stock = db.query(Stock).filter(Stock.exchange == ex, Stock.symbol == sym).one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    stock_d = _stock_to_dict(stock)
    # ORM row → dict for halal_service
    full = {
        "symbol": stock.symbol,
        "name": stock.name,
        "sector": stock.sector,
        "exchange": stock.exchange,
        "market_cap": stock.market_cap,
        "average_market_cap_36m": stock.average_market_cap_36m,
        "debt": stock.debt,
        "revenue": stock.revenue,
        "total_business_income": stock.total_business_income,
        "interest_income": stock.interest_income,
        "non_permissible_income": stock.non_permissible_income,
        "accounts_receivable": stock.accounts_receivable,
        "cash_and_equivalents": stock.cash_and_equivalents,
        "short_term_investments": stock.short_term_investments,
        "fixed_assets": stock.fixed_assets,
        "total_assets": stock.total_assets,
        "price": stock.price,
        "currency": stock.currency,
        "country": stock.country,
        "data_source": stock.data_source,
        "data_quality": getattr(stock, "data_quality", None),
        "fundamentals_fields_missing": getattr(stock, "fundamentals_fields_missing", None) or [],
    }
    explain = build_explainability(full, db)
    wh_listing = (
        db.query(DataListing)
        .filter(DataListing.exchange_code == ex, DataListing.native_symbol == sym)
        .first()
    )
    warehouse = None
    if wh_listing:
        snap = (
            db.query(DataScreeningSnapshot)
            .filter(DataScreeningSnapshot.listing_id == wh_listing.id)
            .order_by(DataScreeningSnapshot.created_at.desc())
            .first()
        )
        warehouse = {"listing_id": wh_listing.id, "latest_snapshot": snap.explainability_json if snap else None}
    return api_success({"stock": stock_d, "explainability": explain, "warehouse": warehouse})


@router.get("/stocks/{exchange}/{symbol}/history")
def v1_stock_history(
    exchange: str,
    symbol: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ex = exchange.upper()
    sym = symbol.upper()
    listing = (
        db.query(DataListing).filter(DataListing.exchange_code == ex, DataListing.native_symbol == sym).first()
    )
    if not listing:
        return api_success({"listing_id": None, "screening_snapshots": []})
    snaps = (
        db.query(DataScreeningSnapshot)
        .filter(DataScreeningSnapshot.listing_id == listing.id)
        .order_by(DataScreeningSnapshot.as_of_date.desc())
        .limit(90)
        .all()
    )
    return api_success(
        {
            "listing_id": listing.id,
            "screening_snapshots": [
                {"as_of": s.as_of_date.isoformat(), "status": s.overall_status, "detail": s.explainability_json}
                for s in snaps
            ],
        }
    )


@router.get("/admin/freshness")
def v1_admin_freshness(
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer_or_above),
) -> dict[str, Any]:
    return api_success(freshness_overview(db))


@router.get("/admin/review-queue")
def v1_admin_review_queue(
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer_or_above),
) -> dict[str, Any]:
    cases = (
        db.query(ComplianceReviewCase)
        .options(
            joinedload(ComplianceReviewCase.stock),
            joinedload(ComplianceReviewCase.events),
        )
        .order_by(ComplianceReviewCase.updated_at.desc())
        .limit(200)
        .all()
    )
    items = [serialize_public_review_case(c) for c in cases]
    return api_success({"items": items, "count": len(items)})
