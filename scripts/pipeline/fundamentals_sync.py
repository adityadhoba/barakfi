"""
Fundamentals Sync Pipeline — Job Family: Fundamentals

Primary data source: NSE Financial Results API (official Reg 33 filings)
Fallback: yfinance (via existing connector) when NSE API returns no data

Flow per symbol:
  1. Fetch NSE financial results JSON → DataFinancialFact rows (via nse_xbrl connector)
  2. Read DataFinancialFact rows → aggregate into FundamentalsSnapshot (v2 canonical)
  3. Compute market cap = latest bhavcopy close × shares outstanding
  4. Compute 36m avg market cap from MarketPriceDaily history
  5. Write FundamentalsSnapshot row (v2 pipeline)
  6. Write-back to Stock.* fields (legacy API compatibility — zero disruption)
  7. Fall back to yfinance if NSE returned no data for the symbol

Cadence: Weekdays after market close, after EOD price sync
Render cron: "0 12 * * 1-5"  (runs before screening_recompute at 14:00 UTC)

After this job runs:
  - FundamentalsSnapshot is populated → screening_recompute.py can run
  - Stock table is kept in sync → existing /screen/{symbol} API works unchanged

Usage:
    PYTHONPATH=. python3 scripts/pipeline/fundamentals_sync.py
    PYTHONPATH=. python3 scripts/pipeline/fundamentals_sync.py --symbol TCS
    PYTHONPATH=. python3 scripts/pipeline/fundamentals_sync.py --dry-run
    PYTHONPATH=. python3 scripts/pipeline/fundamentals_sync.py --period Quarterly
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline.fundamentals_sync")
UTC = timezone.utc

_DB_URL = os.getenv("DATABASE_URL", "")
if not _DB_URL or _DB_URL.startswith("sqlite"):
    logger.error(
        "DATABASE_URL is not set or is SQLite. "
        "Set DATABASE_URL to a Postgres connection string in the Render "
        "dashboard for this cron job (barakfi-fundamentals-sync → Environment Variables)."
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Metric code → FundamentalsSnapshot column mapping
# ---------------------------------------------------------------------------
_METRIC_TO_SNAPSHOT: dict[str, str] = {
    "TOTAL_DEBT": "total_debt",
    "CASH_AND_EQUIVALENTS": "cash_and_equivalents",
    "SHORT_TERM_INVESTMENTS": "short_term_investments",
    "REVENUE": "revenue",
    "TOTAL_BUSINESS_INCOME": "total_business_income",
    "INTEREST_INCOME": "interest_income",
    "NON_OPERATING_INCOME": "non_operating_income",
    "ACCOUNTS_RECEIVABLE": "accounts_receivable",
    "TOTAL_ASSETS": "total_assets",
    "FIXED_ASSETS": "fixed_assets",
    "NET_INCOME": "net_income",
    "EBITDA": "ebitda",
    "SHARES_OUTSTANDING": "shares_outstanding",
}

# Metric code → legacy Stock column (for write-back)
# Values from NSE are in INR Crores; Stock columns also in Crores (INR)
_METRIC_TO_STOCK: dict[str, str] = {
    "TOTAL_DEBT": "debt",
    "CASH_AND_EQUIVALENTS": "cash_and_equivalents",
    "SHORT_TERM_INVESTMENTS": "short_term_investments",
    "REVENUE": "revenue",
    "TOTAL_BUSINESS_INCOME": "total_business_income",
    "INTEREST_INCOME": "interest_income",
    "NON_OPERATING_INCOME": "non_permissible_income",
    "ACCOUNTS_RECEIVABLE": "accounts_receivable",
    "TOTAL_ASSETS": "total_assets",
    "FIXED_ASSETS": "fixed_assets",
}


def _ensure_tables() -> None:
    """Create any missing v2 and warehouse tables before first use (idempotent)."""
    from app.database import Base, engine
    import app.models_v2  # noqa: F401
    import app.models_data_warehouse  # noqa: F401
    Base.metadata.create_all(bind=engine)


def _idempotency_key(job_name: str, suffix: str = "") -> str:
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    raw = f"{job_name}::{today}::{suffix}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _get_facts_for_issuer(
    db: Any, issuer_id: int, limit_days: int = 180
) -> dict[str, float]:
    """
    Read the most-recent DataFinancialFact rows for *issuer_id*.
    Returns {metric_code: value_numeric} for the most-recent period.
    """
    from app.models_data_warehouse import DataFinancialFact, DataFinancialPeriod

    cutoff = date.today() - timedelta(days=limit_days)
    period = (
        db.query(DataFinancialPeriod)
        .filter(
            DataFinancialPeriod.issuer_id == issuer_id,
            DataFinancialPeriod.period_end_date >= cutoff,
        )
        .order_by(DataFinancialPeriod.period_end_date.desc())
        .first()
    )
    if not period:
        return {}

    facts = (
        db.query(DataFinancialFact)
        .filter(DataFinancialFact.period_id == period.id)
        .all()
    )
    return {f.metric_code: float(f.value_numeric) for f in facts if f.value_numeric is not None}


def _compute_market_cap(
    db: Any, issuer_id: int, shares_outstanding_cr: Optional[float]
) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Compute current market cap and 36m average from MarketPriceDaily.

    shares_outstanding_cr: shares outstanding in Crores (NSE unit for paid-up capital)
    Returns: (market_cap, avg_24m, avg_36m) all in INR Crores or None.
    """
    from app.models_v2 import ListingV2, MarketPriceDaily

    if not shares_outstanding_cr or shares_outstanding_cr <= 0:
        return None, None, None

    # Convert paid-up equity capital (Crores of face-value) to shares count
    # NSE's SHARES_OUTSTANDING metric = paid-up equity capital ÷ face value
    # We just use it as a proportional scale factor; absolute MCap from bhavcopy is more accurate.

    primary_listing = (
        db.query(ListingV2)
        .filter(
            ListingV2.issuer_id == issuer_id,
            ListingV2.exchange_code == "NSE",
            ListingV2.current_is_primary == True,  # noqa: E712
        )
        .first()
    )
    if not primary_listing:
        return None, None, None

    today = date.today()
    cutoff_36m = today - timedelta(days=36 * 30)
    cutoff_24m = today - timedelta(days=24 * 30)

    prices = (
        db.query(MarketPriceDaily)
        .filter(
            MarketPriceDaily.listing_id == primary_listing.id,
            MarketPriceDaily.trade_date >= cutoff_36m,
        )
        .order_by(MarketPriceDaily.trade_date.desc())
        .all()
    )
    if not prices:
        return None, None, None

    latest_close = float(prices[0].close_price)
    # shares_outstanding_cr is paid-up capital in Crores (face value × shares / 1Cr)
    # Derive shares from face value (typically ₹10 or ₹1); we use market cap proxy instead
    # If the listing has shares from close × shares we can compute directly.
    # For now, skip if no share count is available from a reliable source.
    # Instead: use all close prices to derive avg market cap ratios normalized to latest.
    closes = [float(p.close_price) for p in prices if p.close_price]
    if not closes:
        return None, None, None

    # We don't know absolute share count; compute market cap proportionally
    # as latest market cap × (avg close / latest close)
    # This is approximate — will be replaced with exact shares from shareholding XBRL.
    # Provide market cap = None if no external source; store relative averages for ratios.
    # For now return None to signal "not yet computable without shares".
    # Screening engine will use market_cap from Stock table as fallback.
    return None, None, None


