"""
NSE filings / corporate announcements catalog → raw artifacts (+ future: data_filings rows).

Fetches the public corporate-announcements JSON feed (weekly window) and stores a deduplicated
`data_raw_artifacts` row. Full XBRL/PDF extraction into `data_financial_facts` is a follow-up.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.connectors.ingestion_utils import finish_ingestion_run, record_raw_artifact, start_ingestion_run
from app.connectors.nse_client import NSEClient
logger = logging.getLogger("barakfi.nse_filings")

IST = ZoneInfo("Asia/Kolkata")


def _build_default_announcements_url() -> str:
    now = datetime.now(IST)
    start = now - timedelta(days=7)
    from_date = start.strftime("%d-%b-%Y")
    to_date = now.strftime("%d-%b-%Y")
    return (
        "https://www.nseindia.com/api/corporate-announcements?"
        f"index=equities&from_date={from_date}&to_date={to_date}"
    )


def sync_nse_filings_catalog(
    db: Session,
    *,
    url: str | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """
    Download NSE corporate announcements JSON, archive bytes, record parse metrics.
    """
    src = (url or os.getenv("NSE_CORPORATE_ANNOUNCEMENTS_URL") or "").strip()
    if not src:
        src = _build_default_announcements_url()

    day = datetime.now(IST).strftime("%Y-%m-%d")
    ikey = idempotency_key or f"nse_filings_catalog:{day}"

    run = start_ingestion_run(db, "nse_filings_catalog", ikey)
    metrics: dict[str, Any] = {"url": src, "http_status": None, "announcements_parsed": None}

    try:
        client = NSEClient()
        code, content, _headers = client.fetch_bytes(src)
        metrics["http_status"] = code
        if code != 200:
            raise RuntimeError(f"HTTP {code} fetching {src}")

        art = record_raw_artifact(
            db,
            job_run_id=run.id,
            source_name="NSE",
            source_kind="json",
            source_url=src,
            content=content,
            http_status=code,
        )

        announcements = 0
        try:
            payload = json.loads(content.decode("utf-8", errors="replace"))
            if isinstance(payload, list):
                announcements = len(payload)
            elif isinstance(payload, dict):
                data = payload.get("data")
                if isinstance(data, list):
                    announcements = len(data)
                elif isinstance(payload.get("announcements"), list):
                    announcements = len(payload["announcements"])
        except json.JSONDecodeError:
            announcements = 0

        metrics["announcements_parsed"] = announcements
        art.parse_status = "json_catalog" if announcements or content else "empty"
        db.add(art)
        db.commit()

        finish_ingestion_run(db, run, "success", metrics=metrics)
        logger.info("nse_filings: ok url=%s announcements=%s", src, announcements)
        return {"ok": True, "metrics": metrics, "artifact_id": art.id}
    except Exception as exc:  # noqa: BLE001
        logger.exception("nse_filings: failed")
        finish_ingestion_run(db, run, "failed", metrics=metrics, error={"error": str(exc)})
        return {"ok": False, "error": str(exc), "metrics": metrics}


def sync_nse_filings_stub() -> dict[str, Any]:
    """Backward-compatible name for scripts that imported the stub."""
    logger.info("nse_filings: use sync_nse_filings_catalog(SessionLocal) in production")
    return {"ok": True, "note": "Pass an active DB session to sync_nse_filings_catalog."}
