"""NSE EOD bhavcopy → data_price_daily (maps symbol to listing)."""

from __future__ import annotations

import csv
import io
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.connectors.ingestion_utils import finish_ingestion_run, record_raw_artifact, start_ingestion_run
from app.connectors.nse_client import NSEClient
from app.models_data_warehouse import DataListing, DataPriceDaily

logger = logging.getLogger("barakfi.nse_prices")

IST = ZoneInfo("Asia/Kolkata")

# Historical full bhavcopy file per session date (format DDMMYYYY).
DEFAULT_BHAV_TEMPLATE = (
    "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{ddmmyyyy}.csv"
)


def _trade_date_for_ist(d: date) -> date:
    return d


def bhavcopy_url(trade_date: date) -> str:
    tpl = os.getenv("NSE_BHAVCOPY_URL_TEMPLATE", DEFAULT_BHAV_TEMPLATE)
    ddmmyyyy = trade_date.strftime("%d%m%Y")
    return tpl.format(ddmmyyyy=ddmmyyyy)


def parse_bhavcopy_csv(text: str) -> list[dict[str, str]]:
    f = io.StringIO(text)
    r = csv.DictReader(f)
    rows: list[dict[str, str]] = []
    for raw in r:
        row = {(k or "").strip().upper(): (v or "").strip() for k, v in raw.items()}
        rows.append(row)
    return rows


def sync_nse_bhavcopy(
    db: Session,
    *,
    trade_date: date | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """
    Ingest one session bhavcopy file. Defaults to previous IST calendar day
    (weekends will fail — caller should skip non-trading days).
    """
    if trade_date is None:
        trade_date = datetime.now(IST).date() - timedelta(days=1)

    url = bhavcopy_url(trade_date)
    ikey = idempotency_key or f"nse_bhavcopy:{trade_date.isoformat()}:{url}"
    run = start_ingestion_run(db, "nse_bhavcopy", ikey)
    metrics: dict[str, Any] = {"trade_date": trade_date.isoformat(), "url": url, "rows": 0, "inserted": 0}

    try:
        client = NSEClient()
        code, content, _ = client.fetch_bytes(url)
        if code != 200:
            raise RuntimeError(f"HTTP {code} fetching {url}")
        record_raw_artifact(
            db,
            job_run_id=run.id,
            source_name="NSE",
            source_kind="csv",
            source_url=url,
            content=content,
            http_status=code,
        )
        text = content.decode("utf-8", errors="replace")
        parsed = parse_bhavcopy_csv(text)
        metrics["rows"] = len(parsed)

        # Build symbol -> listing_id for NSE EQ
        listings = {l.native_symbol.upper(): l for l in db.query(DataListing).filter(DataListing.exchange_code == "NSE").all()}

        for row in parsed:
            sym = (row.get("SYMBOL") or row.get("TICKER") or "").upper()
            if not sym:
                continue
            series = (row.get("SERIES") or row.get("INSTRUMENT") or "EQ").upper()
            if series not in {"EQ", "BE", "BZ"}:
                continue
            listing = listings.get(sym)
            if not listing:
                continue

            def _f(k: str) -> float | None:
                v = row.get(k)
                if v is None or v == "":
                    return None
                try:
                    return float(v.replace(",", ""))
                except ValueError:
                    return None

            close = _f("CLOSE") or _f("LAST") or _f("CLOSE_PRICE")
            if close is None:
                continue

            open_p = _f("OPEN")
            high_p = _f("HIGH")
            low_p = _f("LOW")
            vol = row.get("TOTTRDQTY") or row.get("VOLUME") or ""
            volume: int | None = None
            try:
                if vol:
                    volume = int(float(vol.replace(",", "")))
            except ValueError:
                volume = None

            existing = (
                db.query(DataPriceDaily)
                .filter(
                    DataPriceDaily.listing_id == listing.id,
                    DataPriceDaily.trade_date == _trade_date_for_ist(trade_date),
                    DataPriceDaily.source_name == "nse_bhavcopy",
                )
                .one_or_none()
            )
            if existing:
                existing.open_price = open_p
                existing.high_price = high_p
                existing.low_price = low_p
                existing.close_price = close
                existing.volume = volume
                existing.fetched_at = datetime.now(timezone.utc)
            else:
                db.add(
                    DataPriceDaily(
                        listing_id=listing.id,
                        trade_date=_trade_date_for_ist(trade_date),
                        open_price=open_p,
                        high_price=high_p,
                        low_price=low_p,
                        close_price=close,
                        volume=volume,
                        source_name="nse_bhavcopy",
                        source_url=url,
                        quality_flags_json=[],
                    )
                )
                metrics["inserted"] += 1

        db.commit()
        finish_ingestion_run(db, run, "succeeded", metrics=metrics)
        return {"ok": True, **metrics}
    except Exception as exc:
        logger.exception("nse_bhavcopy failed")
        finish_ingestion_run(db, run, "failed", metrics=metrics, error={"message": str(exc)})
        raise
