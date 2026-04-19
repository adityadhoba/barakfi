"""NSE corporate actions (JSON API) → data_corporate_events (best-effort)."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.connectors.ingestion_utils import finish_ingestion_run, record_raw_artifact, start_ingestion_run
from app.connectors.nse_client import NSE_HEADERS
from app.models_data_warehouse import DataCorporateEvent

logger = logging.getLogger("barakfi.nse_ca")

DEFAULT_CA_URL = "https://www.nseindia.com/api/corporates-corporateActions"


def sync_nse_corporate_actions(
    db,
    *,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """
    Fetch corporate-actions JSON (equities). Stores raw artifact; inserts
    normalized rows when `subject`/`symbol` can be hashed to a known issuer.
    """
    day = datetime.now(timezone.utc).date().isoformat()
    url = os.getenv("NSE_CORP_ACTIONS_URL", DEFAULT_CA_URL).strip()
    ikey = idempotency_key or f"nse_corp_actions:{day}"
    run = start_ingestion_run(db, "nse_corporate_actions", ikey)
    metrics: dict[str, Any] = {"url": url, "parsed_events": 0}

    try:
        params = {
            "index": "equities",
            "from": (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%d-%m-%Y"),
            "to": datetime.now(timezone.utc).strftime("%d-%m-%Y"),
        }
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            client.get("https://www.nseindia.com/", headers=NSE_HEADERS)
            r = client.get(url, headers=NSE_HEADERS, params=params)

        content = r.content
        record_raw_artifact(
            db,
            job_run_id=run.id,
            source_name="NSE",
            source_kind="json",
            source_url=f"{url}?{r.request.url.query.decode() if r.request.url.query else ''}",
            content=content,
            http_status=r.status_code,
        )

        if r.status_code != 200:
            raise RuntimeError(f"HTTP {r.status_code} corporate actions")

        payload = r.json()
        rows = payload if isinstance(payload, list) else payload.get("data") or []
        metrics["raw_rows"] = len(rows) if isinstance(rows, list) else 0

        if isinstance(rows, list):
            for item in rows:
                if not isinstance(item, dict):
                    continue
                sym = (item.get("symbol") or item.get("Symbol") or "").strip().upper()
                subj = str(item.get("subject") or item.get("Subject") or "")
                if not sym and not subj:
                    continue
                hkey = hashlib.sha256(
                    json.dumps(item, sort_keys=True, default=str).encode("utf-8")
                ).hexdigest()
                exists = (
                    db.query(DataCorporateEvent)
                    .filter(DataCorporateEvent.canonical_event_hash == hkey)
                    .one_or_none()
                )
                if exists:
                    continue
                ev = DataCorporateEvent(
                    event_type="corporate_action",
                    source_name="nse_api",
                    issuer_id=None,
                    title=subj[:512] if subj else sym,
                    details_json=item,
                    requires_manual_review=True,
                    canonical_event_hash=hkey,
                )
                db.add(ev)
                metrics["parsed_events"] += 1

        db.commit()
        finish_ingestion_run(db, run, "succeeded", metrics=metrics)
        return {"ok": True, **metrics}
    except Exception as exc:
        logger.exception("nse_corporate_actions failed")
        finish_ingestion_run(db, run, "failed", metrics=metrics, error={"message": str(exc)})
        raise
