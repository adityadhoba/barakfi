"""
One-time / on-demand ingestion: load NSE resCmpData JSON → DB.

This script processes JSON files downloaded via the browser console script
(which fetches /api/results-comparision for each symbol) and writes the data
into the same tables that fundamentals_sync.py would populate.

It reuses the metric extraction and DB write logic from:
  - app/connectors/nse_xbrl.py      (_extract_rescmpdata_metrics)
  - scripts/pipeline/fundamentals_sync.py  (_upsert_fundamentals_snapshot, _write_back_to_stock)

Usage:
    PYTHONPATH=. python3 scripts/pipeline/ingest_nse_json.py --file nse_fundamentals_all.json
    PYTHONPATH=. python3 scripts/pipeline/ingest_nse_json.py --file nse_fundamentals_batch2.json
    PYTHONPATH=. python3 scripts/pipeline/ingest_nse_json.py --file data.json --dry-run
    PYTHONPATH=. python3 scripts/pipeline/ingest_nse_json.py --file data.json --symbol TCS
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date, datetime, timezone
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline.ingest_nse_json")
UTC = timezone.utc

_DB_URL = os.getenv("DATABASE_URL", "")
if not _DB_URL or _DB_URL.startswith("sqlite"):
    logger.error(
        "DATABASE_URL is not set or is SQLite. "
        "Set DATABASE_URL to a Postgres connection string."
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Re-export the metric extraction from nse_xbrl (avoids duplication)
# ---------------------------------------------------------------------------
from app.connectors.nse_xbrl import (  # noqa: E402
    _extract_rescmpdata_metrics,
    METRIC_SHARES_OUTSTANDING,
)

# Metric code → FundamentalsSnapshot column (mirrors fundamentals_sync.py)
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
}

# Metric code → legacy Stock column
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


# ---------------------------------------------------------------------------
# DB helpers (mirrors fundamentals_sync.py)
# ---------------------------------------------------------------------------

def _resolve_or_create_data_issuer(db: Any, symbol: str) -> tuple[int | None, str | None]:
    """
    Look up DataIssuer via ListingV2/Issuer → canonical_isin.
    Creates a DataIssuer shell row if one does not yet exist.
    Returns (data_issuer_id, canonical_isin) or (None, None) if symbol unknown.
    """
    from app.models_v2 import Issuer, ListingV2
    from app.models_data_warehouse import DataIssuer

    listing = (
        db.query(ListingV2)
        .join(Issuer, ListingV2.issuer_id == Issuer.id)
        .filter(
            ListingV2.symbol == symbol,
            ListingV2.exchange_code == "NSE",
            ListingV2.current_is_primary == True,  # noqa: E712
        )
        .first()
    )
    if not listing:
        return None, None

    issuer = db.query(Issuer).filter(Issuer.id == listing.issuer_id).one_or_none()
    if not issuer:
        return None, None

    canonical_isin = issuer.canonical_isin
    data_issuer = (
        db.query(DataIssuer)
        .filter(DataIssuer.canonical_isin == canonical_isin)
        .one_or_none()
    )
    if not data_issuer:
        data_issuer = DataIssuer(
            canonical_isin=canonical_isin,
            primary_name=issuer.primary_name or symbol,
            country_of_incorporation="IN",
        )
        db.add(data_issuer)
        db.flush()

    return data_issuer.id, canonical_isin


def _write_financial_facts(
    db: Any,
    data_issuer_id: int,
    facts: dict[str, float],
    period_end: date,
    source_url: str,
    dry_run: bool,
) -> tuple[int, int]:
    """
    Write DataFinancialFact rows for the given issuer + period.
    Returns (facts_written, facts_skipped).
    """
    from app.models_data_warehouse import (
        DataFiling,
        DataFinancialFact,
        DataFinancialPeriod,
    )

    if dry_run:
        return len(facts), 0

    content_hash = str(hash(str(sorted(facts.items()))))[:16]

    filing = (
        db.query(DataFiling)
        .filter(
            DataFiling.issuer_id == data_issuer_id,
            DataFiling.filing_type == "financial_results",
            DataFiling.period_end_date == period_end,
            DataFiling.period_type == "ANNUAL",
        )
        .one_or_none()
    )
    if not filing:
        filing = DataFiling(
            issuer_id=data_issuer_id,
            filing_type="financial_results",
            filing_subtype="nse_json_ingest",
            exchange_code="NSE",
            period_type="ANNUAL",
            period_end_date=period_end,
            document_url=source_url,
            source_ref="ingest_nse_json",
            content_sha256=content_hash,
        )
        db.add(filing)
        db.flush()

    fin_period = (
        db.query(DataFinancialPeriod)
        .filter(
            DataFinancialPeriod.issuer_id == data_issuer_id,
            DataFinancialPeriod.period_end_date == period_end,
            DataFinancialPeriod.period_type == "ANNUAL",
            DataFinancialPeriod.statement_scope == "CONSOLIDATED",
        )
        .one_or_none()
    )
    if not fin_period:
        fin_period = DataFinancialPeriod(
            issuer_id=data_issuer_id,
            filing_id=filing.id,
            statement_scope="CONSOLIDATED",
            period_type="ANNUAL",
            period_end_date=period_end,
            currency_code="INR",
        )
        db.add(fin_period)
        db.flush()

    existing_codes = {
        row.metric_code
        for row in db.query(DataFinancialFact.metric_code).filter(
            DataFinancialFact.period_id == fin_period.id
        )
    }

    written = 0
    skipped = 0
    for metric_code, value in facts.items():
        if metric_code in existing_codes:
            skipped += 1
            continue
        fact = DataFinancialFact(
            period_id=fin_period.id,
            metric_code=metric_code,
            value_numeric=value,
            unit="INR_CRORE",
            source_name="nse_json_ingest",
            confidence=0.85,
            provenance_json={
                "source_url": source_url,
                "content_hash": content_hash,
                "fetched_at": datetime.now(UTC).isoformat(),
                "period": "Annual",
                "ingest_script": "ingest_nse_json.py",
            },
        )
        db.add(fact)
        written += 1

    db.commit()
    return written, skipped


def _upsert_snapshot(
    db: Any,
    issuer_id: int,
    facts: dict[str, float],
    market_cap: Optional[float],
    avg_24m: Optional[float],
    avg_36m: Optional[float],
    snapshot_date: date,
    dry_run: bool,
) -> None:
    if dry_run:
        return

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
        "data_source": "nse_json_ingest",
        "source_refs_json": [{"source": "nse_json_ingest", "as_of": snapshot_date.isoformat()}],
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

    critical = ["total_debt", "cash_and_equivalents", "revenue", "total_business_income",
                "interest_income", "accounts_receivable", "total_assets"]
    filled = sum(1 for col in critical if snap_kwargs.get(col) is not None)
    snap_kwargs["completeness_score"] = round((filled / len(critical)) * 100, 2)
    snap_kwargs["stale_after"] = datetime(
        snapshot_date.year + 1, snapshot_date.month,
        min(snapshot_date.day, 28), tzinfo=UTC,
    )

    if existing:
        for k, v in snap_kwargs.items():
            setattr(existing, k, v)
        db.add(existing)
    else:
        db.add(FundamentalsSnapshot(**snap_kwargs))

    db.flush()


def _lookup_issuer_meta(db: Any, symbol: str) -> tuple[str, str]:
    """
    Return (company_name, sector) from Issuer for the given NSE symbol.
    Falls back to (symbol, "Unknown") if not found.
    """
    from app.models_v2 import Issuer, ListingV2

    listing = (
        db.query(ListingV2)
        .join(Issuer, ListingV2.issuer_id == Issuer.id)
        .filter(
            ListingV2.symbol == symbol,
            ListingV2.exchange_code == "NSE",
            ListingV2.current_is_primary == True,  # noqa: E712
        )
        .first()
    )
    if not listing:
        return symbol, "Unknown"

    issuer = db.query(Issuer).filter(Issuer.id == listing.issuer_id).one_or_none()
    if not issuer:
        return symbol, "Unknown"

    name = issuer.display_name or issuer.legal_name or issuer.primary_name or symbol
    sector = issuer.industry_label or "Unknown"
    return name, sector


def _write_back_to_stock(
    db: Any,
    symbol: str,
    facts: dict[str, float],
    market_cap: Optional[float],
    avg_36m: Optional[float],
    dry_run: bool,
) -> bool:
    if dry_run:
        return True

    from app.models import Stock

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol, Stock.exchange == "NSE")
        .one_or_none()
    )

    company_name, sector = _lookup_issuer_meta(db, symbol)

    if not stock:
        stock = Stock(
            symbol=symbol, exchange="NSE", name=company_name, sector=sector,
            is_active=True, is_etf=False, currency="INR", country="India",
            data_source="nse_json_ingest",
            market_cap=0.0, average_market_cap_36m=0.0, debt=0.0,
            revenue=0.0, total_business_income=0.0, interest_income=0.0,
            non_permissible_income=0.0, accounts_receivable=0.0,
            cash_and_equivalents=0.0, short_term_investments=0.0,
            fixed_assets=0.0, total_assets=0.0, price=0.0,
        )
        db.add(stock)
        try:
            db.flush()
        except Exception:
            db.rollback()
            stock = db.query(Stock).filter(
                Stock.symbol == symbol, Stock.exchange == "NSE"
            ).one_or_none()
            if not stock:
                return False
    else:
        # Always patch name/sector from Issuer so stale symbol-as-name rows get corrected
        if company_name != symbol:
            stock.name = company_name
        if sector != "Unknown":
            stock.sector = sector

    for metric_code, stock_col in _METRIC_TO_STOCK.items():
        val = facts.get(metric_code)
        if val is not None and hasattr(stock, stock_col):
            # non_permissible_income has a ge=0 schema constraint — take abs
            if stock_col == "non_permissible_income":
                val = abs(val)
            setattr(stock, stock_col, val)

    if market_cap is not None:
        stock.market_cap = market_cap
    if avg_36m is not None:
        stock.average_market_cap_36m = avg_36m

    stock.fundamentals_updated_at = datetime.now(UTC)
    stock.data_source = "nse_json_ingest"
    db.add(stock)
    return True


def _compute_market_cap(
    db: Any, issuer_id: int, shares_outstanding: Optional[float]
) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """Compute market cap from price history × shares outstanding."""
    from app.models_v2 import ListingV2, MarketPriceDaily
    from datetime import timedelta

    if not shares_outstanding or shares_outstanding <= 0:
        return None, None, None

    listing = (
        db.query(ListingV2)
        .filter(
            ListingV2.issuer_id == issuer_id,
            ListingV2.exchange_code == "NSE",
            ListingV2.current_is_primary == True,  # noqa: E712
        )
        .first()
    )
    if not listing:
        return None, None, None

    today = date.today()
    cutoff_36m = today - timedelta(days=36 * 30)
    cutoff_24m = today - timedelta(days=24 * 30)

    prices = (
        db.query(MarketPriceDaily)
        .filter(
            MarketPriceDaily.listing_id == listing.id,
            MarketPriceDaily.trade_date >= cutoff_36m,
        )
        .order_by(MarketPriceDaily.trade_date.desc())
        .all()
    )
    if not prices:
        return None, None, None

    face_value = float(listing.face_value) if listing.face_value else 10.0
    if face_value <= 0:
        face_value = 10.0

    shares_count = (shares_outstanding * 1_00_00_000) / face_value
    latest_close = float(prices[0].close_price)
    market_cap_cr = (shares_count * latest_close) / 1_00_00_000

    closes = [float(p.close_price) for p in prices if p.close_price]
    prices_24m = [float(p.close_price) for p in prices
                  if p.close_price and p.trade_date >= cutoff_24m]
    avg_36m = (shares_count * (sum(closes) / len(closes))) / 1_00_00_000 if closes else None
    avg_24m = (shares_count * (sum(prices_24m) / len(prices_24m))) / 1_00_00_000 if prices_24m else avg_36m

    return market_cap_cr, avg_24m, avg_36m


# ---------------------------------------------------------------------------
# Main ingestion logic
# ---------------------------------------------------------------------------

def run(json_path: str, dry_run: bool = False, symbol_filter: Optional[str] = None) -> dict:
    from app.database import Base, SessionLocal, engine
    import app.models_v2  # noqa: F401
    import app.models_data_warehouse  # noqa: F401

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    with open(json_path, "r", encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)

    symbols = list(data.keys())
    if symbol_filter:
        symbols = [s for s in symbols if s.upper() == symbol_filter.upper()]
        if not symbols:
            logger.error("Symbol %s not found in file", symbol_filter)
            return {}

    logger.info("Processing %d symbols from %s (dry_run=%s)", len(symbols), json_path, dry_run)

    metrics = {
        "total": len(symbols),
        "ok": 0,
        "no_data": 0,
        "symbol_unknown": 0,
        "error": 0,
        "facts_written": 0,
        "facts_skipped": 0,
    }
    today = date.today()

    for symbol in symbols:
        payload = data[symbol]

        # Skip symbols that errored during browser fetch
        if isinstance(payload, dict) and "error" in payload and "resCmpData" not in payload:
            logger.debug("Skipping %s — error in fetch: %s", symbol, payload.get("error"))
            metrics["no_data"] += 1
            continue

        try:
            facts, period_end = _extract_rescmpdata_metrics(payload, "Annual", symbol)
        except Exception as exc:
            logger.warning("Failed to extract metrics for %s: %s", symbol, exc)
            metrics["error"] += 1
            continue

        if not facts:
            logger.debug("No metrics extracted for %s", symbol)
            metrics["no_data"] += 1
            continue

        # Resolve DB issuer
        try:
            data_issuer_id, _ = _resolve_or_create_data_issuer(db, symbol)
        except Exception as exc:
            logger.warning("DB lookup failed for %s: %s", symbol, exc)
            db.rollback()
            metrics["error"] += 1
            continue

        if data_issuer_id is None:
            logger.debug("Symbol %s not found in DB (not in universe yet)", symbol)
            metrics["symbol_unknown"] += 1
            continue

        eff_period_end = period_end or date(today.year - 1 if today.month < 4 else today.year, 3, 31)
        source_url = f"nse_json_ingest:{json_path}:{symbol}"

        try:
            written, skipped = _write_financial_facts(
                db, data_issuer_id, facts, eff_period_end, source_url, dry_run
            )
            metrics["facts_written"] += written
            metrics["facts_skipped"] += skipped

            # Resolve v2 issuer_id for snapshot + market cap
            from app.models_v2 import Issuer, ListingV2
            listing = (
                db.query(ListingV2)
                .filter(
                    ListingV2.symbol == symbol,
                    ListingV2.exchange_code == "NSE",
                    ListingV2.current_is_primary == True,  # noqa: E712
                )
                .first()
            )
            v2_issuer_id = listing.issuer_id if listing else None

            shares = facts.get(METRIC_SHARES_OUTSTANDING)
            market_cap, avg_24m, avg_36m = (
                _compute_market_cap(db, v2_issuer_id, shares)
                if v2_issuer_id else (None, None, None)
            )

            if v2_issuer_id:
                _upsert_snapshot(
                    db, v2_issuer_id, facts, market_cap, avg_24m, avg_36m,
                    eff_period_end, dry_run,
                )

            _write_back_to_stock(db, symbol, facts, market_cap, avg_36m, dry_run)

            if not dry_run:
                db.commit()

            metrics["ok"] += 1
            logger.info(
                "OK %s — wrote=%d skipped=%d mcap=%.1f Cr",
                symbol, written, skipped, market_cap or 0,
            )

        except Exception as exc:
            logger.warning("DB write failed for %s: %s", symbol, exc)
            db.rollback()
            metrics["error"] += 1

    db.close()

    logger.info(
        "Ingest complete: ok=%d no_data=%d unknown=%d error=%d "
        "facts_written=%d facts_skipped=%d",
        metrics["ok"], metrics["no_data"], metrics["symbol_unknown"], metrics["error"],
        metrics["facts_written"], metrics["facts_skipped"],
    )
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NSE resCmpData JSON into the DB")
    parser.add_argument("--file", required=True, help="Path to the JSON file")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
    parser.add_argument("--symbol", help="Only ingest a single symbol")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        logger.error("File not found: %s", args.file)
        sys.exit(1)

    result = run(args.file, dry_run=args.dry_run, symbol_filter=args.symbol)
    if not result:
        sys.exit(1)


if __name__ == "__main__":
    main()
