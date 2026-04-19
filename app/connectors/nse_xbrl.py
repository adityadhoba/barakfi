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


class NSESoftBlockError(RuntimeError):
    """Raised when NSE returns an HTML page instead of JSON (IP soft-blocked)."""

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

# ---------------------------------------------------------------------------
# NSE resCmpData field mapping
# ---------------------------------------------------------------------------
# /api/results-comparision returns:
#   {"resCmpData": [{re_net_sale, re_net_profit, re_total_inc, ...}], "bankNonBnking": "N"}
#
# All monetary fields are in INR Lakhs.  Divide by 100 to get INR Crores.
# The `re_res_type` field: "U" = Unaudited quarterly, "A" = Audited (annual Q4 filing).
#
_LAKHS_TO_CRORES = 0.01  # 1 Lakh = 0.01 Crore

# Direct re_* field → canonical metric code
_RE_FIELD_MAP: dict[str, str] = {
    "re_net_sale":    METRIC_REVENUE,                # Revenue from operations
    "re_total_inc":   METRIC_TOTAL_BUSINESS_INCOME,  # Total income (ops + other)
    "re_net_profit":  METRIC_NET_INCOME,              # PAT (profit after tax)
    "re_oth_inc_new": METRIC_NON_OPERATING_INCOME,   # Other income — halal non-permissible proxy
    "re_int_new":     METRIC_INTEREST_INCOME,         # Finance costs (interest expense proxy)
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_float_safe(v: Any) -> float | None:
    """Safely convert any value to float; returns None on failure or NaN."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        return f if f == f else None  # NaN guard
    s = str(v).replace(",", "").strip()
    if not s or s in ("-", "null", "None", "N/A"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _pick_rescmpdata_record(records: list[dict], period: str) -> dict[str, Any] | None:
    """
    From resCmpData list (newest-first), pick the best record for *period*.

    Strategy: always prefer the most recent audited annual ("A") record that is
    within the last 18 months.  If none exists that recent, fall back to the most
    recent record (unaudited quarterly) so we never serve data older than ~2 years.
    For Quarterly: always return the first element (most recent quarter).
    """
    from datetime import date, datetime

    if not records:
        return None

    if period == "Annual":
        cutoff = date.today().replace(year=date.today().year - 2)
        # First pass: prefer a recent audited annual
        for rec in records:
            if str(rec.get("re_res_type", "")).upper() == "A":
                try:
                    rec_date = datetime.strptime(rec.get("re_to_dt", ""), "%d-%b-%Y").date()
                    if rec_date >= cutoff:
                        return rec
                except (ValueError, AttributeError):
                    return rec  # can't parse date, use it anyway
        # Second pass: no recent audited record — return the most recent record
        # (unaudited quarterly is better than stale audited annual)

    return records[0]


def _extract_rescmpdata_metrics(
    payload: dict[str, Any], period: str, symbol: str
) -> tuple[dict[str, float], date | None]:
    """
    Parse the resCmpData response from NSE /api/results-comparision.

    Response shape:
      {"resCmpData": [{re_net_sale, re_net_profit, re_total_inc, ...}], "bankNonBnking": "N"}

    Monetary fields are in INR Lakhs; we convert to INR Crores (* 0.01).
    Returns (metrics_dict, period_end_date).
    """
    res_list = payload.get("resCmpData")
    if not isinstance(res_list, list) or not res_list:
        logger.warning(
            "nse_xbrl: no resCmpData for %s (top-level keys=%s)",
            symbol, list(payload.keys()),
        )
        return {}, None

    rec = _pick_rescmpdata_record(res_list, period)
    if not rec:
        return {}, None

    period_str = f"{rec.get('re_from_dt', '?')} → {rec.get('re_to_dt', '?')}"
    res_type = rec.get("re_res_type", "?")
    logger.info("nse_xbrl: %s using record %s (type=%s)", symbol, period_str, res_type)

    metrics: dict[str, float] = {}

    # Direct field mappings (Lakhs → Crores)
    for field, code in _RE_FIELD_MAP.items():
        val = _to_float_safe(rec.get(field))
        if val is not None:
            metrics[code] = round(val * _LAKHS_TO_CRORES, 4)

    # EBITDA = PAT + Tax + Interest + Depreciation (all Lakhs → Crores)
    ebitda_parts = [
        _to_float_safe(rec.get("re_net_profit")),
        _to_float_safe(rec.get("re_tax")),
        _to_float_safe(rec.get("re_int_new")),
        _to_float_safe(rec.get("re_depr_und_exp")),
    ]
    valid_parts = [x for x in ebitda_parts if x is not None]
    if len(valid_parts) >= 2:
        metrics[METRIC_EBITDA] = round(sum(valid_parts) * _LAKHS_TO_CRORES, 4)

    # Shares outstanding: re_pdup (Lakhs INR) / re_face_val (INR) × 100,000
    pdup = _to_float_safe(rec.get("re_pdup"))
    face_val = _to_float_safe(rec.get("re_face_val")) or 10.0
    if pdup and pdup > 0 and face_val > 0:
        metrics[METRIC_SHARES_OUTSTANDING] = round((pdup * 100_000) / face_val, 0)

    # Parse period_end from re_to_dt ("31-DEC-2024" format)
    period_end: date | None = None
    re_to_dt = rec.get("re_to_dt", "")
    try:
        period_end = datetime.strptime(re_to_dt, "%d-%b-%Y").date()
    except (ValueError, AttributeError):
        pass

    if metrics:
        logger.info(
            "nse_xbrl: %d metrics for %s — %s",
            len(metrics), symbol, {k: round(v, 2) for k, v in metrics.items()},
        )
    else:
        logger.warning("nse_xbrl: 0 metrics extracted for %s (record=%s)", symbol, str(rec)[:200])

    return metrics, period_end


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


def fetch_nse_financials(
    symbol: str,
    period: str = "Annual",
    session: "Any | None" = None,
) -> tuple[dict[str, float], str, int, "date | None"]:
    """
    Fetch NSE financial data for *symbol* via /api/results-comparision.

    The endpoint returns a resCmpData list of quarterly/annual records with re_*
    prefixed flat fields.  Values are in INR Lakhs; we convert to INR Crores.

    Returns:
        (metrics_dict, source_url, http_status, period_end_date)
        metrics_dict: {METRIC_CODE: value_in_crores} — empty on failure.
        period_end_date: derived from re_to_dt of the chosen record (may be None).
    """
    sym = symbol.upper()
    url = _NSE_RESULTS_COMPARISON.format(symbol=sym)

    http_code, content = _fetch_url(url, session)
    if http_code != 200 or not content:
        logger.debug("nse_xbrl: HTTP %s for %s", http_code, sym)
        return {}, url, http_code, None

    # Detect HTML soft-block: NSE returns 200 with an HTML challenge page instead of JSON.
    # This happens when the Render/cloud IP is flagged by Cloudflare.
    # Raise a distinct exception so the caller can abort the whole batch early.
    if content[:1] in (b"<", b"\xef"):  # HTML or BOM prefix
        snippet = content[:120].decode("utf-8", errors="replace").strip()
        raise NSESoftBlockError(
            f"NSE returned HTML instead of JSON for {sym} — "
            f"IP is soft-blocked. Response starts: {snippet!r}"
        )

    try:
        payload = json.loads(content.decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        snippet = content[:120].decode("utf-8", errors="replace").strip()
        logger.warning(
            "nse_xbrl: JSON decode error for %s — response starts: %r", sym, snippet
        )
        return {}, url, http_code, None

    metrics, period_end = _extract_rescmpdata_metrics(payload, period, sym)
    return metrics, url, http_code, period_end


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

    extracted, source_url, http_status, api_period_end = fetch_nse_financials(
        symbol, period, session=session
    )

    if not extracted:
        metrics_out["status"] = "empty_or_error"
        metrics_out["http_status"] = http_status
        return metrics_out

    # Archive raw content as a DataFiling reference
    content_bytes = json.dumps(extracted).encode()
    content_hash = sha256_bytes(content_bytes)

    # Use the period_end from the API response if available, else fall back to computed
    period_end = api_period_end if api_period_end is not None else _parse_period_end(None, period)
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