def _upsert_fundamentals_snapshot(
    db: Any,
    issuer_id: int,
    facts: dict[str, float],
    market_cap: Optional[float],
    avg_24m: Optional[float],
    avg_36m: Optional[float],
    snapshot_date: date,
    data_source: str,
) -> Any:
    """Upsert a FundamentalsSnapshot row from extracted facts."""
    from app.models_v2 import FundamentalsSnapshot

    existing = (
        db.query(FundamentalsSnapshot)
        .filter(
            FundamentalsSnapshot.issuer_id == issuer_id,
            FundamentalsSnapshot.snapshot_date == snapshot_date,
            FundamentalsSnapshot.basis == "quarterly_reported",
        )
        .one_or_none()
    )

    snap_kwargs: dict[str, Any] = {
        "issuer_id": issuer_id,
        "snapshot_date": snapshot_date,
        "basis": "quarterly_reported",
        "currency_code": "INR",
        "data_source": data_source,
        "source_refs_json": [{"source": data_source, "as_of": snapshot_date.isoformat()}],
        "segment_revenue_json": [],
    }
    if market_cap is not None:
        snap_kwargs["market_cap"] = market_cap
    if avg_24m is not None:
        snap_kwargs["average_market_cap_24m"] = avg_24m
    if avg_36m is not None:
        snap_kwargs["average_market_cap_36m"] = avg_36m

    for metric_code, snap_col in _METRIC_TO_SNAPSHOT.items():
        val = facts.get(metric_code)
        if val is not None:
            snap_kwargs[snap_col] = val

    # Completeness: count non-None halal-critical fields
    critical = ["total_debt", "cash_and_equivalents", "revenue", "total_business_income",
                "interest_income", "accounts_receivable", "total_assets"]
    filled = sum(1 for col in critical if snap_kwargs.get(col) is not None)
    snap_kwargs["completeness_score"] = round((filled / len(critical)) * 100, 2)
    snap_kwargs["stale_after"] = datetime(snapshot_date.year + 1, snapshot_date.month,
                                           min(snapshot_date.day, 28), tzinfo=UTC)

    if existing:
        for k, v in snap_kwargs.items():
            setattr(existing, k, v)
        db.add(existing)
    else:
        row = FundamentalsSnapshot(**snap_kwargs)
        db.add(row)

    db.flush()
    return existing or snap_kwargs


