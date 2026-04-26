"""
Live probe: Financial Modeling Prep → BarakFi ``Stock`` fundamentals shape.

Fetches profile, quote, latest annual income + balance sheet, and optionally
historical market cap (extra API call). Prints a JSON-ready preview in **INR
Crores** for NSE/BSE when FMP reports INR.

**Free tier:** ~250 calls/day. FMP Basic often returns **HTTP 402** for
``quote`` on Indian tickers and for ``search-isin`` — this script skips those
when blocked and uses **profile** for price/mcap; pass ``--symbol`` when ISIN
search is unavailable.

Default run uses 3 API calls: profile + income + balance (quote is attempted
but may be skipped on 402). Optional ``--historical-mcap`` adds one call.

Usage (one command per line; in zsh avoid pasting lines that start with ``(``):

  export FMP_API_KEY=...
  PYTHONPATH=. python3 scripts/pipeline/fmp_barakfi_probe.py --symbol TCS --exchange NSE
  PYTHONPATH=. python3 scripts/pipeline/fmp_barakfi_probe.py --isin INE467B01029 --symbol TCS --exchange NSE

See ``app/connectors/fmp_client.py`` for field mapping notes.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.connectors.fmp_client import (  # noqa: E402
    FMPClient,
    FMPError,
    average_market_cap_from_history,
    build_barakfi_fundamentals_preview,
    first_dict_or_none,
    fmp_ticker,
    pick_latest_statement_row,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("fmp_barakfi_probe")


def _sample_keys(label: str, obj: Any, limit: int = 40) -> dict[str, Any]:
    if isinstance(obj, dict):
        keys = list(obj.keys())[:limit]
        return {label: keys, f"{label}_count": len(obj)}
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        keys = list(obj[0].keys())[:limit]
        return {label: keys, f"{label}_list_len": len(obj)}
    return {label: type(obj).__name__}


def main() -> int:
    p = argparse.ArgumentParser(description="Probe FMP stable API for BarakFi fundamentals mapping.")
    p.add_argument("--symbol", help="Native symbol e.g. TCS")
    p.add_argument("--exchange", default="NSE", help="NSE (default) or BSE")
    p.add_argument(
        "--isin",
        help="Try FMP search-isin first (often HTTP 402 on Basic; then needs --symbol)",
    )
    p.add_argument("--period", default="annual", choices=("annual", "quarter"), help="Statement period")
    p.add_argument("--limit", type=int, default=4, help="Statement rows to fetch")
    p.add_argument("--historical-mcap", action="store_true", help="Extra call: historical market capitalization")
    p.add_argument("--indent", type=int, default=2)
    args = p.parse_args()

    if not args.isin and not args.symbol:
        p.error("Provide --symbol or --isin")

    calls = 0
    try:
        client = FMPClient()
    except FMPError as exc:
        logger.error("%s", exc)
        return 2

    subscription_gaps: list[str] = []
    fmp_symbol: str | None = None
    if args.isin:
        calls += 1
        raw_search = client.search_isin(args.isin, allow_payment_required=True)
        if raw_search is None:
            subscription_gaps.append("search-isin: HTTP 402 (not on Basic plan — use --symbol)")
            raw_search = []
        # Typical: [{ "symbol": "TCS.NS", "companyName": "...", ... }]
        if isinstance(raw_search, list) and raw_search:
            fmp_symbol = raw_search[0].get("symbol")
        logger.info("search-isin %s → %s", args.isin, fmp_symbol)
        if not fmp_symbol and args.symbol:
            fmp_symbol = fmp_ticker(args.symbol, args.exchange)
            logger.info("Falling back to --symbol → %s", fmp_symbol)
        elif not fmp_symbol:
            logger.error(
                "Could not resolve FMP symbol for ISIN %s. Free tier blocks search-isin — "
                "re-run with e.g. --symbol TCS --exchange NSE",
                args.isin,
            )
            return 3
    else:
        fmp_symbol = fmp_ticker(args.symbol or "", args.exchange)

    assert fmp_symbol

    calls += 1
    profile_raw = client.profile(fmp_symbol)
    calls += 1
    quote_raw = client.quote(fmp_symbol, allow_payment_required=True)
    if quote_raw is None:
        subscription_gaps.append(
            "quote: HTTP 402 for this symbol (common on Basic for non-US) — using profile for price"
        )
        logger.info("quote skipped (402); using profile fields for price if present")
    calls += 1
    income_raw = client.income_statement(fmp_symbol, period=args.period, limit=args.limit)
    calls += 1
    balance_raw = client.balance_sheet_statement(fmp_symbol, period=args.period, limit=args.limit)

    profile = first_dict_or_none(profile_raw)
    quote = first_dict_or_none(quote_raw)
    income_latest = pick_latest_statement_row(income_raw)
    balance_latest = pick_latest_statement_row(balance_raw)

    ccy = (profile or {}).get("currency") or "INR"
    ex = args.exchange

    preview = build_barakfi_fundamentals_preview(
        profile_row=profile,
        quote_row=quote,
        income_latest=income_latest,
        balance_latest=balance_latest,
        exchange=ex,
        currency=ccy,
    )

    hist_note = None
    if args.historical_mcap:
        calls += 1
        hist = client.historical_market_capitalization(fmp_symbol, allow_payment_required=True)
        if hist is None:
            subscription_gaps.append(
                "historical-market-capitalization: HTTP 402 — use internal MarketPriceDaily for 36m avg mcap"
            )
        else:
            avg = average_market_cap_from_history(hist, months=36, exchange=ex, currency=ccy)
            preview["average_market_cap_36m"] = avg
            hist_note = (
                "average_market_cap_36m: rough trailing average from FMP history (verify vs internal 36m series)."
            )

    out: dict[str, Any] = {
        "fmp_symbol": fmp_symbol,
        "api_calls_this_run": calls,
        "subscription_gaps": subscription_gaps,
        "free_tier_hint": "FMP Basic is often 250 calls/day — check https://site.financialmodelingprep.com/developer/docs/pricing",
        "barakfi_preview": preview,
        "diagnostics": {
            **_sample_keys("profile_keys", profile),
            **_sample_keys("quote_keys", quote),
            **_sample_keys("income_latest_keys", income_latest),
            **_sample_keys("balance_latest_keys", balance_latest),
        },
        "statement_period_end": {
            "income": (income_latest or {}).get("date") if income_latest else None,
            "balance": (balance_latest or {}).get("date") if balance_latest else None,
        },
    }
    if hist_note:
        out["notes"] = [hist_note]

    print(json.dumps(out, indent=args.indent, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
