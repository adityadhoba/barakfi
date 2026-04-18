"""
Methodology-versioned screening with explainability JSON.

Uses `data_screening_methodologies` when populated; otherwise embeds thresholds
from `halal_service.PROFILES` for the primary profile.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models_data_warehouse import DataScreeningMethodology, DataScreeningSnapshot
from app.services import halal_service

DEFAULT_VERSION = halal_service.PRIMARY_PROFILE_VERSION


def _active_methodology(db: Session | None) -> dict[str, Any]:
    if db is not None:
        row = (
            db.query(DataScreeningMethodology)
            .filter(DataScreeningMethodology.status == "active")
            .order_by(DataScreeningMethodology.effective_from.desc())
            .first()
        )
        if row:
            return {
                "version_code": row.version_code,
                "thresholds": row.thresholds_json or {},
                "formulas": row.formulas_json or {},
                "name": row.methodology_name,
            }
    profile = halal_service.PROFILES.get(halal_service.PRIMARY_PROFILE, halal_service.PROFILES["sp_shariah"])
    return {
        "version_code": DEFAULT_VERSION,
        "thresholds": profile.get("thresholds", {}),
        "formulas": profile.get("denominators", {}),
        "name": profile.get("label", "S&P Shariah"),
    }


def build_explainability(stock_dict: dict[str, Any], db: Session | None = None) -> dict[str, Any]:
    """Run legacy evaluator and wrap as explainability object."""
    meta = _active_methodology(db)
    result = halal_service.evaluate_stock(stock_dict, halal_service.PRIMARY_PROFILE)
    checks: list[dict[str, Any]] = [
        {
            "key": "screening",
            "status": result.get("status", "UNKNOWN"),
            "value": result.get("screening_score"),
            "threshold": None,
            "reason": (result.get("reasons") or [""])[0] if result.get("reasons") else "",
            "source_refs": [],
            "quality_flags": result.get("confidence_bullets") or [],
        }
    ]
    return {
        "overall_status": result.get("status", "UNKNOWN"),
        "short_reason": (result.get("reasons") or ["No summary"])[0],
        "detailed_reason": "; ".join(result.get("reasons") or []),
        "methodology_version": meta["version_code"],
        "methodology_name": meta["name"],
        "basis": {
            "financials_basis": "legacy_stocks_table",
            "profile": halal_service.PRIMARY_PROFILE,
        },
        "checks": checks,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "freshness": {
            "fundamentals_field": "fundamentals_updated_at on stocks row",
        },
    }


def persist_snapshot_for_listing(
    db: Session,
    listing_id: int,
    explainability: dict[str, Any],
    methodology_id: int | None = None,
) -> DataScreeningSnapshot:
    """Store snapshot row (deduped by unique constraint)."""
    mid = methodology_id
    if mid is None:
        m = (
            db.query(DataScreeningMethodology)
            .filter(DataScreeningMethodology.status == "active")
            .order_by(DataScreeningMethodology.effective_from.desc())
            .first()
        )
        if not m:
            m = DataScreeningMethodology(
                version_code=DEFAULT_VERSION,
                methodology_name="S&P Shariah (embedded)",
                thresholds_json=halal_service.PROFILES[halal_service.PRIMARY_PROFILE]["thresholds"],
                formulas_json=halal_service.PROFILES[halal_service.PRIMARY_PROFILE].get("denominators", {}),
                disclosure_text=halal_service.SCREENING_DISCLAIMER,
                status="active",
            )
            db.add(m)
            db.flush()
        mid = m.id

    existing = (
        db.query(DataScreeningSnapshot)
        .filter(
            DataScreeningSnapshot.listing_id == listing_id,
            DataScreeningSnapshot.methodology_id == mid,
            DataScreeningSnapshot.as_of_date == date.today(),
        )
        .one_or_none()
    )
    if existing:
        existing.explainability_json = explainability
        existing.overall_status = str(explainability.get("overall_status", "UNKNOWN"))
        db.commit()
        db.refresh(existing)
        return existing

    snap = DataScreeningSnapshot(
        listing_id=listing_id,
        methodology_id=mid,
        as_of_date=date.today(),
        overall_status=str(explainability.get("overall_status", "UNKNOWN")),
        explainability_json=explainability,
        completeness_score=None,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap
