"""Persist compliance status/rating changes for timeline UI."""

from datetime import UTC, datetime

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import ComplianceHistory, Stock


def record_compliance_change_if_needed(
    db: Session,
    stock: Stock,
    new_status: str,
    new_rating: int | None,
    profile_code: str = "sp_shariah",
) -> bool:
    """
    Insert ComplianceHistory when status or rating changed vs latest entry.
    Updates stock.compliance_rating. Returns True if a new row was added.
    """
    latest = (
        db.query(ComplianceHistory)
        .filter(ComplianceHistory.stock_id == stock.id)
        .order_by(desc(ComplianceHistory.changed_at))
        .first()
    )
    if latest and latest.new_status == new_status and latest.new_rating == new_rating:
        stock.compliance_rating = new_rating
        return False

    old_status = latest.new_status if latest else "UNKNOWN"
    old_rating = latest.new_rating if latest else None

    row = ComplianceHistory(
        stock_id=stock.id,
        old_status=old_status,
        new_status=new_status,
        profile_code=profile_code,
        old_rating=old_rating,
        new_rating=new_rating,
        changed_at=datetime.now(UTC),
    )
    db.add(row)
    stock.compliance_rating = new_rating
    stock.last_compliance_change = row.changed_at
    return True
