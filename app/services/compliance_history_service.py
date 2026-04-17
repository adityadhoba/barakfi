"""Persist compliance status changes for timeline UI."""

from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import ComplianceHistory, Stock


def record_compliance_change_if_needed(
    db: Session,
    stock: Stock,
    new_status: str,
    _new_rating: int | None,
    profile_code: str = "sp_shariah",
) -> bool:
    """
    Insert ComplianceHistory when status changed vs latest entry for this stock.
    Returns True if a new row was added.
    """
    latest = (
        db.query(ComplianceHistory)
        .filter(ComplianceHistory.stock_id == stock.id)
        .order_by(desc(ComplianceHistory.recorded_at))
        .first()
    )
    if latest and latest.status == new_status:
        return False

    old_status = latest.status if latest else new_status
    old_rating = getattr(latest, "new_compliance_rating", None) if latest else None

    row = ComplianceHistory(
        stock_id=stock.id,
        old_status=old_status,
        new_status=new_status,
        old_compliance_rating=old_rating,
        new_compliance_rating=_new_rating,
        change_reason="status_changed" if latest else "initial_record",
        status=new_status,
        profile_code=profile_code,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(row)
    return True
