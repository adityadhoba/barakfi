"""
Screening Recompute Pipeline — Job Family: Screening

Recomputes halal screening verdicts for all active issuers using the latest
fundamentals snapshots, business activity reviews, and the active methodology version.

Cadence: Nightly after EOD price sync (suggested: 19:30 IST = 14:00 UTC)
Also triggered: after new filings are ingested (event-driven, via job queue)

Render cron: "0 14 * * 1-5"

This is the ONLY place where ScreeningResultV2 rows are created.
The engine is purely read-from-official-data + write-screening-result.
No external API calls are made here.

Usage:
    PYTHONPATH=. python3 scripts/pipeline/screening_recompute.py
    PYTHONPATH=. python3 scripts/pipeline/screening_recompute.py --symbol TCS
    PYTHONPATH=. python3 scripts/pipeline/screening_recompute.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import sys
from datetime import date, datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline.screening_recompute")
UTC = timezone.utc

_DB_URL = os.getenv("DATABASE_URL", "")
if not _DB_URL or _DB_URL.startswith("sqlite"):
    logger.error(
        "DATABASE_URL is not set or is SQLite. "
        "Set DATABASE_URL to a Postgres connection string in the Render "
        "dashboard for this cron job (barakfi-screening-recompute → Environment Variables)."
    )
    sys.exit(1)


def _idempotency_key(job_name: str, symbol: Optional[str] = None) -> str:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    suffix = symbol or "all"
    raw = f"{job_name}::{today}::{suffix}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _ensure_tables() -> None:
    """Create any missing v2 tables before first use (idempotent)."""
    from app.database import Base, engine
    import app.models_v2  # noqa: F401 – registers all v2 models
    Base.metadata.create_all(bind=engine)


def run(symbol: Optional[str] = None, dry_run: bool = False, force: bool = False) -> dict:
    """
    Recompute screening results.

    Args:
        symbol: if provided, only recompute for this NSE symbol
        dry_run: compute but do not write to DB
    """
    _ensure_tables()
    from app.database import SessionLocal
    from app.models_v2 import (
        Issuer, ListingV2, FundamentalsSnapshot, BusinessActivityReview,
        MethodologyVersion, ScreeningResultV2, JobRun
    )
    from app.services.screening_engine_v2 import ScreeningEngineV2
    from sqlalchemy.exc import IntegrityError

    metrics: dict = {
        "issuers_processed": 0,
        "results_inserted": 0,
        "results_updated": 0,
        "results_skipped": 0,
        "errors": 0,
        "warnings": [],
    }

    idempotency_key = _idempotency_key("screening_recompute", symbol)
    started_at = datetime.now(UTC)

    db = SessionLocal()
    try:
        # Idempotency guard (per-symbol runs can repeat)
        existing_run = db.query(JobRun).filter_by(idempotency_key=idempotency_key).first()
        if existing_run and existing_run.status == "succeeded" and symbol is None and not force:
            logger.info("Full recompute already ran today — skipping (use --force to re-run)")
            return {**metrics, "skipped": True}
        if existing_run and force:
            logger.info("Screening recompute: --force: resetting previous run")

        job_run = existing_run or JobRun(
            job_name="screening_recompute",
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

        # Load active methodology version
        methodology = (
            db.query(MethodologyVersion)
            .filter_by(status="active")
            .order_by(MethodologyVersion.effective_from.desc())
            .first()
        )
        if methodology is None:
            logger.error("No active methodology version found — cannot screen")
            raise RuntimeError("No active methodology version")

        engine = ScreeningEngineV2({
            "version_code": methodology.version_code,
            "thresholds_json": methodology.thresholds_json,
            "formulas_json": methodology.formulas_json,
            "disclosure_text": methodology.disclosure_text,
        })
        logger.info("Using methodology: %s", methodology.version_code)

        # Build query for issuers to process
        q = db.query(Issuer).filter(Issuer.lifecycle_status == "active")
        if symbol:
            q = q.join(ListingV2, ListingV2.issuer_id == Issuer.id).filter(
                ListingV2.symbol == symbol.strip().upper(),
                ListingV2.exchange_code == "NSE",
            )

        issuers = q.all()
        logger.info("Screening %d issuers", len(issuers))

        for issuer in issuers:
            try:
                # Get latest fundamentals snapshot
                snapshot = (
                    db.query(FundamentalsSnapshot)
                    .filter_by(issuer_id=issuer.id)
                    .order_by(FundamentalsSnapshot.snapshot_date.desc())
                    .first()
                )
                snapshot_dict = None
                if snapshot:
                    snapshot_dict = {
                        "total_debt": float(snapshot.total_debt) if snapshot.total_debt else None,
                        "cash_and_equivalents": float(snapshot.cash_and_equivalents) if snapshot.cash_and_equivalents else None,
                        "revenue": float(snapshot.revenue) if snapshot.revenue else None,
                        "non_operating_income": float(snapshot.non_operating_income) if snapshot.non_operating_income else None,
                        "market_cap": float(snapshot.market_cap) if snapshot.market_cap else None,
                        "average_market_cap_24m": float(snapshot.average_market_cap_24m) if snapshot.average_market_cap_24m else None,
                        "basis": snapshot.basis,
                        "snapshot_date": snapshot.snapshot_date.isoformat() if snapshot.snapshot_date else None,
                        "source_refs_json": snapshot.source_refs_json or [],
                    }

                # Get current business activity review
                activity_review = (
                    db.query(BusinessActivityReview)
                    .filter_by(issuer_id=issuer.id)
                    .filter(BusinessActivityReview.effective_to.is_(None))
                    .order_by(BusinessActivityReview.effective_from.desc())
                    .first()
                )
                activity_dict = None
                if activity_review:
                    activity_dict = {
                        "review_status": activity_review.review_status,
                        "confidence_label": activity_review.confidence_label,
                        "manual_override": activity_review.manual_override,
                        "evidence_json": activity_review.evidence_json or [],
                    }

                # Run screening engine
                explainability = engine.screen(
                    snapshot=snapshot_dict,
                    activity_review=activity_dict,
                    price_as_of=date.today(),
                )

                overall_status = explainability["overall_status"]
                short_reason = explainability["short_reason"]
                detailed_reason = explainability["detailed_reason"]

                if dry_run:
                    logger.debug(
                        "[DRY RUN] %s → %s", issuer.canonical_isin, overall_status
                    )
                    metrics["issuers_processed"] += 1
                    continue

                # Get primary listing for this issuer
                primary_listing = (
                    db.query(ListingV2)
                    .filter_by(issuer_id=issuer.id, current_is_primary=True)
                    .first()
                )
                if primary_listing is None:
                    primary_listing = (
                        db.query(ListingV2)
                        .filter_by(issuer_id=issuer.id)
                        .first()
                    )

                now = datetime.now(UTC)
                existing_result = (
                    db.query(ScreeningResultV2)
                    .filter(
                        ScreeningResultV2.issuer_id == issuer.id,
                        ScreeningResultV2.methodology_version_id == methodology.id,
                        ScreeningResultV2.screened_at >= datetime.now(UTC).replace(hour=0, minute=0, second=0),
                    )
                    .first()
                )

                if existing_result:
                    existing_result.overall_status = overall_status
                    existing_result.short_reason = short_reason
                    existing_result.detailed_reason = detailed_reason
                    existing_result.explainability_json = explainability
                    existing_result.last_updated = now
                    if snapshot:
                        existing_result.fundamentals_snapshot_id = snapshot.id
                    if activity_review:
                        existing_result.business_activity_review_id = activity_review.id
                    metrics["results_updated"] += 1
                else:
                    result = ScreeningResultV2(
                        issuer_id=issuer.id,
                        listing_id=primary_listing.id if primary_listing else None,
                        methodology_version_id=methodology.id,
                        fundamentals_snapshot_id=snapshot.id if snapshot else None,
                        business_activity_review_id=activity_review.id if activity_review else None,
                        overall_status=overall_status,
                        short_reason=short_reason,
                        detailed_reason=detailed_reason,
                        explainability_json=explainability,
                        screened_at=now,
                        last_updated=now,
                    )
                    db.add(result)
                    metrics["results_inserted"] += 1

                db.flush()
                metrics["issuers_processed"] += 1

                # Batch commits
                if metrics["issuers_processed"] % 50 == 0:
                    db.commit()
                    logger.info("Screened %d issuers so far...", metrics["issuers_processed"])

            except Exception as exc:
                logger.warning("Failed to screen issuer %s: %s", issuer.canonical_isin, exc)
                metrics["errors"] += 1
                db.rollback()

        db.commit()

        job_run.status = "succeeded"
        job_run.finished_at = datetime.now(UTC)
        job_run.metrics_json = metrics
        db.commit()

        logger.info(
            "Screening recompute complete: %d processed, %d inserted, %d updated, %d errors",
            metrics["issuers_processed"],
            metrics["results_inserted"],
            metrics["results_updated"],
            metrics["errors"],
        )

    except Exception as exc:
        logger.exception("Screening recompute failed: %s", exc)
        try:
            job_run.status = "failed"
            job_run.finished_at = datetime.now(UTC)
            job_run.error_json = {"error": str(exc)}
            db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Screening recompute pipeline")
    parser.add_argument("--symbol", type=str, help="Recompute only for this NSE symbol")
    parser.add_argument("--dry-run", action="store_true", help="Compute but do not write to DB")
    parser.add_argument("--force", action="store_true", help="Re-run even if today's job already completed")
    args = parser.parse_args()

    result = run(symbol=args.symbol, dry_run=args.dry_run, force=args.force)
    logger.info("Result: %s", result)
    sys.exit(0 if result.get("errors", 0) == 0 else 1)
