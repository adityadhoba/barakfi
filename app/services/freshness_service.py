"""Aggregate freshness metrics for admin dashboards."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Stock
from app.models_data_warehouse import DataIngestionRun, DataScreeningSnapshot


def freshness_overview(db: Session) -> dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    runs = (
        db.query(DataIngestionRun)
        .filter(DataIngestionRun.started_at.isnot(None), DataIngestionRun.started_at >= since)
        .order_by(DataIngestionRun.started_at.desc())
        .limit(50)
        .all()
    )
    stale_stocks = (
        db.query(Stock)
        .filter(
            Stock.fundamentals_updated_at.is_(None)
            | (Stock.fundamentals_updated_at < datetime.now(timezone.utc) - timedelta(days=14))
        )
        .count()
    )
    snap_count = db.query(func.count(DataScreeningSnapshot.id)).scalar() or 0
    return {
        "ingestion_runs_recent": [
            {
                "job": r.job_name,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "metrics": r.metrics_json,
            }
            for r in runs
        ],
        "legacy_stocks_stale_or_null_fundamentals_count": stale_stocks,
        "warehouse_snapshots_total": int(snap_count),
    }
