from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import MarketIndexSnapshot
from app.services.indian_market_client import IndexQuote, fetch_nse_indices


def _parse_as_of(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def sync_market_indices(db: Session, indices: list[IndexQuote] | None = None) -> dict[str, int]:
    """
    Persist latest index values for UI fallback and operational visibility.
    Returns counts: {"updated": N}
    """
    rows = indices if indices is not None else fetch_nse_indices()
    if not rows:
        return {"updated": 0}

    updated = 0
    for idx in rows:
        existing = db.query(MarketIndexSnapshot).filter(MarketIndexSnapshot.name == idx.name).first()
        as_of_dt = _parse_as_of(idx.as_of)
        if existing:
            existing.value = float(idx.value)
            existing.change = float(idx.change)
            existing.change_percent = float(idx.change_percent)
            existing.source = str(idx.source or "nse_india_public")
            existing.as_of = as_of_dt
        else:
            db.add(
                MarketIndexSnapshot(
                    name=idx.name,
                    value=float(idx.value),
                    change=float(idx.change),
                    change_percent=float(idx.change_percent),
                    source=str(idx.source or "nse_india_public"),
                    as_of=as_of_dt,
                )
            )
        updated += 1
    db.flush()
    return {"updated": updated}


def get_cached_market_indices(db: Session) -> list[dict]:
    rows = (
        db.query(MarketIndexSnapshot)
        .order_by(MarketIndexSnapshot.updated_at.desc(), MarketIndexSnapshot.name.asc())
        .all()
    )
    out: list[dict] = []
    for row in rows:
        out.append(
            {
                "name": row.name,
                "value": float(row.value),
                "change": float(row.change),
                "change_percent": float(row.change_percent),
                "source": row.source or "db_snapshot",
                "as_of": row.as_of.isoformat() if row.as_of else datetime.now(timezone.utc).isoformat(),
            }
        )
    return out
