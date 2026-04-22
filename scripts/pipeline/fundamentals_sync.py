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

# Allow Render dashboard to force a re-run without code changes:
# Set PIPELINE_FORCE_RUN=1 in the service's Environment Variables,
# trigger a manual run, then remove it again.
_ENV_FORCE = os.getenv("PIPELINE_FORCE_RUN", "").lower() in {"1", "true", "yes"}


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
    db: Any,
    issuer_id: int,
    paid_up_capital_crores: Optional[float],
    face_value_override: Optional[float] = None,
) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Compute current market cap and 36m average from MarketPriceDaily.

    paid_up_capital_crores: paid-up equity capital in **INR Crores** (NSE `re_pdup` × lakhs→crores).
    face_value_override: ₹ face value per share from NSE facts when available (else ListingV2.face_value).
    Returns: (market_cap, avg_24m, avg_36m) all in INR Crores or None.
    """
    from app.models_v2 import ListingV2, MarketPriceDaily

    if not paid_up_capital_crores or paid_up_capital_crores <= 0:
        return None, None, None

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

    face_value = float(face_value_override) if face_value_override and face_value_override > 0 else (
        float(primary_listing.face_value) if primary_listing.face_value else 10.0
    )
    if face_value <= 0:
        face_value = 10.0

    # paid_up_capital_crores: INR Crores of paid-up capital → rupees = × 1e7; shares = rupees / face_value
    shares_count = (paid_up_capital_crores * 1_00_00_000) / face_value

    latest_close = float(prices[0].close_price)
    # Market cap in INR = shares × price; convert to Crores
    market_cap_inr_cr = (shares_count * latest_close) / 1_00_00_000

    closes = [float(p.close_price) for p in prices if p.close_price]
    if not closes:
        return market_cap_inr_cr, None, None

    # 24m and 36m averages: slice prices by cutoff dates
    prices_24m = [
        float(p.close_price) for p in prices
        if p.close_price and p.trade_date >= cutoff_24m
    ]
    avg_close_36m = sum(closes) / len(closes)
    avg_close_24m = sum(prices_24m) / len(prices_24m) if prices_24m else avg_close_36m

    avg_36m = (shares_count * avg_close_36m) / 1_00_00_000
    avg_24m = (shares_count * avg_close_24m) / 1_00_00_000

    logger.debug(
        "_compute_market_cap: symbol issuer_id=%d face_value=%.2f shares=%.0f "
        "latest_close=%.2f market_cap=%.2f Cr avg36m=%.2f Cr",
        issuer_id, face_value, shares_count, latest_close, market_cap_inr_cr, avg_36m,
    )
    return market_cap_inr_cr, avg_24m, avg_36m


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
        # Create a skeleton row so the /stocks API can serve this symbol.
        # universe_sync should have done this already, but guard here too.
        stock = Stock(
            symbol=symbol,
            exchange="NSE",
            name=symbol,
            sector="Unknown",
            is_active=True,
            is_etf=False,
            currency="INR",
            country="India",
            data_source="nse_xbrl",
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


_INR_TO_CRORES = 1_00_00_000  # 1 Crore = 10 million rupees

# When NSE results-comparision has P&L only, optionally pull balance-sheet lines from Yahoo once.
_BS_GAP_ENV = os.getenv("FUNDAMENTALS_YF_BS_SUPPLEMENT", "1").lower() not in {"0", "false", "no"}


def _listing_face_value_for_symbol(db: Any, symbol: str) -> float:
    """NSE face value (₹ per share) from ListingV2 when available."""
    from app.models import Stock
    from app.models_v2 import Issuer, ListingV2

    stock = db.query(Stock).filter(Stock.symbol == symbol, Stock.exchange == "NSE").one_or_none()
    if not stock or not (stock.isin or "").strip():
        return 10.0
    isin = (stock.isin or "").strip()[:12]
    listing = (
        db.query(ListingV2)
        .join(Issuer, ListingV2.issuer_id == Issuer.id)
        .filter(
            Issuer.canonical_isin == isin,
            ListingV2.exchange_code == "NSE",
            ListingV2.current_is_primary == True,  # noqa: E712
        )
        .first()
    )
    if listing and listing.face_value and float(listing.face_value) > 0:
        return float(listing.face_value)
    return 10.0


def _supplement_balance_sheet_from_yfinance(
    db: Any, symbol: str, facts: dict[str, float]
) -> dict[str, float]:
    """
    NSE Reg 33 comparison JSON often omits balance-sheet totals. Merge missing BS metrics
    from Yahoo (converted to INR Crores) without replacing NSE P&L fields.
    """
    if not _BS_GAP_ENV:
        return facts

    bs_keys = (
        "TOTAL_DEBT",
        "TOTAL_ASSETS",
        "ACCOUNTS_RECEIVABLE",
        "FIXED_ASSETS",
        "CASH_AND_EQUIVALENTS",
        "SHORT_TERM_INVESTMENTS",
    )
    if not any(k not in facts or facts.get(k) is None for k in bs_keys):
        return facts

    try:
        import yfinance as yf
    except ImportError:
        return facts

    try:
        ticker = yf.Ticker(f"{symbol.upper()}.NS")
        info = ticker.info or {}
    except Exception as exc:
        logger.debug("BS supplement: yfinance failed for %s: %s", symbol, exc)
        return facts

    if not info:
        return facts

    def _cr(val: Any) -> float | None:
        if val is None:
            return None
        try:
            f = float(val)
            if f != f:
                return None
            return round(f / _INR_TO_CRORES, 4)
        except (TypeError, ValueError):
            return None

    merged = {**facts}
    mapping = {
        "TOTAL_DEBT": _cr(info.get("totalDebt")),
        "TOTAL_ASSETS": _cr(info.get("totalAssets")),
        "ACCOUNTS_RECEIVABLE": _cr(info.get("accountsReceivable") or info.get("netReceivables")),
        "FIXED_ASSETS": _cr(info.get("propertyPlantEquipmentNet") or info.get("netPPE")),
        "CASH_AND_EQUIVALENTS": _cr(info.get("totalCash")),
        "SHORT_TERM_INVESTMENTS": _cr(info.get("shortTermInvestments")),
    }
    for k, v in mapping.items():
        if v is not None and (k not in merged or merged.get(k) is None):
            merged[k] = v
    if merged != facts:
        logger.info("fundamentals_sync: balance-sheet gap-fill from yfinance for %s", symbol)
    return merged


def _fallback_yfinance(symbol: str, db: Any) -> dict[str, float]:
    """
    Fallback: fetch yfinance data and write it both to DataFinancialFact (warehouse)
    AND directly to the legacy Stock table.

    yfinance returns monetary values in raw INR for .NS tickers.
    We convert to INR Crores (divide by 1e7) before storing so that all values
    are on the same scale as NSE XBRL data.

    Returns {metric_code: value_in_crores} for the snapshot pipeline, or {} on failure.
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.warning("yfinance not installed — skipping fallback for %s", symbol)
        return {}

    try:
        suffix = ".NS"
        ticker_sym = f"{symbol}{suffix}"
        ticker = yf.Ticker(ticker_sym)
        info = ticker.info or {}
    except Exception as exc:
        logger.warning("yfinance fetch failed for %s: %s", symbol, exc)
        return {}

    if not info or (info.get("marketCap") is None and info.get("totalRevenue") is None):
        logger.warning("yfinance: empty info for %s (Yahoo Finance may be blocking this IP)", symbol)
        return {}

    def _cr(val: Any) -> float | None:
        """Convert raw INR value to INR Crores."""
        if val is None:
            return None
        try:
            f = float(val)
            if f != f:  # NaN check
                return None
            return round(f / _INR_TO_CRORES, 4)
        except (TypeError, ValueError):
            return None

    def _raw(val: Any) -> float | None:
        """Return raw non-monetary value (shares count, ratios, etc.)."""
        if val is None:
            return None
        try:
            f = float(val)
            return f if f == f else None
        except (TypeError, ValueError):
            return None

    # Build a metric_code → value_in_crores dict for the canonical pipeline
    facts: dict[str, float] = {}

    revenue_cr = _cr(info.get("totalRevenue"))
    if revenue_cr:
        facts["REVENUE"] = revenue_cr
        facts["TOTAL_BUSINESS_INCOME"] = revenue_cr

    debt_cr = _cr(info.get("totalDebt"))
    if debt_cr:
        facts["TOTAL_DEBT"] = debt_cr

    cash_cr = _cr(info.get("totalCash"))
    if cash_cr:
        facts["CASH_AND_EQUIVALENTS"] = cash_cr

    sti_cr = _cr(info.get("shortTermInvestments"))
    if sti_cr:
        facts["SHORT_TERM_INVESTMENTS"] = sti_cr

    assets_cr = _cr(info.get("totalAssets"))
    if assets_cr:
        facts["TOTAL_ASSETS"] = assets_cr

    ar_cr = _cr(info.get("accountsReceivable") or info.get("netReceivables"))
    if ar_cr:
        facts["ACCOUNTS_RECEIVABLE"] = ar_cr

    ppe_cr = _cr(info.get("propertyPlantEquipmentNet") or info.get("netPPE"))
    if ppe_cr:
        facts["FIXED_ASSETS"] = ppe_cr

    ni_cr = _cr(info.get("netIncomeToCommon"))
    if ni_cr:
        facts["NET_INCOME"] = ni_cr

    ebitda_cr = _cr(info.get("ebitda"))
    if ebitda_cr:
        facts["EBITDA"] = ebitda_cr

    interest_income_cr = _cr(info.get("interestIncome"))
    if interest_income_cr:
        facts["INTEREST_INCOME"] = interest_income_cr

    shares = _raw(info.get("sharesOutstanding") or info.get("impliedSharesOutstanding"))
    if shares:
        fv = _listing_face_value_for_symbol(db, symbol)
        # Same convention as NSE: SHARES_OUTSTANDING = paid-up capital in INR Crores
        facts["SHARES_OUTSTANDING"] = round((shares * fv) / _INR_TO_CRORES, 4)
        facts["FACE_VALUE_RUPEES"] = round(fv, 4)

    mcap_cr = _cr(info.get("marketCap"))

    if not facts and mcap_cr is None:
        return {}

    # Also write directly to the legacy Stock table for immediate visibility
    from app.models import Stock
    stock = db.query(Stock).filter(Stock.symbol == symbol, Stock.exchange == "NSE").one_or_none()
    if stock:
        for metric_code, stock_col in _METRIC_TO_STOCK.items():
            val = facts.get(metric_code)
            if val is not None and hasattr(stock, stock_col):
                setattr(stock, stock_col, val)
        if mcap_cr is not None:
            stock.market_cap = mcap_cr
        stock.fundamentals_updated_at = datetime.now(UTC)
        stock.data_source = "yfinance_fallback"
        try:
            db.add(stock)
            db.flush()
        except Exception as exc:
            db.rollback()
            logger.debug("yfinance direct stock write failed for %s: %s", symbol, exc)

    # Also write to warehouse fact store for FundamentalsSnapshot
    try:
        from app.connectors.yfinance_fallback import write_yfinance_facts_for_symbol
        write_yfinance_facts_for_symbol(db, symbol, exchange="NSE")
    except Exception as exc:
        logger.debug("yfinance warehouse write failed for %s: %s", symbol, exc)

    logger.debug("yfinance fallback: %d metrics for %s (mcap=%.1f Cr)", len(facts), symbol, mcap_cr or 0)
    return facts