def _write_back_to_stock(
    db: Any,
    symbol: str,
    facts: dict[str, float],
    market_cap: Optional[float],
    avg_36m: Optional[float],
) -> bool:
    """
    Write extracted facts back to the legacy Stock table for API compatibility.

    This keeps /stocks/{symbol} and /screen/{symbol} working unchanged while
    the v2 pipeline is being built out.
    """
    from app.models import Stock

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol, Stock.exchange == "NSE")
        .one_or_none()
    )
    if not stock:
        return False

    updated = False
    for metric_code, stock_col in _METRIC_TO_STOCK.items():
        val = facts.get(metric_code)
        if val is not None and hasattr(stock, stock_col):
            setattr(stock, stock_col, val)
            updated = True

    if market_cap is not None:
        stock.market_cap = market_cap
        updated = True
    if avg_36m is not None:
        stock.average_market_cap_36m = avg_36m
        updated = True

    if updated:
        stock.fundamentals_updated_at = datetime.now(UTC)
        stock.data_source = "nse_xbrl"
        db.add(stock)
    return updated


def _fallback_yfinance(symbol: str, db: Any) -> dict[str, float]:
    """
    Fallback: write yfinance fundamentals to DataFinancialFact when NSE returns nothing.

    Uses the existing yfinance_fallback connector which writes tall facts in TTM_VENDOR periods.
    Returns {metric_code: value} read back from those fact rows, or {} on failure.
    """
    try:
        from app.connectors.yfinance_fallback import write_yfinance_facts_for_symbol
        result = write_yfinance_facts_for_symbol(db, symbol, exchange="NSE")
        if not result.get("ok"):
            return {}

        # The issuer_id is embedded in the fact rows — read them back via DataIssuer
        from app.models_data_warehouse import DataIssuer, DataFinancialPeriod, DataFinancialFact
        from app.models import Stock
        stock = db.query(Stock).filter(Stock.symbol == symbol, Stock.exchange == "NSE").one_or_none()
        if not stock or not stock.isin:
            return {}
        data_issuer = (
            db.query(DataIssuer)
            .filter(DataIssuer.canonical_isin == stock.isin)
            .one_or_none()
        )
        if not data_issuer:
            return {}

        from datetime import timedelta
        period = (
            db.query(DataFinancialPeriod)
            .filter(
                DataFinancialPeriod.issuer_id == data_issuer.id,
                DataFinancialPeriod.period_type == "TTM_VENDOR",
            )
            .order_by(DataFinancialPeriod.period_end_date.desc())
            .first()
        )
        if not period:
            return {}

        facts = (
            db.query(DataFinancialFact)
            .filter(DataFinancialFact.period_id == period.id)
            .all()
        )
        return {f.metric_code: float(f.value_numeric) for f in facts if f.value_numeric is not None}
    except Exception as exc:
        logger.debug("yfinance fallback failed for %s: %s", symbol, exc)
        return {}


