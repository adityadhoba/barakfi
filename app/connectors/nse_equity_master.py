"""NSE securities master (EQUITY_L) → data_issuers / data_securities / data_listings."""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.connectors.ingestion_utils import finish_ingestion_run, record_raw_artifact, start_ingestion_run
from app.connectors.nse_client import NSEClient
from app.models_data_warehouse import DataIssuer, DataListing, DataSecurity

logger = logging.getLogger("barakfi.nse_master")

# Official archived equity list (NSE). May rotate; override with NSE_EQUITY_LIST_URL.
DEFAULT_EQUITY_LIST_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"


def _norm_header(h: str) -> str:
    return (h or "").strip().upper().replace(" ", "_")


def _pick(row: dict[str, str], *candidates: str) -> str:
    keys = {_norm_header(k): v for k, v in row.items()}
    for c in candidates:
        cu = c.upper()
        if cu in keys and keys[cu] is not None:
            return str(keys[cu]).strip()
    return ""


def parse_equity_l_csv(text: str) -> list[dict[str, str]]:
    """Return one dict per row with normalized keys UPPER."""
    f = io.StringIO(text)
    reader = csv.DictReader(f)
    out: list[dict[str, str]] = []
    for raw in reader:
        row = {_norm_header(k): (v or "").strip() for k, v in raw.items()}
        out.append(row)
    return out


def sync_nse_master(
    db: Session,
    *,
    url: str | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """
    Download NSE EQUITY_L, store raw artifact, upsert warehouse rows for EQ series.
    """
    import os

    src = (url or os.getenv("NSE_EQUITY_LIST_URL") or DEFAULT_EQUITY_LIST_URL).strip()
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ikey = idempotency_key or f"nse_master:{day}:{src}"

    run = start_ingestion_run(db, "nse_master", ikey)
    metrics: dict[str, Any] = {"url": src, "rows_seen": 0, "upserted": 0, "skipped": 0}

    try:
        client = NSEClient()
        code, content, _headers = client.fetch_bytes(src)
        if code != 200:
            raise RuntimeError(f"HTTP {code} fetching {src}")
        art = record_raw_artifact(
            db,
            job_run_id=run.id,
            source_name="NSE",
            source_kind="csv",
            source_url=src,
            content=content,
            http_status=code,
        )
        text = content.decode("utf-8", errors="replace")
        rows = parse_equity_l_csv(text)
        metrics["rows_seen"] = len(rows)

        for row in rows:
            series = _pick(row, "SERIES", "INSTRUMENT")
            if series and series.upper() not in {"EQ", "BE", "BZ"}:
                metrics["skipped"] += 1
                continue
            sym = _pick(row, "SYMBOL")
            isin = _pick(row, "ISIN")
            name = _pick(row, "NAME_OF_COMPANY", "SECURITY_NAME", "COMPANY_NAME")
            if not sym or not isin or len(isin) < 12:
                metrics["skipped"] += 1
                continue

            issuer = db.query(DataIssuer).filter(DataIssuer.canonical_isin == isin[:12]).one_or_none()
            if not issuer:
                issuer = DataIssuer(
                    canonical_isin=isin[:12],
                    legal_name=name or sym,
                    display_name=name or sym,
                    coverage_universe="nse_equity",
                    lifecycle_status="active",
                )
                db.add(issuer)
                db.flush()

            sec = db.query(DataSecurity).filter(DataSecurity.isin == isin[:12]).one_or_none()
            if not sec:
                sec = DataSecurity(
                    issuer_id=issuer.id,
                    isin=isin[:12],
                    security_type="EQUITY",
                    currency_code="INR",
                    active=True,
                )
                db.add(sec)
                db.flush()

            listing = (
                db.query(DataListing)
                .filter(
                    DataListing.security_id == sec.id,
                    DataListing.exchange_code == "NSE",
                    DataListing.native_symbol == sym,
                    DataListing.series_code == (series or "EQ"),
                )
                .one_or_none()
            )
            if not listing:
                listing = DataListing(
                    security_id=sec.id,
                    exchange_code="NSE",
                    native_symbol=sym,
                    series_code=series or "EQ",
                    is_primary=True,
                )
                db.add(listing)
            metrics["upserted"] += 1

        db.commit()
        art.parse_status = "parsed"
        db.commit()

        finish_ingestion_run(db, run, "succeeded", metrics=metrics)
        return {"ok": True, **metrics}
    except Exception as exc:
        logger.exception("nse_master failed")
        finish_ingestion_run(db, run, "failed", metrics=metrics, error={"message": str(exc)})
        raise