def run(
    symbol_filter: Optional[str] = None,
    dry_run: bool = False,
    period: str = "Annual",
    force: bool = False,
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
        if existing_run and existing_run.status == "succeeded" and not force:
            logger.info("fundamentals_sync: already ran today (%s) — use --force to re-run", ikey)
            return {**metrics, "skipped": True, "reason": "already_ran_today"}

        if existing_run and force:
            logger.info("fundamentals_sync: --force: resetting previous run (%s)", ikey)

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

        from app.connectors.nse_xbrl import sync_symbol_financials, NSESoftBlockError
        from app.connectors.nse_client import NSESession

        # Resolve issuer_id in data_warehouse (DataIssuer) for DataFinancialFact writes
        from app.models_data_warehouse import DataIssuer
        snapshot_date = date.today()

        import time as _time

        # Warm a single NSE session for the whole batch — this prevents NSE from
        # seeing 500 separate "new browser" connections and getting blocked.
        nse_session = NSESession(timeout=45.0)
        nse_warm_ok = nse_session.warm()
        if not nse_warm_ok:
            logger.warning(
                "fundamentals_sync: NSE session warm failed (403/network issue). "
                "NSE XBRL data will be unavailable; yfinance fallback will be used for all symbols."
            )

        # Set to True the first time NSE returns HTML instead of JSON (IP soft-blocked).
        # When set, we skip NSE for ALL remaining symbols to avoid 500 wasted calls.
        nse_soft_blocked = not nse_warm_ok

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

                # Step 1: Fetch NSE XBRL → DataFinancialFact (reuse persistent session)
                nse_ok = False
                if not dry_run and not nse_soft_blocked:
                    try:
                        xbrl_result = sync_symbol_financials(
                            db, symbol, data_issuer.id, period=period, session=nse_session
                        )
                        # Accept both fresh writes and idempotent skips (facts already exist)
                        nse_ok = xbrl_result.get("status") == "ok" and (
                            xbrl_result.get("facts_written", 0) > 0
                            or xbrl_result.get("facts_skipped", 0) > 0
                        )
                    except NSESoftBlockError as e:
                        # NSE returned HTML — IP is blocked. Skip NSE for all remaining symbols.
                        logger.warning(
                            "fundamentals_sync: NSE soft-block detected — switching to "
                            "yfinance-only mode for all remaining symbols. Detail: %s", e
                        )
                        nse_soft_blocked = True

                if nse_ok:
                    metrics["nse_xbrl_ok"] += 1
                    data_source = "nse_xbrl"
                else:
                    # Step 2: Fallback to yfinance
                    # Small delay to avoid Yahoo Finance rate-limiting across 500 symbols
                    _time.sleep(0.25)
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

                if data_source == "nse_xbrl":
                    facts = _supplement_balance_sheet_from_yfinance(db, symbol, facts)

                # Step 4: Compute market cap from bhavcopy
                paid_up_cr = facts.get("SHARES_OUTSTANDING")
                fv_fact = facts.get("FACE_VALUE_RUPEES")
                market_cap, avg_24m, avg_36m = _compute_market_cap(
                    db, issuer.id, paid_up_cr, face_value_override=fv_fact
                )

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

        nse_session.close()

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
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run even if today's job already completed (bypass idempotency check)",
    )
    args = parser.parse_args()
    result = run(
        symbol_filter=args.symbol,
        dry_run=args.dry_run,
        period=args.period,
        force=args.force or _ENV_FORCE,
    )
    logger.info("result=%s", result)
    if result.get("errors", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
