"""
NSE Financial Results connector — official primary source for fundamentals.

Fetches structured quarterly/annual financial data from NSE's financial-results
API for each active NSE-listed symbol, maps metrics to canonical codes, and
writes DataFinancialFact rows into the tall-store warehouse.

Data source: NSE public financial results JSON API (Regulation 33 filings)
Unit: All monetary values stored in INR Crores (NSE native unit); unit="INR_CRORE"
Freshness: Quarterly — NSE publishes within 45 days of quarter-end (Reg 33)

Metric code → FundamentalsSnapshot column mapping:
  TOTAL_DEBT            → total_debt
  CASH_AND_EQUIVALENTS  → cash_and_equivalents
  SHORT_TERM_INVESTMENTS→ short_term_investments
  REVENUE               → revenue
  TOTAL_BUSINESS_INCOME → total_business_income
  INTEREST_INCOME       → interest_income
  NON_OPERATING_INCOME  → non_operating_income (halal non-permissible proxy)
  ACCOUNTS_RECEIVABLE   → accounts_receivable
  TOTAL_ASSETS          → total_assets
  FIXED_ASSETS          → fixed_assets
  NET_INCOME            → net_income
  EBITDA                → ebitda
  SHARES_OUTSTANDING    → shares_outstanding (units: number of shares)
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.connectors.ingestion_utils import (
    finish_ingestion_run,
    record_raw_artifact,
    sha256_bytes,
    start_ingestion_run,
)
from app.connectors.nse_client import NSEClient

logger = logging.getLogger("barakfi.nse_xbrl")

IST = ZoneInfo("Asia/Kolkata")

# ---------------------------------------------------------------------------
# Canonical metric codes used in DataFinancialFact.metric_code
# ---------------------------------------------------------------------------
METRIC_TOTAL_DEBT = "TOTAL_DEBT"
METRIC_CASH = "CASH_AND_EQUIVALENTS"
METRIC_ST_INVESTMENTS = "SHORT_TERM_INVESTMENTS"
METRIC_REVENUE = "REVENUE"
METRIC_TOTAL_BUSINESS_INCOME = "TOTAL_BUSINESS_INCOME"
METRIC_INTEREST_INCOME = "INTEREST_INCOME"
METRIC_NON_OPERATING_INCOME = "NON_OPERATING_INCOME"
METRIC_ACCOUNTS_RECEIVABLE = "ACCOUNTS_RECEIVABLE"
METRIC_TOTAL_ASSETS = "TOTAL_ASSETS"
METRIC_FIXED_ASSETS = "FIXED_ASSETS"
METRIC_NET_INCOME = "NET_INCOME"
METRIC_EBITDA = "EBITDA"
METRIC_SHARES_OUTSTANDING = "SHARES_OUTSTANDING"

# ---------------------------------------------------------------------------
# NSE API endpoints
# ---------------------------------------------------------------------------
#
# History:
#   Old endpoint (DEPRECATED, returns 404 as of 2025):
#     /api/financial-results?index=equities&period={period}&symbol={symbol}
#
#   Current endpoints (live as of 2026):
#     Per-symbol results comparison:
#       /api/results-comparision?symbol={symbol}
#     Bulk all-company results for a period:
#       /api/corporates-financial-results?index=equities&period={period}
#
# We try the per-symbol endpoint first, then fall back to extracting the
# symbol from the bulk endpoint response.
#
_NSE_RESULTS_COMPARISON = (
    "https://www.nseindia.com/api/results-comparision?symbol={symbol}"
)
_NSE_CORPORATES_RESULTS = (
    "https://www.nseindia.com/api/corporates-financial-results"
    "?index=equities&period={period}"
)
# Keep old URL for reference / legacy retry
_NSE_FIN_RESULTS_LEGACY = (
    "https://www.nseindia.com/api/financial-results"
    "?index=equities&period={period}&symbol={symbol}"
)

# Row-name fragments that map to each canonical metric code.
# NSE's JSON uses display-name keys; we match by substring (case-insensitive).
# Multiple fragments listed in priority order — first match wins.
_NSE_ROW_MAP: dict[str, list[str]] = {
    METRIC_TOTAL_DEBT: [
        "total borrowings",
        "total debt",
        "borrowings",
        "long-term borrowing",
        "short-term borrowing",
    ],
    METRIC_CASH: [
        "cash and cash equivalents",
        "cash & cash equivalents",
        "cash and bank balance",
    ],
    METRIC_ST_INVESTMENTS: [
        "current investments",
        "short-term investments",
        "liquid investments",
    ],
    METRIC_REVENUE: [
        "revenue from operations",
        "net revenue from operations",
        "total revenue from operations",
        "income from operations",
    ],
    METRIC_TOTAL_BUSINESS_INCOME: [
        "total income",
        "total revenue",
        "income from operations",
    ],
    METRIC_INTEREST_INCOME: [
        "interest income",
        "finance income",
        "income on deposits",
        "interest on fixed deposit",
    ],
    METRIC_NON_OPERATING_INCOME: [
        "other income",
        "other operating income",
        "exceptional items",
        "non-operating income",
    ],
    METRIC_ACCOUNTS_RECEIVABLE: [
        "trade receivables",
        "sundry debtors",
        "accounts receivable",
        "debtors",
    ],
    METRIC_TOTAL_ASSETS: [
        "total assets",
        "balance sheet total",
    ],
    METRIC_FIXED_ASSETS: [
        "property, plant and equipment",
        "tangible assets",
        "fixed assets",
        "net block",
    ],
    METRIC_NET_INCOME: [
        "profit after tax",
        "net profit",
        "profit for the period",
        "net income",
    ],
    METRIC_EBITDA: [
        "ebitda",
        "operating profit",
    ],
    METRIC_SHARES_OUTSTANDING: [
        "paid-up equity share capital",
        "equity share capital",
        "shares outstanding",
    ],
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _match_metric(row_name: str) -> str | None:
    """Return canonical metric code if row_name matches any known fragment."""
    lower = row_name.lower().strip()
    for code, fragments in _NSE_ROW_MAP.items():
        for frag in fragments:
            if frag in lower:
                return code
    return None


def _extract_latest_value(row: dict[str, Any]) -> float | None:
    """
    Extract the most-recent numeric value from an NSE financial-results row.

    NSE returns rows with period columns named like "Mar 2024", "Jun 2024", etc.
    We take the first (most-recent) numeric value we find when iterating.
    The row might also have a 'currentValue' or 'value' key in some API shapes.
    """
    for key in ("currentValue", "value", "latestValue"):
        v = row.get(key)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass

    # Fall back to the first non-label, non-None numeric column
    skip = {"name", "title", "description", "type", "unit", "rowName"}
    for key, val in row.items():
        if key in skip:
            continue
        if val is None or val == "":
            continue
        try:
            num = float(str(val).replace(",", ""))
            # Reject zero-ish sentinel values but allow actual zeros
            if num != 0 or key.lower().startswith(("mar", "jun", "sep", "dec", "fy", "20")):
                return num
        except (TypeError, ValueError):
            continue
    return None


def _parse_period_end(row_data: dict[str, Any] | None, period: str) -> date:
    """Best-effort: derive a period_end date from API context."""
    today = datetime.now(IST).date()
    if period == "Annual":
        return date(today.year - 1 if today.month < 4 else today.year, 3, 31)
    # Quarterly — use most recent quarter end
    q = (today.month - 1) // 3
    quarter_ends = [date(today.year, 3, 31), date(today.year, 6, 30),
                    date(today.year, 9, 30), date(today.year, 12, 31)]
    return quarter_ends[max(q - 1, 0)]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _fetch_url(
    url: str,
    session: "Any | None",
) -> tuple[int, bytes]:
    """Fetch a URL using the provided NSESession or a fresh NSEClient."""
    try:
        if session is not None:
            code, content, _ = session.get(url)
        else:
            client = NSEClient(timeout=45.0)
            code, content, _ = client.fetch_bytes(url)
        return code, content
    except Exception as exc:
        logger.debug("nse_xbrl _fetch_url %s: %s", url, exc)
        return 0, b""


def _parse_rows_from_payload(payload: Any, symbol: str) -> list[dict[str, Any]]:
    """
    Extract a list of financial-result row dicts from any known NSE API response shape.

    NSE has returned at least three shapes across API versions:
      1. Old /api/financial-results → {"data": [{rowName, ...}, ...]}
      2. /api/results-comparision  → {"financialResultsComparisons": [...]} or nested
      3. /api/corporates-financial-results → list of company dicts, each with "data" or "financial"
    """
    sym_upper = symbol.upper()

    if isinstance(payload, list):
        # Bulk endpoint: each item is one company; filter to our symbol
        for item in payload:
            if not isinstance(item, dict):
                continue
            item_sym = (
                item.get("symbol") or item.get("ticker") or item.get("companySymbol") or ""
            ).upper()
            if item_sym == sym_upper:
                for key in ("data", "financial", "financials", "results"):
                    candidate = item.get(key)
                    if isinstance(candidate, list) and candidate:
                        return candidate
                # Sometimes the company dict itself contains the row list directly
                if any(isinstance(v, list) and v and isinstance(v[0], dict) for v in item.values()):
                    for v in item.values():
                        if isinstance(v, list) and v and isinstance(v[0], dict):
                            return v
        return []

    if isinstance(payload, dict):
        # Try all known wrapper keys
        for key in (
            "data",
            "results",
            "financials",
            "items",
            "financialResultsComparisons",
            "comparisons",
            "quarterly",
            "annual",
        ):
            candidate = payload.get(key)
            if isinstance(candidate, list) and candidate:
                # If items are company dicts, filter to our symbol
                first = candidate[0] if candidate else {}
                if isinstance(first, dict) and (
                    "symbol" in first or "ticker" in first or "companySymbol" in first
                ):
                    return _parse_rows_from_payload(candidate, symbol)
                return candidate

    return []


def fetch_nse_financials(
    symbol: str,
    period: str = "Annual",
    session: "Any | None" = None,
) -> tuple[dict[str, float], str, int]:
    """
    Fetch NSE financial data for *symbol* using the current live endpoints.

    Strategy (tries in order):
      1. /api/results-comparision?symbol={symbol}  — per-symbol comparison (live)
      2. /api/corporates-financial-results?index=equities&period={period}  — bulk (live)
      3. /api/financial-results?...  — legacy (deprecated 2025, usually 404)

    Args:
        symbol: NSE ticker symbol (e.g. "RELIANCE")
        period: "Annual" or "Quarterly"
        session: Optional NSESession for cookie reuse across batch runs.

    Returns:
        (metrics_dict, source_url, http_status)
        metrics_dict: {METRIC_CODE: value_in_crores}  — empty on failure.
    """
    sym = symbol.upper()
    candidates = [
        _NSE_RESULTS_COMPARISON.format(symbol=sym),
        _NSE_CORPORATES_RESULTS.format(period=period),
        _NSE_FIN_RESULTS_LEGACY.format(period=period, symbol=sym),
    ]

    for url in candidates:
        code, content = _fetch_url(url, session)
        if code != 200 or not content:
            logger.debug("nse_xbrl: HTTP %s for %s → %s", code, sym, url)
            continue

        try:
            payload = json.loads(content.decode("utf-8", errors="replace"))
        except json.JSONDecodeError:
            continue

        rows = _parse_rows_from_payload(payload, sym)
        if not rows:
            logger.debug("nse_xbrl: no rows extracted for %s from %s", sym, url)
            continue

        metrics: dict[str, float] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            row_name = (
                row.get("name")
                or row.get("rowName")
                or row.get("title")
                or row.get("description")
                or ""
            )
            code_key = _match_metric(str(row_name))
            if code_key and code_key not in metrics:
                val = _extract_latest_value(row)
                if val is not None:
                    metrics[code_key] = val

        if metrics:
            logger.debug("nse_xbrl: %d metrics for %s from %s", len(metrics), sym, url)
            return metrics, url, code

    # All endpoints failed or returned no parseable metrics
    return {}, candidates[0], 0


def sync_symbol_financials(
    db: Session,
    symbol: str,
    issuer_id: int,
    *,
    period: str = "Annual",
    idempotency_key: str | None = None,
    session: "Any | None" = None,
) -> dict[str, Any]:
    """
    Fetch NSE financials for *symbol*, write DataFinancialFact rows.

    Idempotent: facts from the same source_url + content hash are deduplicated.
    Returns a metrics summary dict.
    """
    from app.models_data_warehouse import (
        DataFiling,
        DataFinancialFact,
        DataFinancialPeriod,
        DataIngestionRun,
    )

    day = datetime.now(IST).strftime("%Y-%m-%d")
    ikey = idempotency_key or f"nse_xbrl:{symbol}:{period}:{day}"

    metrics_out: dict[str, Any] = {
        "symbol": symbol,
        "period": period,
        "facts_written": 0,
        "facts_skipped": 0,
        "source": "nse_xbrl",
    }

    extracted, source_url, http_status = fetch_nse_financials(symbol, period, session=session)

    if not extracted:
        metrics_out["status"] = "empty_or_error"
        metrics_out["http_status"] = http_status
        return metrics_out

    # Archive raw content as a DataFiling reference
    content_bytes = json.dumps(extracted).encode()
    content_hash = sha256_bytes(content_bytes)

    # Resolve or create DataFiling row for provenance
    period_end = _parse_period_end(None, period)
    period_type = "ANNUAL" if period == "Annual" else "QUARTERLY"
    statement_scope = "CONSOLIDATED"

    filing = (
        db.query(DataFiling)
        .filter(
            DataFiling.issuer_id == issuer_id,
            DataFiling.filing_type == "financial_results",
            DataFiling.period_end_date == period_end,
            DataFiling.period_type == period_type,
        )
        .one_or_none()
    )
    if not filing:
        filing = DataFiling(
            issuer_id=issuer_id,
            filing_type="financial_results",
            filing_subtype=f"nse_{period.lower()}",
            exchange_code="NSE",
            period_type=period_type,
            period_end_date=period_end,
            document_url=source_url,
            source_ref=f"nse_xbrl:{symbol}:{period}",
            content_sha256=content_hash,
        )
        db.add(filing)
        db.flush()

    # Resolve or create DataFinancialPeriod
    fin_period = (
        db.query(DataFinancialPeriod)
        .filter(
            DataFinancialPeriod.issuer_id == issuer_id,
            DataFinancialPeriod.period_end_date == period_end,
            DataFinancialPeriod.period_type == period_type,
            DataFinancialPeriod.statement_scope == statement_scope,
        )
        .one_or_none()
    )
    if not fin_period:
        fin_period = DataFinancialPeriod(
            issuer_id=issuer_id,
            filing_id=filing.id,
            statement_scope=statement_scope,
            period_type=period_type,
            period_end_date=period_end,
            currency_code="INR",
        )
        db.add(fin_period)
        db.flush()

    # Write or skip individual facts
    existing_codes = {
        row.metric_code
        for row in db.query(DataFinancialFact.metric_code).filter(
            DataFinancialFact.period_id == fin_period.id
        )
    }

    for metric_code, value in extracted.items():
        if metric_code in existing_codes:
            metrics_out["facts_skipped"] += 1
            continue
        fact = DataFinancialFact(
            period_id=fin_period.id,
            metric_code=metric_code,
            value_numeric=value,
            unit="INR_CRORE",
            source_name="nse_xbrl",
            confidence=0.85,
            provenance_json={
                "source_url": source_url,
                "content_hash": content_hash,
                "fetched_at": datetime.now(IST).isoformat(),
                "period": period,
                "http_status": http_status,
            },
        )
        db.add(fact)
        metrics_out["facts_written"] += 1

    db.commit()
    metrics_out["status"] = "ok"
    metrics_out["http_status"] = http_status
    return metrics_out


def sync_all_symbols(
    db: Session,
    symbols_issuers: list[tuple[str, int]],
    period: str = "Annual",
) -> dict[str, Any]:
    """
    Sync NSE financial results for a list of (symbol, issuer_id) pairs.

    Called from scripts/pipeline/fundamentals_sync.py.
    Returns aggregate metrics.
    """
    agg: dict[str, Any] = {
        "total": len(symbols_issuers),
        "ok": 0,
        "empty": 0,
        "error": 0,
        "facts_written": 0,
    }
    for symbol, issuer_id in symbols_issuers:
        try:
            result = sync_symbol_financials(db, symbol, issuer_id, period=period)
            if result.get("status") == "ok":
                agg["ok"] += 1
                agg["facts_written"] += result.get("facts_written", 0)
            else:
                agg["empty"] += 1
        except Exception as exc:
            logger.exception("nse_xbrl: unexpected error symbol=%s: %s", symbol, exc)
            agg["error"] += 1
    return agg
