"""
EOD Price Sync Pipeline — Job Family: Market Data

Fetches official NSE bhavcopy (end-of-day price data) for trading days
and persists into market_prices_daily.

Cadence: Trading days after official close (suggested: 18:30 IST = 13:00 UTC)
Render cron: "0 13 * * 1-5"

Data source: NSE archives (official bhavcopy) — no paid API required.
If a paid vendor is available later, use it for historical backfill only
and keep bhavcopy as the authoritative truth for current data.

Usage:
    PYTHONPATH=. python3 scripts/pipeline/eod_price_sync.py
    PYTHONPATH=. python3 scripts/pipeline/eod_price_sync.py --date 2026-04-17
    PYTHONPATH=. python3 scripts/pipeline/eod_price_sync.py --backfill-days 5
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline.eod_price_sync")
UTC = timezone.utc

_DB_URL = os.getenv("DATABASE_URL", "")
if not _DB_URL or _DB_URL.startswith("sqlite"):
    logger.error(
        "DATABASE_URL is not set or is SQLite. "
        "Set DATABASE_URL to a Postgres connection string in the Render "
        "dashboard for this cron job (barakfi-eod-price-sync → Environment Variables)."
    )
    sys.exit(1)


def _idempotency_key(job_name: str, trade_date: date) -> str:
    raw = f"{job_name}::{trade_date.isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _ensure_tables() -> None:
    """Create any missing v2 tables before first use (idempotent)."""
    from app.database import Base, engine
    import app.models_v2  # noqa: F401 – registers all v2 models
    Base.metadata.create_all(bind=engine)


def run_for_date(
    trade_date: date,
    dry_run: bool = False,
    force: bool = False,
) -> dict:
    """Fetch and persist EOD prices for one trading date."""
    _ensure_tables()
    from app.database import SessionLocal
    from app.models_v2 import Issuer, ListingV2, MarketPriceDaily, JobRun
    from app.connectors.nse_bhavcopy import NSEBhavCopyConnector
    from sqlalchemy.exc import IntegrityError

    metrics: dict = {
        "trade_date": trade_date.isoformat(),
        "rows_fetched": 0,
        "rows_inserted": 0,
        "rows_skipped": 0,
        "listings_not_found": 0,
        "errors": 0,
    }

    idempotency_key = _idempotency_key("eod_price_sync", trade_date)
    started_at = datetime.now(UTC)

    db = SessionLocal()
    try:
        # Idempotency guard
        existing = db.query(JobRun).filter_by(idempotency_key=idempotency_key).first()
        if existing and existing.status == "succeeded" and not force:
            logger.info("EOD sync for %s already ran — skipping (use --force to re-run)", trade_date)
            return {**metrics, "skipped": True}
        if existing and force:
            logger.info("EOD sync for %s: --force: resetting previous run", trade_date)

        job_run = existing or JobRun(
            job_name="eod_price_sync",
            idempotency_key=idempotency_key,
            status="running",
            started_at=started_at,
        )
        if not existing:
            db.add(job_run)
        else:
            job_run.status = "running"
            job_run.started_at = started_at
        db.commit()
        db.refresh(job_run)

        # Fetch bhavcopy
        connector = NSEBhavCopyConnector(timeout=120, max_retries=3)
        df = connector.fetch_bhavcopy(
            trade_date=trade_date,
            db_session=db,
            job_run_id=job_run.id,
        )

        if df.empty:
            logger.warning("No bhavcopy data for %s (holiday or non-trading day?)", trade_date)
            job_run.status = "succeeded"
            job_run.finished_at = datetime.now(UTC)
            job_run.metrics_json = {**metrics, "note": "no_data_probably_holiday"}
            db.commit()
            return metrics

        metrics["rows_fetched"] = len(df)

        if dry_run:
            logger.info("[DRY RUN] Would insert %d rows for %s", len(df), trade_date)
            job_run.status = "succeeded"
            job_run.finished_at = datetime.now(UTC)
            job_run.metrics_json = metrics
            db.commit()
            return metrics

        # Build symbol→listing_id lookup for NSE
        listings = db.query(ListingV2.symbol, ListingV2.id).filter_by(exchange_code="NSE").all()
        symbol_to_listing_id = {row.symbol: row.id for row in listings}

        for _, row in df.iterrows():
            symbol = str(row.get("symbol", "")).strip().upper()
            listing_id = symbol_to_listing_id.get(symbol)
            if listing_id is None:
                metrics["listings_not_found"] += 1
                continue

            close_price = row.get("close_price")
            if close_price is None or (hasattr(close_price, "__float__") and float(close_price) <= 0):
                continue

            # Check for existing row
            existing_price = (
                db.query(MarketPriceDaily)
                .filter_by(listing_id=listing_id, trade_date=trade_date)
                .first()
            )
            if existing_price:
                metrics["rows_skipped"] += 1
                continue

            price_row = MarketPriceDaily(
                listing_id=listing_id,
                trade_date=trade_date,
                open_price=row.get("open_price") or None,
                high_price=row.get("high_price") or None,
                low_price=row.get("low_price") or None,
                close_price=float(close_price),
                volume=row.get("volume") or None,
                turnover_value=row.get("turnover_value") or None,
                source_name="nse_bhavcopy",
                source_url=str(row.get("source_url", "")),
                quality_flags=[],
            )
            db.add(price_row)
            metrics["rows_inserted"] += 1

            # Batch commits every 500 rows for performance
            if metrics["rows_inserted"] % 500 == 0:
                db.commit()
                logger.info("Committed %d rows so far...", metrics["rows_inserted"])

        db.commit()

        # Propagate today's close prices back to the legacy stocks table so
        # the /stocks API and stock detail pages show current prices without
        # relying on Yahoo Finance.  One UPDATE statement via a subquery join.
        stocks_updated = 0
        if metrics["rows_inserted"] > 0:
            try:
                from sqlalchemy import text
                update_sql = text("""
                    UPDATE stocks s
                    SET price = mpd.close_price,
                        data_source = 'nse_bhavcopy'
                    FROM market_prices_daily mpd
                    JOIN listings_v2 lv ON lv.id = mpd.listing_id
                    WHERE lv.exchange_code = 'NSE'
                      AND lv.symbol = s.symbol
                      AND s.exchange = 'NSE'
                      AND mpd.trade_date = :trade_date
                """)
                result = db.execute(update_sql, {"trade_date": trade_date})
                stocks_updated = result.rowcount
                db.commit()
                logger.info("Updated stocks.price for %d rows from bhavcopy %s", stocks_updated, trade_date)
            except Exception as exc:
                logger.warning("stocks.price writeback failed (non-fatal): %s", exc)
                db.rollback()
        metrics["stocks_price_updated"] = stocks_updated

        job_run.status = "succeeded"
        job_run.finished_at = datetime.now(UTC)
        job_run.metrics_json = metrics
        db.commit()

        logger.info(
            "EOD price sync %s: %d fetched, %d inserted, %d skipped, "
            "%d listings not found, %d stocks.price updated",
            trade_date,
            metrics["rows_fetched"],
            metrics["rows_inserted"],
            metrics["rows_skipped"],
            metrics["listings_not_found"],
            stocks_updated,
        )

    except Exception as exc:
        logger.exception("EOD price sync failed for %s: %s", trade_date, exc)
        try:
            job_run.status = "failed"
            job_run.finished_at = datetime.now(UTC)
            job_run.error_json = {"error": str(exc)}
            db.commit()
        except Exception:
            pass
        metrics["errors"] += 1
        raise
    finally:
        db.close()

    return metrics


def run(trade_date: Optional[date] = None, backfill_days: int = 1, dry_run: bool = False, force: bool = False) -> dict:
    """
    Run EOD price sync for one or more dates.

    Args:
        trade_date: specific date to sync (defaults to yesterday)
        backfill_days: number of days to backfill (overrides trade_date)
        dry_run: fetch but don't write to DB
    """
    if backfill_days > 1:
        end = date.today() - timedelta(days=1)
        start = end - timedelta(days=backfill_days - 1)
        all_metrics = []
        current = start
        while current <= end:
            try:
                m = run_for_date(current, dry_run=dry_run, force=force)
                all_metrics.append(m)
            except Exception as exc:
                logger.warning("Backfill failed for %s: %s", current, exc)
            current += timedelta(days=1)
        return {
            "dates_processed": len(all_metrics),
            "total_inserted": sum(m.get("rows_inserted", 0) for m in all_metrics),
        }

    if trade_date is None:
        trade_date = date.today() - timedelta(days=1)

    return run_for_date(trade_date, dry_run=dry_run, force=force)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EOD price sync pipeline")
    parser.add_argument("--date", type=str, help="Trade date (YYYY-MM-DD). Defaults to yesterday.")
    parser.add_argument("--backfill-days", type=int, default=1, help="Number of days to backfill")
    parser.add_argument("--dry-run", action="store_true", help="Fetch but do not write to DB")
    parser.add_argument("--force", action="store_true", help="Re-run even if today's job already completed")
    args = parser.parse_args()

    target_date: Optional[date] = None
    if args.date:
        target_date = date.fromisoformat(args.date)

    result = run(trade_date=target_date, backfill_days=args.backfill_days, dry_run=args.dry_run, force=args.force)
    logger.info("Result: %s", result)
    sys.exit(0 if result.get("errors", 0) == 0 else 1)
