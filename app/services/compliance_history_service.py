"""Persist compliance status changes for timeline UI."""

from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import desc, inspect
from sqlalchemy.orm import Session

from app.models import ComplianceHistory, Stock


@lru_cache(maxsize=1)
def _compliance_history_columns() -> set[str]:
    """Read live DB columns for compatibility across partial migrations."""
    from app.database import engine

    insp = inspect(engine)
    try:
        cols = insp.get_columns("compliance_history")
        return {str(c.get("name")) for c in cols}
    except Exception:
        # Fail open: use model fields if reflection is unavailable.
        return {c.name for c in ComplianceHistory.__table__.columns}


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
        .with_entities(ComplianceHistory.status)
        .filter(ComplianceHistory.stock_id == stock.id)
        .order_by(desc(ComplianceHistory.recorded_at))
        .first()
    )
    latest_status = latest[0] if latest else None
    if latest_status and latest_status == new_status:
        return False

    old_status = latest_status if latest_status else new_status
    cols = _compliance_history_columns()

    row_payload: dict[str, object] = {
        "stock_id": stock.id,
        "status": new_status,
        "profile_code": profile_code,
        "recorded_at": datetime.now(timezone.utc),
    }
    if "old_status" in cols:
        row_payload["old_status"] = old_status
    if "new_status" in cols:
        row_payload["new_status"] = new_status
    if "old_compliance_rating" in cols:
        row_payload["old_compliance_rating"] = None
    if "new_compliance_rating" in cols:
        row_payload["new_compliance_rating"] = _new_rating
    if "change_reason" in cols:
        row_payload["change_reason"] = "status_changed" if latest_status else "initial_record"

    row = ComplianceHistory(**row_payload)
    db.add(row)
    return True
