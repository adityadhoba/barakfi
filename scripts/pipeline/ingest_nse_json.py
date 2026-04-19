"""
One-time ingestion script: load NSE resCmpData JSON → DB.

Usage:
    PYTHONPATH=. python3 scripts/pipeline/ingest_nse_json.py \
        --file /path/to/nse_fundamentals_all.json

The JSON must be the output of the browser console script that fetches
/api/results-comparision for each symbol:
    { "RELIANCE": { "resCmpData": [...], "bankNonBnking": "N" }, ... }

Writes to:
  - DataFinancialFact   (warehouse fact store)
  - FundamentalsSnapshot (v2 pipeline)
  - Stock               (legacy table for API compatibility)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date, datetime, timezone
from typing import Any

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
# Metric extraction (mirrors nse_xbrl._extract_rescmpdata_metrics)
# ---------------------------------------------------------------------------

_LAKHS_TO_CRORES = 0.01

_RE_FIELD_MAP = {
    "re_net_sale":    "REVENUE",
    "re_total_inc":   "TOTAL_BUSINESS_INCOME",
    "re_net_profit":  "NET_INCOME",
    "re_oth_inc_new": "NON_OPERATING_INCOME",
    "re_int_new":     "INTEREST_INCOME",
}


def _to_f(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        return f if f == f else None
    s = str(v).replace(",", "").strip()
    if not s or s in ("-", "null", "None", "N/A"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _pick_record(records: list[dict], prefer_annual: bool = True) -> dict | None:
    if not records:
        return None
    if prefer_annual:
        for rec in records:
            if str(rec.get("re_res_type", "")).upper() == "A":
                return rec
    return records[0]


def extract_metrics(payload: dict, symbol: str) -> tuple[dict[str, float], date | None]:
    """Return (metrics_in_crores, period_end_date)."""
    res_list = payload.get("resCmpData")
    if not isinstance(res_list, list) or not res_list:
        return {}, None

    rec = _pick_record(res_list, prefer_annual=True)
    if not rec:
        return {}, None

    metrics: dict[str, float] = {}

    for field, code in _RE_FIELD_MAP.items():
        val = _to_f(rec.get(field))
        if val is not None:
            metrics[code] = round(val * _LAKHS_TO_CRORES, 4)

    # EBITDA = PAT + Tax + Interest + Depreciation
    parts = [_to_f(rec.get(k)) for k in ("re_net_profit", "re_tax", "re_int_new", "re_depr_und_exp")]
    valid = [x for x in parts if x is not None]
    if len(valid) >= 2:
        metrics["EBITDA"] = round(sum(valid) * _LAKHS_TO_CRORES, 4)

    # Shares outstanding: pdup (Lakhs INR) / face_val (INR) * 100,000
    pdup = _to_f(rec.get("re_pdup"))
    face_val = _to_f(rec.get("re_face_val")) or 10.0
    if pdup and pdup > 0 and face_val > 0:
        metrics["SHARES_OUTSTANDING"] = round((pdup * 100_000) / face_val, 0)

    # Period end date
    period_end: date | None = None
    try:
        period_end = datetime.strptime(rec.get("re_to_dt", ""), "%d-%b-%Y").date()
    except (ValueError, AttributeError):
        pass

    return metrics, period_end


# ---------------------------------------------------------------------------
# DB write helpers (mirrors fundamentals_sync logic)
# ---------------------------------------------------------------------------

_METRIC_TO_SNAPSHOT = {
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

_METRIC_TO_STOCK = {
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


def _write_fact_store(db: Any, data_issuer_id: int, metrics: dict, period_end: date, symbol: str) -> int:
    """Write metrics to DataFinancialFact. Returns facts_written count."""
    from app.models_data_warehouse import DataFiling, DataFinancialFact, DataFinancialPeriod

    period_type = "ANNUAL"
    statement_scope = "CONSOLIDATED"
    source_name = "nse_json_ingest"

    filing = (
        db.query(DataFiling)
        .filter(
            DataFiling.issuer_id == data_issuer_id,
            DataFiling.filing_type == "financial_results",
            DataFiling.period_end_date == period_end,
            DataFiling.period_type == period_type,
        )
        .one_or_none()
    )
    if not filing:
        filing = DataFiling(
            issuer_id=data_issuer_id,
            filing_type="financial_results",
            filing_subtype="nse_annual",
            exchange_code="NSE",
            period_type=period_type,
            period_end_date=period_end,
            source_ref=f"nse_json:{symbol}",
            content_sha256="nse_json_ingest",
        )
        db.add(filing)
        db.flush()

    fin_period = (
        db.query(DataFinancialPeriod)
        .filter(
            DataFinancialPeriod.issuer_id == data_issuer_id,
            DataFinancialPeriod.period_end_date == period_end,
            DataFinancialPeriod.period_type == period_type,
            DataFinancialPeriod.statement_scope == statement_scope,
        )
        .one_or_none()
    )
    if not fin_period:
        fin_period = DataFinancialPeriod(
            issuer_id=data_issuer_id,
            filing_id=filing.id,
            statement_scope=statement_scope,
            period_type=period_type,
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
    for code, value in metrics.items():
        if code in existing_codes:
            continue
        db.add(DataFinancialFact(
            period_id=fin_period.id,
            metric_code=code,
            value_numeric=value,
            unit="INR_CRORE" if code != "SHARES_OUTSTANDING" else "SHARES",
            source_name=source_name,
            confidence=0.90,
            provenance_json={"source": "nse_browser_fetch", "symbol": symbol},
        ))
        written += 1

    return written


def _upsert_snapshot(db: Any, issuer_id: int, metrics: dict, period_end: date, symbol: str) -> None:
    from app.models_v2 import FundamentalsSnapshot

    snap_kwargs: dict[str, Any] = {
        "issuer_id": issuer_id,
        "snapshot_date": period_end,
        "basis": "quarterly_reported",
        "currency_code": "INR",
        "data_source": "nse_json_ingest",
        "source_refs_json": [{"source": "nse_browser_fetch", "symbol": symbol}],
        "segment_revenue_json": [],
        "stale_after": datetime(period_end.year + 1, period_end.month,
                                min(period_end.day, 28), tzinfo=UTC),
    }
    for metric_code, snap_col in _METRIC_TO_SNAPSHOT.items():
        val = metrics.get(metric_code)
        if val is not None:
            snap_kwargs[snap_col] = val

    critical = ["revenue", "total_business_income", "interest_income", "non_operating_income"]
    filled = sum(1 for col in critical if snap_kwargs.get(col) is not None)
    snap_kwargs["completeness_score"] = round((filled / len(critical)) * 100, 2)

    existing = (
        db.query(FundamentalsSnapshot)
        .filter(
            FundamentalsSnapshot.issuer_id == issuer_id,
            FundamentalsSnapshot.snapshot_date == period_end,
        )
        .one_or_none()
    )
    if existing:
        for k, v in snap_kwargs.items():
            setattr(existing, k, v)
        db.add(existing)
    else:
        db.add(FundamentalsSnapshot(**snap_kwargs))
    db.flush()


def _update_stock(db: Any, symbol: str, metrics: dict) -> bool:
    from app.models import Stock
    stock = db.query(Stock).filter(Stock.symbol == symbol, Stock.exchange == "NSE").one_or_none()
    if not stock:
        return False
    updated = False
    for code, col in _METRIC_TO_STOCK.items():
        val = metrics.get(code)
        if val is not None and hasattr(stock, col):
            setattr(stock, col, val)
            updated = True
    if updated:
        stock.fundamentals_updated_at = datetime.now(UTC)
        stock.data_source = "nse_json_ingest"
        db.add(stock)
    return updated


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(json_path: str, dry_run: bool = False, symbol_filter: str | None = None) -> dict:
    from app.database import Base, SessionLocal, engine
    import app.models_v2          # noqa: F401
    import app.models_data_warehouse  # noqa: F401
    import app.models             # noqa: F401
    Base.metadata.create_all(bind=engine)

    from app.models_v2 import Issuer, ListingV2
    from app.models_data_warehouse import DataIssuer

    with open(json_path) as f:
        raw = json.load(f)

    metrics_summary = {
        "symbols_attempted": 0,
        "symbols_ok": 0,
        "symbols_empty": 0,
        "symbols_not_in_db": 0,
        "facts_written": 0,
        "snapshots_written": 0,
        "stocks_updated": 0,
        "errors": 0,
        "dry_run": dry_run,
    }

    db = SessionLocal()
    try:
        for symbol, payload in raw.items():
            if symbol_filter and symbol.upper() != symbol_filter.upper():
                continue
            if not isinstance(payload, dict) or not payload.get("resCmpData"):
                metrics_summary["symbols_empty"] += 1
                continue

            metrics_summary["symbols_attempted"] += 1

            try:
                metrics, period_end = extract_metrics(payload, symbol)
                if not metrics:
                    logger.warning("No metrics extracted for %s", symbol)
                    metrics_summary["symbols_empty"] += 1
                    continue

                if period_end is None:
                    period_end = date.today()

                logger.info(
                    "%s: %d metrics, period=%s — %s",
                    symbol, len(metrics), period_end,
                    {k: round(v, 1) for k, v in metrics.items()},
                )

                if dry_run:
                    metrics_summary["symbols_ok"] += 1
                    continue

                # Look up issuer in v2 model
                listing = (
                    db.query(ListingV2)
                    .filter(ListingV2.symbol == symbol, ListingV2.exchange_code == "NSE")
                    .first()
                )
                if not listing:
                    logger.warning("Symbol %s not found in listings_v2 — skipping", symbol)
                    metrics_summary["symbols_not_in_db"] += 1
                    continue

                issuer = db.query(Issuer).filter(Issuer.id == listing.issuer_id).first()
                if not issuer:
                    metrics_summary["symbols_not_in_db"] += 1
                    continue

                # Resolve or create DataIssuer
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

                # Write to fact store
                written = _write_fact_store(db, data_issuer.id, metrics, period_end, symbol)
                metrics_summary["facts_written"] += written

                # Upsert snapshot
                _upsert_snapshot(db, issuer.id, metrics, period_end, symbol)
                metrics_summary["snapshots_written"] += 1

                # Update legacy Stock table
                if _update_stock(db, symbol, metrics):
                    metrics_summary["stocks_updated"] += 1

                db.commit()
                metrics_summary["symbols_ok"] += 1

            except Exception as exc:
                logger.exception("Error processing %s: %s", symbol, exc)
                db.rollback()
                metrics_summary["errors"] += 1

    finally:
        db.close()

    logger.info("Ingest complete: %s", metrics_summary)
    return metrics_summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NSE resCmpData JSON into DB")
    parser.add_argument("--file", required=True, help="Path to nse_fundamentals_all.json")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not write to DB")
    parser.add_argument("--symbol", help="Process only this symbol (for testing)")
    args = parser.parse_args()

    result = run(json_path=args.file, dry_run=args.dry_run, symbol_filter=args.symbol)
    logger.info("Result: %s", result)
    sys.exit(0 if result.get("errors", 0) == 0 else 1)


if __name__ == "__main__":
    main()
