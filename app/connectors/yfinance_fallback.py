"""
Optional yfinance → data_financial_facts (supplement; legacy `stocks` remains primary for UI).

Call from admin or backfill cron when official filings are missing.
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

try:
    import yfinance as yf
except ImportError:
    yf = None  # type: ignore[assignment]

from app.models import Stock
from app.models_data_warehouse import DataFinancialFact, DataFinancialPeriod, DataIssuer, DataListing, DataSecurity

logger = logging.getLogger("barakfi.yfinance_wh")


def _ensure_warehouse_rows_for_stock(db: Session, stock: Stock) -> DataListing | None:
    """Create minimal issuer/security/listing from legacy Stock row when ISIN present."""
    isin = (stock.isin or "").strip()[:12]
    if len(isin) < 12:
        logger.warning("yfinance warehouse skip %s: missing ISIN", stock.symbol)
        return None

    issuer = db.query(DataIssuer).filter(DataIssuer.canonical_isin == isin).one_or_none()
    if not issuer:
        issuer = DataIssuer(
            canonical_isin=isin,
            legal_name=stock.name,
            display_name=stock.name,
            coverage_universe="legacy_import",
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
            currency_code=stock.currency or "INR",
            active=True,
        )
        db.add(sec)
        db.flush()

    listing = (
        db.query(DataListing)
        .filter(
            DataListing.security_id == sec.id,
            DataListing.exchange_code == stock.exchange.upper(),
            DataListing.native_symbol == stock.symbol.upper(),
        )
        .one_or_none()
    )
    if not listing:
        listing = DataListing(
            security_id=sec.id,
            exchange_code=stock.exchange.upper()[:8],
            native_symbol=stock.symbol.upper(),
            series_code="EQ",
            is_primary=True,
        )
        db.add(listing)
        db.flush()
    return listing


def write_yfinance_facts_for_symbol(db: Session, symbol: str, exchange: str = "NSE") -> dict[str, Any]:
    """Fetch yfinance `info` and append tall facts under a synthetic TTM period."""
    if yf is None:
        raise RuntimeError("yfinance not installed")
    if os.getenv("YFINANCE_WAREHOUSE_DISABLED", "").lower() in {"1", "true", "yes"}:
        return {"ok": False, "skipped": True, "reason": "disabled"}

    sym_u = symbol.upper().strip()
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == sym_u, Stock.exchange == exchange.upper())
        .one_or_none()
    )
    if not stock:
        return {"ok": False, "error": "stock not in legacy universe"}

    listing = _ensure_warehouse_rows_for_stock(db, stock)
    if not listing:
        return {"ok": False, "error": "could not create listing"}

    sec_row = db.query(DataSecurity).filter(DataSecurity.id == listing.security_id).one()
    issuer_id = sec_row.issuer_id

    suffix = ".NS" if exchange.upper() == "NSE" else ".BO" if exchange.upper() == "BSE" else ""
    ticker = yf.Ticker(f"{sym_u}{suffix}" if suffix else sym_u)
    info = ticker.info or {}

    period = DataFinancialPeriod(
        issuer_id=issuer_id,
        filing_id=None,
        statement_scope="VENDOR_SUMMARY",
        period_type="TTM_VENDOR",
        period_end_date=date.today(),
        currency_code=info.get("currency") or stock.currency or "INR",
    )
    db.add(period)
    db.flush()

    def _fact(code: str, val: Any) -> None:
        if val is None:
            return
        try:
            num = float(val)
        except (TypeError, ValueError):
            return
        db.add(
            DataFinancialFact(
                period_id=period.id,
                metric_code=code,
                value_numeric=num,
                unit="INR" if stock.exchange == "NSE" else "NATIVE",
                source_name="YFINANCE",
                provenance_json={"source": "yfinance.Ticker.info"},
            )
        )

    _fact("TOTAL_DEBT", info.get("totalDebt"))
    _fact("CASH_AND_EQUIVALENTS", info.get("totalCash"))
    _fact("MARKET_CAP_RAW", info.get("marketCap"))

    db.commit()
    return {"ok": True, "listing_id": listing.id, "period_id": period.id, "as_of": datetime.now(timezone.utc).isoformat()}
