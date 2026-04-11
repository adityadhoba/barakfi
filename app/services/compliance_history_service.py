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
    `_new_rating` is accepted for call-site compatibility; the history row schema
    stores status only (see `ComplianceHistory`). Returns True if a new row was added.
    """
    latest = (
        db.query(ComplianceHistory)
        .filter(ComplianceHistory.stock_id == stock.id)
        .order_by(desc(ComplianceHistory.recorded_at))
        .first()
    )
    if latest and latest.status == new_status:
        return False

    row = ComplianceHistory(
        stock_id=stock.id,
        status=new_status,
        profile_code=profile_code,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(row)
    return True