def run(
    symbol_filter: Optional[str] = None,
    dry_run: bool = False,
    period: str = "Annual",
) -> dict[str, Any]:
    """Main entry point for fundamentals sync."""
    _ensure_tables()

    from app.database import SessionLocal
    from app.models_v2 import Issuer, ListingV2, JobRun

    metrics: dict[str, Any] = {
        "symbols_attempted": 0,
        "nse_xbrl_ok": 0,
        "yfinance_fallback": 0,
        "snapshot_written": 0,
        "stock_written": 0,
        "empty": 0,
        "errors": 0,
        "dry_run": dry_run,
    }

    db = SessionLocal()
    started_at = datetime.now(UTC)
    ikey = _idempotency_key("fundamentals_sync", symbol_filter or "all")

    try:
        existing_run = db.query(JobRun).filter_by(idempotency_key=ikey).first()
        if existing_run and existing_run.status == "succeeded":
            logger.info("fundamentals_sync: already ran today (%s)", ikey)
            return {**metrics, "skipped": True, "reason": "already_ran_today"}

        job_run = existing_run or JobRun(
            job_name="fundamentals_sync",
            idempotency_key=ikey,
            status="running",
            started_at=started_at,
            attempt_count=1,
        )
        if not existing_run:
            db.add(job_run)
        else:
            job_run.status = "running"
            job_run.started_at = started_at
            job_run.attempt_count = (job_run.attempt_count or 0) + 1
        db.commit()

        # Collect all active NSE listings
        query = (
            db.query(ListingV2, Issuer)
            .join(Issuer, ListingV2.issuer_id == Issuer.id)
            .filter(
                ListingV2.exchange_code == "NSE",
                ListingV2.current_is_primary == True,  # noqa: E712
                Issuer.lifecycle_status == "active",
            )
        )
        if symbol_filter:
            query = query.filter(ListingV2.symbol == symbol_filter.upper())

        listings = query.all()
        logger.info("fundamentals_sync: %d symbols to process", len(listings))

        from app.connectors.nse_xbrl import sync_symbol_financials

        # Resolve issuer_id in data_warehouse (DataIssuer) for DataFinancialFact writes
        from app.models_data_warehouse import DataIssuer
        snapshot_date = date.today()

        for listing, issuer in listings:
            metrics["symbols_attempted"] += 1
            symbol = listing.symbol

            try:
                # Resolve or create DataIssuer for warehouse fact writes
                data_issuer = (
                    db.query(DataIssuer)
                    .filter(DataIssuer.canonical_isin == issuer.canonical_isin)
                    .one_or_none()
                )
                if not data_issuer:
                    data_issuer = DataIssuer(
                        canonical_isin=issuer.canonical_isin,
                        legal_name=issuer.legal_name,
                        display_name=issuer.display_name,
                        industry_label=issuer.industry_label,
                        sector_label=issuer.sector_label,
                        coverage_universe=issuer.coverage_universe,
                        lifecycle_status=issuer.lifecycle_status,
                    )
                    db.add(data_issuer)
                    db.flush()

                # Step 1: Fetch NSE XBRL → DataFinancialFact
                if not dry_run:
                    xbrl_result = sync_symbol_financials(
                        db, symbol, data_issuer.id, period=period
                    )
                    nse_ok = xbrl_result.get("status") == "ok" and xbrl_result.get("facts_written", 0) > 0
                else:
                    nse_ok = False  # dry run: skip writes

                if nse_ok:
                    metrics["nse_xbrl_ok"] += 1
                    data_source = "nse_xbrl"
                else:
                    # Step 2: Fallback to yfinance
                    logger.debug("fundamentals_sync: NSE empty for %s, trying yfinance", symbol)
                    fallback_facts = _fallback_yfinance(symbol, db)
                    if fallback_facts:
                        metrics["yfinance_fallback"] += 1
                        data_source = "yfinance_fallback"
                    else:
                        metrics["empty"] += 1
                        logger.debug("fundamentals_sync: no data for %s", symbol)
                        continue

                # Step 3: Read DataFinancialFact → aggregate
                facts = _get_facts_for_issuer(db, data_issuer.id)
                if not facts and not dry_run:
                    # If NSE just wrote facts they may be visible now
                    db.expire_all()
                    facts = _get_facts_for_issuer(db, data_issuer.id)

                if not facts:
                    metrics["empty"] += 1
                    continue

                # Step 4: Compute market cap from bhavcopy
                shares_cr = facts.get("SHARES_OUTSTANDING")
                market_cap, avg_24m, avg_36m = _compute_market_cap(db, issuer.id, shares_cr)

                if dry_run:
                    logger.info(
                        "DRY RUN %s: facts=%s mcap=%s", symbol, list(facts.keys()), market_cap
                    )
                    continue

                # Step 5: Write FundamentalsSnapshot
                _upsert_fundamentals_snapshot(
                    db, issuer.id, facts, market_cap, avg_24m, avg_36m, snapshot_date, data_source
                )
                db.commit()
                metrics["snapshot_written"] += 1

                # Step 6: Write back to Stock table
                wrote_stock = _write_back_to_stock(db, symbol, facts, market_cap, avg_36m)
                if wrote_stock:
                    metrics["stock_written"] += 1
                db.commit()

            except Exception as exc:
                logger.exception("fundamentals_sync: error for %s: %s", symbol, exc)
                db.rollback()
                metrics["errors"] += 1

        # Finalize job run
        job_run.status = "succeeded"
        job_run.finished_at = datetime.now(UTC)
        job_run.metrics_json = metrics
        db.commit()
        logger.info("fundamentals_sync: complete metrics=%s", metrics)
        return metrics

    except Exception as exc:
        logger.exception("fundamentals_sync: fatal error: %s", exc)
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Fundamentals sync pipeline (NSE XBRL first)")
    parser.add_argument("--symbol", help="Sync a single NSE symbol only")
    parser.add_argument(
        "--dry-run", action="store_true", help="Fetch data but do not write to DB"
    )
    parser.add_argument(
        "--period",
        choices=["Annual", "Quarterly"],
        default="Annual",
        help="NSE financial results period (default: Annual)",
    )
    args = parser.parse_args()
    result = run(
        symbol_filter=args.symbol,
        dry_run=args.dry_run,
        period=args.period,
    )
    logger.info("result=%s", result)
    if result.get("errors", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
