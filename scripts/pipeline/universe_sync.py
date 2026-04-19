"""
Universe Sync Pipeline — Job Family: Universe

Syncs the Nifty 500 constituent list and NSE securities master into the
issuers + listings_v2 tables.  Also imports symbol/name change history.

Cadence: Daily before market open (suggested: 08:30 IST = 03:00 UTC)
Render cron: "0 3 * * 1-5"  (weekdays only — weekends won't have changes)

This job uses ONLY official NSE public downloads.  No paid API required.

When a paid data provider becomes available, add it as an enrichment step
after this official-source baseline is established — never replace official.

Usage:
    PYTHONPATH=. python3 scripts/pipeline/universe_sync.py
    PYTHONPATH=. python3 scripts/pipeline/universe_sync.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

# Make sure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline.universe_sync")
UTC = timezone.utc

_DB_URL = os.getenv("DATABASE_URL", "")
if not _DB_URL or _DB_URL.startswith("sqlite"):
    logger.error(
        "DATABASE_URL is not set or is SQLite. "
        "Set DATABASE_URL to a Postgres connection string in the Render "
        "dashboard for this cron job (barakfi-universe-sync → Environment Variables)."
    )
    sys.exit(1)


def _idempotency_key(job_name: str) -> str:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    raw = f"{job_name}::{today}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _ensure_tables() -> None:
    """Create any missing v2 and legacy tables before first use (idempotent)."""
    from app.database import Base, engine
    import app.models_v2  # noqa: F401 – registers all v2 models
    import app.models  # noqa: F401 – registers legacy Stock model
    Base.metadata.create_all(bind=engine)


def run(dry_run: bool = False, force: bool = False) -> dict:
    """
    Main entry point for universe sync.

    Returns metrics dict: {inserted, updated, unchanged, errors, warnings}
    """
    _ensure_tables()
    from app.database import SessionLocal
    from app.models_v2 import (
        Issuer, ListingV2, SymbolHistory, JobRun, RawArtifact,
        MethodologyVersion
    )
    from app.models import Stock
    from app.connectors.nse_master import NSEMasterConnector
    from app.services.screening_engine_v2 import DEFAULT_METHODOLOGY_V1
    from sqlalchemy.exc import IntegrityError

    metrics = {
        "issuers_inserted": 0,
        "issuers_updated": 0,
        "issuers_unchanged": 0,
        "listings_inserted": 0,
        "listings_updated": 0,
        "stocks_seeded": 0,
        "symbol_history_inserted": 0,
        "methodology_seeded": False,
        "errors": 0,
        "warnings": [],
    }

    started_at = datetime.now(UTC)
    idempotency_key = _idempotency_key("universe_sync")

    db = SessionLocal()
    try:
        # ---- Check/create job run (idempotency guard) ----
        existing_run = db.query(JobRun).filter_by(idempotency_key=idempotency_key).first()
        if existing_run and existing_run.status == "succeeded" and not force:
            logger.info("Universe sync already completed today (%s) — use --force to re-run", idempotency_key)
            return {**metrics, "skipped": True, "reason": "already_ran_today"}
        if existing_run and force:
            logger.info("Universe sync: --force: resetting previous run")

        job_run = existing_run or JobRun(
            job_name="universe_sync",
            idempotency_key=idempotency_key,
            status="running",
            started_at=started_at,
        )
        if not existing_run:
            db.add(job_run)
        else:
            job_run.status = "running"
            job_run.started_at = started_at
        db.commit()
        db.refresh(job_run)

        # ---- Seed default methodology version ----
        existing_method = db.query(MethodologyVersion).filter_by(
            version_code=DEFAULT_METHODOLOGY_V1["version_code"]
        ).first()
        if not existing_method and not dry_run:
            method = MethodologyVersion(
                version_code=DEFAULT_METHODOLOGY_V1["version_code"],
                methodology_name=DEFAULT_METHODOLOGY_V1["methodology_name"],
                thresholds_json=DEFAULT_METHODOLOGY_V1["thresholds_json"],
                formulas_json=DEFAULT_METHODOLOGY_V1["formulas_json"],
                disclosure_text=DEFAULT_METHODOLOGY_V1["disclosure_text"],
                status=DEFAULT_METHODOLOGY_V1["status"],
                effective_from=datetime.now(UTC),
            )
            db.add(method)
            db.commit()
            metrics["methodology_seeded"] = True
            logger.info("Seeded default methodology version: %s", DEFAULT_METHODOLOGY_V1["version_code"])

        # ---- Fetch Nifty 500 ----
        connector = NSEMasterConnector(timeout=60, max_retries=3)
        nifty500_df = connector.fetch_nifty500()

        if nifty500_df.empty:
            raise RuntimeError("Nifty 500 fetch returned empty DataFrame — aborting")

        logger.info("Processing %d Nifty 500 entries", len(nifty500_df))

        for _, row in nifty500_df.iterrows():
            isin = str(row.get("isin", "") or "").strip()
            symbol = str(row.get("symbol", "") or "").strip().upper()
            company_name = str(row.get("company_name", "") or "").strip()
            industry = str(row.get("industry", "") or "").strip()

            if not isin or len(isin) != 12:
                metrics["warnings"].append(f"Invalid ISIN for {symbol}: '{isin}'")
                continue

            if dry_run:
                logger.debug("[DRY RUN] Would upsert issuer %s (%s)", symbol, isin)
                metrics["issuers_unchanged"] += 1
                continue

            # Upsert issuer
            issuer = db.query(Issuer).filter_by(canonical_isin=isin).first()
            if issuer is None:
                issuer = Issuer(
                    canonical_isin=isin,
                    legal_name=company_name,
                    display_name=company_name,
                    industry_label=industry,
                    coverage_universe="nifty500",
                    lifecycle_status="active",
                )
                db.add(issuer)
                try:
                    db.flush()
                    metrics["issuers_inserted"] += 1
                except IntegrityError:
                    db.rollback()
                    issuer = db.query(Issuer).filter_by(canonical_isin=isin).first()
                    metrics["issuers_unchanged"] += 1
            else:
                changed = False
                if issuer.legal_name != company_name:
                    issuer.legal_name = company_name
                    issuer.display_name = company_name
                    changed = True
                if issuer.industry_label != industry and industry:
                    issuer.industry_label = industry
                    changed = True
                if "nifty500" not in (issuer.coverage_universe or ""):
                    issuer.coverage_universe = "nifty500"
                    changed = True
                if changed:
                    metrics["issuers_updated"] += 1
                else:
                    metrics["issuers_unchanged"] += 1
                db.flush()

            # Upsert listing
            if issuer and issuer.id:
                listing = (
                    db.query(ListingV2)
                    .filter_by(exchange_code="NSE", symbol=symbol)
                    .first()
                )
                if listing is None:
                    listing = ListingV2(
                        issuer_id=issuer.id,
                        exchange_code="NSE",
                        symbol=symbol,
                        listing_status="active",
                        current_is_primary=True,
                    )
                    db.add(listing)
                    try:
                        db.flush()
                        metrics["listings_inserted"] += 1
                    except IntegrityError:
                        db.rollback()
                else:
                    if listing.issuer_id != issuer.id:
                        listing.issuer_id = issuer.id
                    metrics["listings_updated"] += 1
                    db.flush()

            # Seed legacy Stock row so the /stocks API and screener can serve
            # this symbol immediately — fundamentals_sync will enrich later.
            # Uses on_conflict_do_nothing so existing data is never overwritten.
            if not dry_run:
                existing_stock = (
                    db.query(Stock)
                    .filter_by(exchange="NSE", symbol=symbol)
                    .first()
                )
                if existing_stock is None:
                    skeleton = Stock(
                        symbol=symbol,
                        name=company_name,
                        sector=industry or "Unknown",
                        exchange="NSE",
                        isin=isin,
                        currency="INR",
                        country="India",
                        is_active=True,
                        is_etf=False,
                        data_source="nse_master",
                        market_cap=0.0,
                        average_market_cap_36m=0.0,
                        debt=0.0,
                        revenue=0.0,
                        total_business_income=0.0,
                        interest_income=0.0,
                        non_permissible_income=0.0,
                        accounts_receivable=0.0,
                        cash_and_equivalents=0.0,
                        short_term_investments=0.0,
                        fixed_assets=0.0,
                        total_assets=0.0,
                        price=0.0,
                    )
                    db.add(skeleton)
                    try:
                        db.flush()
                        metrics["stocks_seeded"] += 1
                    except IntegrityError:
                        db.rollback()
                else:
                    # Keep name/sector fresh if NSE master has better data
                    updated = False
                    if existing_stock.name != company_name and company_name:
                        existing_stock.name = company_name
                        updated = True
                    if existing_stock.isin != isin and isin:
                        existing_stock.isin = isin
                        updated = True
                    if updated:
                        db.flush()

        db.commit()

        # ---- Fetch and import symbol change history ----
        symbol_changes_df = connector.fetch_symbol_changes()
        if not symbol_changes_df.empty:
            for _, row in symbol_changes_df.iterrows():
                old_sym = str(row.get("old_symbol", "") or "").strip().upper()
                new_sym = str(row.get("new_symbol", "") or "").strip().upper()
                if not old_sym or not new_sym:
                    continue

                listing = db.query(ListingV2).filter_by(exchange_code="NSE", symbol=new_sym).first()
                if listing is None:
                    continue

                if dry_run:
                    continue

                src_hash = str(row.get("source_hash", "unknown"))
                existing_history = (
                    db.query(SymbolHistory)
                    .filter_by(issuer_id=listing.issuer_id, source_hash=src_hash)
                    .first()
                )
                if existing_history:
                    continue

                history = SymbolHistory(
                    issuer_id=listing.issuer_id,
                    exchange_code="NSE",
                    old_symbol=old_sym,
                    new_symbol=new_sym,
                    effective_date=row.get("effective_date"),
                    source_url=NSEMasterConnector.source_name,
                    source_hash=src_hash,
                )
                db.add(history)
                metrics["symbol_history_inserted"] += 1

            try:
                db.commit()
            except Exception as exc:
                db.rollback()
                logger.warning("Symbol history commit failed: %s", exc)

        # ---- Mark job run succeeded ----
        job_run.status = "succeeded"
        job_run.finished_at = datetime.now(UTC)
        job_run.metrics_json = metrics
        db.commit()

        logger.info(
            "Universe sync complete: %d issuers inserted, %d updated, %d unchanged, "
            "%d listing inserts, %d legacy Stock rows seeded",
            metrics["issuers_inserted"],
            metrics["issuers_updated"],
            metrics["issuers_unchanged"],
            metrics["listings_inserted"],
            metrics["stocks_seeded"],
        )

    except Exception as exc:
        logger.exception("Universe sync failed: %s", exc)
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Universe sync pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Fetch data but do not write to DB")
    parser.add_argument("--force", action="store_true", help="Re-run even if today's job already completed")
    args = parser.parse_args()

    result = run(dry_run=args.dry_run, force=args.force)
    logger.info("Result: %s", result)
    sys.exit(0 if result.get("errors", 0) == 0 else 1)
