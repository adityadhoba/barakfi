"""
Optional yfinance → data_financial_facts (supplement; legacy `stocks` remains primary for UI).

Call from admin or backfill cron when official filings are missing.

Writes all available yfinance metrics needed for halal screening:
  - REVENUE / TOTAL_BUSINESS_INCOME  → income purity ratio denominator
  - INTEREST_INCOME                  → interest ratio numerator
  - NON_OPERATING_INCOME             → non-permissible income proxy
  - TOTAL_DEBT                       → debt ratio numerator
  - CASH_AND_EQUIVALENTS
  - SHORT_TERM_INVESTMENTS
  - ACCOUNTS_RECEIVABLE              → receivables ratio
  - TOTAL_ASSETS                     → ratio denominators
  - FIXED_ASSETS
  - NET_INCOME
  - SHARES_OUTSTANDING
  - MARKET_CAP_RAW

Note: Values from yf.Ticker.info are in the native currency reported by
yfinance (usually USD for ADRs, INR for .NS tickers). We store the raw
unit from yfinance and flag as source=YFINANCE.
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


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return f if f == f else None  # filter NaN
    except (TypeError, ValueError):
        return None


def write_yfinance_facts_for_symbol(db: Session, symbol: str, exchange: str = "NSE") -> dict[str, Any]:
    """
    Fetch yfinance data for *symbol* and write all available financial facts
    into the data warehouse tall-store (DataFinancialFact).

    Covers all metrics needed for halal screening:
      income ratios, debt ratios, receivables, assets, interest, etc.

    Returns a result dict with ok/error status.
    """
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
    ticker_sym = f"{sym_u}{suffix}" if suffix else sym_u

    try:
        ticker = yf.Ticker(ticker_sym)
        info = ticker.info or {}
    except Exception as exc:
        logger.warning("yfinance: failed to fetch info for %s: %s", ticker_sym, exc)
        return {"ok": False, "error": str(exc)}

    if not info or info.get("trailingPE") is None and info.get("marketCap") is None:
        # yfinance returned an empty/stub object — symbol not found
        logger.debug("yfinance: empty info for %s", ticker_sym)
        return {"ok": False, "error": "empty yfinance info"}

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

    facts_written = 0

    def _fact(code: str, val: Any, unit: str = "NATIVE") -> None:
        nonlocal facts_written
        num = _safe_float(val)
        if num is None:
            return
        db.add(
            DataFinancialFact(
                period_id=period.id,
                metric_code=code,
                value_numeric=num,
                unit=unit,
                source_name="YFINANCE",
                provenance_json={"source": "yfinance.Ticker.info", "ticker": ticker_sym},
            )
        )
        facts_written += 1

    # --- Revenue / Income ---
    _fact("REVENUE", info.get("totalRevenue"))
    _fact("TOTAL_BUSINESS_INCOME", info.get("totalRevenue"))
    _fact("GROSS_PROFIT", info.get("grossProfits"))
    _fact("NET_INCOME", info.get("netIncomeToCommon"))
    _fact("EBITDA", info.get("ebitda"))
    _fact("OPERATING_INCOME", info.get("operatingIncome"))

    # Interest income proxy: financialInstitutions report interestIncome
    # For non-banks, use interestExpense as a proxy for interest sensitivity
    _fact("INTEREST_INCOME", info.get("interestIncome"))
    _fact("INTEREST_EXPENSE", info.get("interestExpense"))

    # Non-permissible income proxy: other income / non-operating
    non_op = _safe_float(info.get("totalRevenue")) and (
        _safe_float(info.get("totalRevenue", 0)) - _safe_float(info.get("operatingRevenue") or info.get("totalRevenue", 0))
    )
    _fact("NON_OPERATING_INCOME", info.get("nonInterestIncome") or (non_op if non_op and non_op > 0 else None))

    # --- Debt / Cash ---
    _fact("TOTAL_DEBT", info.get("totalDebt"))
    _fact("NET_DEBT", info.get("netDebt") or (
        (_safe_float(info.get("totalDebt")) or 0) - (_safe_float(info.get("totalCash")) or 0)
        if info.get("totalDebt") is not None else None
    ))
    _fact("CASH_AND_EQUIVALENTS", info.get("totalCash"))
    _fact("SHORT_TERM_INVESTMENTS", info.get("shortTermInvestments"))

    # --- Balance Sheet ---
    _fact("TOTAL_ASSETS", info.get("totalAssets"))
    _fact("CURRENT_ASSETS", info.get("currentAssets") or info.get("totalCurrentAssets"))
    _fact("ACCOUNTS_RECEIVABLE", info.get("accountsReceivable") or info.get("netReceivables"))
    _fact("INVENTORY", info.get("inventory"))
    _fact("FIXED_ASSETS", info.get("propertyPlantEquipmentNet") or info.get("netPPE"))
    _fact("TOTAL_LIABILITIES", info.get("totalLiab") or info.get("totalLiabilities"))
    _fact("CURRENT_LIABILITIES", info.get("totalCurrentLiabilities"))
    _fact("BOOK_VALUE", info.get("bookValue"))

    # --- Per share / Market ---
    _fact("SHARES_OUTSTANDING", info.get("sharesOutstanding") or info.get("impliedSharesOutstanding"))
    _fact("MARKET_CAP_RAW", info.get("marketCap"))
    _fact("EPS_TTM", info.get("trailingEps"))
    _fact("DIVIDEND_YIELD", info.get("dividendYield"))

    db.commit()
    logger.debug(
        "yfinance: wrote %d facts for %s (period_id=%s)",
        facts_written, ticker_sym, period.id,
    )
    return {
        "ok": True,
        "facts_written": facts_written,
        "listing_id": listing.id,
        "period_id": period.id,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }
