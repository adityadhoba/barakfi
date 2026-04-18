"""BSE listed securities CSV → data_listings (BSE) cross-linked by ISIN."""

from __future__ import annotations

import csv
import io
import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx

from app.connectors.ingestion_utils import finish_ingestion_run, record_raw_artifact, start_ingestion_run
from app.models_data_warehouse import DataIssuer, DataListing, DataSecurity

logger = logging.getLogger("barakfi.bse_master")

# BSE publishes periodic CSV/ZIP; set BSE_EQUITY_LIST_URL to a direct CSV URL in production.
DEFAULT_BSE_URL = ""


def _parse_csv(text: str) -> list[dict[str, str]]:
    f = io.StringIO(text)
    r = csv.DictReader(f)
    out: list[dict[str, str]] = []
    for row in r:
        out.append({(k or "").strip().upper(): (v or "").strip() for k, v in row.items()})
    return out


def sync_bse_master(db, *, url: str | None = None, idempotency_key: str | None = None) -> dict[str, Any]:
    """
    Download BSE equity list when `BSE_EQUITY_LIST_URL` or `url` is set.
    If unset, returns a no-op success so cron does not fail in dev.
    """
    src = (url or os.getenv("BSE_EQUITY_LIST_URL") or DEFAULT_BSE_URL).strip()
    day = datetime.now(timezone.utc).date().isoformat()
    ikey = idempotency_key or f"bse_master:{day}:{src or 'skipped'}"
    run = start_ingestion_run(db, "bse_master", ikey)
    metrics: dict[str, Any] = {"url": src or None, "rows": 0, "upserted": 0}

    if not src:
        finish_ingestion_run(
            db,
            run,
            "succeeded",
            metrics={**metrics, "note": "BSE_EQUITY_LIST_URL not configured; skipped"},
        )
        return {"ok": True, "skipped": True, **metrics}

    try:
        r = httpx.get(src, timeout=120.0, follow_redirects=True)
        r.raise_for_status()
        content = r.content
        record_raw_artifact(
            db,
            job_run_id=run.id,
            source_name="BSE",
            source_kind="csv",
            source_url=src,
            content=content,
            http_status=r.status_code,
        )
        text = content.decode("utf-8", errors="replace")
        rows = _parse_csv(text)
        metrics["rows"] = len(rows)

        for row in rows:
            isin = (row.get("ISIN") or row.get("ISIN_NO") or "").strip()[:12]
            sym = (row.get("SCRIP_CODE") or row.get("SYMBOL") or row.get("SCRIP ID") or "").strip()
            name = (row.get("SECURITY_NAME") or row.get("NAME") or sym).strip()
            if not isin or not sym:
                continue

            issuer = db.query(DataIssuer).filter(DataIssuer.canonical_isin == isin).one_or_none()
            if not issuer:
                issuer = DataIssuer(
                    canonical_isin=isin,
                    legal_name=name,
                    display_name=name,
                    coverage_universe="bse_equity",
                    lifecycle_status="active",
                )
                db.add(issuer)
                db.flush()

            sec = db.query(DataSecurity).filter(DataSecurity.isin == isin).one_or_none()
            if not sec:
                sec = DataSecurity(
                    issuer_id=issuer.id,
                    isin=isin,
                    security_type="EQUITY",
                    currency_code="INR",
                    active=True,
                )
                db.add(sec)
                db.flush()

            exists = (
                db.query(DataListing)
                .filter(
                    DataListing.security_id == sec.id,
                    DataListing.exchange_code == "BSE",
                    DataListing.native_symbol == sym,
                )
                .one_or_none()
            )
            if not exists:
                db.add(
                    DataListing(
                        security_id=sec.id,
                        exchange_code="BSE",
                        native_symbol=sym,
                        series_code="EQ",
                        bse_scrip_code=sym,
                        is_primary=False,
                    )
                )
                metrics["upserted"] += 1

        db.commit()
        finish_ingestion_run(db, run, "succeeded", metrics=metrics)
        return {"ok": True, **metrics}
    except Exception as exc:
        logger.exception("bse_master failed")
        finish_ingestion_run(db, run, "failed", metrics=metrics, error={"message": str(exc)})
        raise
