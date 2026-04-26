"""SQL-backed data quality checks + optional Slack notifications."""

from __future__ import annotations

import logging
import os
from typing import Any

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("barakfi.data_quality")


def run_stale_fundamentals_check(db: Session, max_age_days: int = 14) -> dict[str, Any]:
    q = text(
        """
        SELECT COUNT(*) FROM stocks
        WHERE is_active = true
          AND is_etf = false
          AND (
            fundamentals_updated_at IS NULL
            OR fundamentals_updated_at < (NOW() AT TIME ZONE 'utc') - (:days * INTERVAL '1 day')
          )
        """
    )
    try:
        n = db.execute(q, {"days": max_age_days}).scalar() or 0
    except Exception:
        n = 0
    return {"check": "stale_fundamentals", "count": int(n), "max_age_days": max_age_days}


def post_slack_if_configured(payload: dict[str, Any]) -> None:
    url = (os.getenv("OPS_SLACK_WEBHOOK_URL") or "").strip()
    if not url:
        return
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as exc:
        logger.warning("Slack post failed: %s", exc)


def run_all_checks(db: Session) -> list[dict[str, Any]]:
    results = [run_stale_fundamentals_check(db)]
    stale = results[0].get("count", 0)
    if stale and int(stale) > 50:
        post_slack_if_configured(
            {
                "text": f":warning: Data quality: {stale} active stocks have stale fundamentals (>14d).",
            }
        )
    return results
