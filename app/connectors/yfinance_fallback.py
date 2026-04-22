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

Note: For NSE/BSE (INR), yfinance reports most **statement totals** in **full INR**.
We convert those to **INR Crores** (÷ 1e7) before storing, matching
`fundamentals_sync` / NSE XBRL. Per-share fields (EPS, bookValue per share)
and ratios (dividendYield) are stored as returned. MARKET_CAP_RAW is stored
in INR Crores for consistency.
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

# Yahoo statement line items for Indian listings are full INR; pipeline expects crores.
_INR_PER_CRORE = 10_000_000.0


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

    ccy = (info.get("currency") or stock.currency or "INR").upper()
    scale_inr_totals = exchange.upper() in {"NSE", "BSE"} and ccy == "INR"

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

    def _fact_inr_total(code: str, val: Any) -> None:
        """Statement total in full INR → INR Crores for NSE/BSE; else store raw."""
        num = _safe_float(val)
        if num is None:
            return
        if scale_inr_totals:
            _fact(code, round(num / _INR_PER_CRORE, 4), unit="INR_CRORE")
        else:
            _fact(code, num, unit="NATIVE")

    # --- Revenue / Income ---
    _fact_inr_total("REVENUE", info.get("totalRevenue"))
    _fact_inr_total("TOTAL_BUSINESS_INCOME", info.get("totalRevenue"))
    _fact_inr_total("GROSS_PROFIT", info.get("grossProfits"))
    _fact_inr_total("NET_INCOME", info.get("netIncomeToCommon"))
    _fact_inr_total("EBITDA", info.get("ebitda"))
    _fact_inr_total("OPERATING_INCOME", info.get("operatingIncome"))

    # Interest income proxy: financialInstitutions report interestIncome
    # For non-banks, use interestExpense as a proxy for interest sensitivity
    _fact_inr_total("INTEREST_INCOME", info.get("interestIncome"))
    _fact_inr_total("INTEREST_EXPENSE", info.get("interestExpense"))

    # Non-permissible income proxy: other income / non-operating (full INR → Cr)
    ni = info.get("nonInterestIncome")
    if ni is not None:
        _fact_inr_total("NON_OPERATING_INCOME", ni)
    else:
        rev = _safe_float(info.get("totalRevenue"))
        op_rev = _safe_float(info.get("operatingRevenue"))
        if rev is not None and op_rev is not None and rev > op_rev:
            _fact_inr_total("NON_OPERATING_INCOME", rev - op_rev)

    # --- Debt / Cash ---
    _fact_inr_total("TOTAL_DEBT", info.get("totalDebt"))
    net_debt = info.get("netDebt")
    if net_debt is not None:
        _fact_inr_total("NET_DEBT", net_debt)
    else:
        td = _safe_float(info.get("totalDebt"))
        if td is not None:
            tc = _safe_float(info.get("totalCash")) or 0.0
            _fact_inr_total("NET_DEBT", td - tc)
    _fact_inr_total("CASH_AND_EQUIVALENTS", info.get("totalCash"))
    _fact_inr_total("SHORT_TERM_INVESTMENTS", info.get("shortTermInvestments"))

    # --- Balance Sheet ---
    _fact_inr_total("TOTAL_ASSETS", info.get("totalAssets"))
    _fact_inr_total("CURRENT_ASSETS", info.get("currentAssets") or info.get("totalCurrentAssets"))
    _fact_inr_total("ACCOUNTS_RECEIVABLE", info.get("accountsReceivable") or info.get("netReceivables"))
    _fact_inr_total("INVENTORY", info.get("inventory"))
    _fact_inr_total("FIXED_ASSETS", info.get("propertyPlantEquipmentNet") or info.get("netPPE"))
    _fact_inr_total("TOTAL_LIABILITIES", info.get("totalLiab") or info.get("totalLiabilities"))
    _fact_inr_total("CURRENT_LIABILITIES", info.get("totalCurrentLiabilities"))
    # bookValue from yfinance is typically **per share** (₹), not company total — do not ÷ 1e7
    _fact("BOOK_VALUE", info.get("bookValue"), unit="INR_PER_SHARE" if scale_inr_totals else "NATIVE")

    # --- Per share / Market ---
    # Align with NSE pipeline: SHARES_OUTSTANDING = paid-up capital in INR Crores (not share count).
    sh = _safe_float(info.get("sharesOutstanding") or info.get("impliedSharesOutstanding"))
    fv_rupees = float(listing.face_value) if listing.face_value else 10.0
    if fv_rupees <= 0:
        fv_rupees = 10.0
    if sh and sh > 0:
        paid_up_cr = round((sh * fv_rupees) / _INR_PER_CRORE, 4)
        _fact("SHARES_OUTSTANDING", paid_up_cr, unit="INR_CRORE")
        _fact("FACE_VALUE_RUPEES", fv_rupees, unit="INR")
    mcap = _safe_float(info.get("marketCap"))
    if mcap is not None and scale_inr_totals:
        _fact("MARKET_CAP_RAW", round(mcap / _INR_PER_CRORE, 4), unit="INR_CRORE")
    elif mcap is not None:
        _fact("MARKET_CAP_RAW", mcap, unit="NATIVE")
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
