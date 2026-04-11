#!/usr/bin/env python3
"""
Audit and optionally fix stocks.exchange / currency / country mismatches.

Run against production DATABASE_URL (or local) after activating the app venv:

  python scripts/audit_stock_exchange.py
  python scripts/audit_stock_exchange.py --fix-known-us

Heuristics:
- Indian exchanges (NSE, BSE) should use INR and typically India.
- US / LSE listings should not use INR-only labeling with Indian exchange.

--fix-known-us: For a curated list of US mega-cap tickers incorrectly stored as
NSE/BSE, set exchange=US, currency=USD, country=United States.
"""

from __future__ import annotations

import argparse
import os
import sys

# Symbols that are unambiguously US-listed mega-caps when found under NSE/BSE.
KNOWN_US_MEGA_CAPS = frozenset(
    {
        "AAPL",
        "AMZN",
        "BAC",
        "BRK.B",
        "CVX",
        "GOOG",
        "GOOGL",
        "HD",
        "JNJ",
        "JPM",
        "KO",
        "MA",
        "META",
        "MSFT",
        "NVDA",
        "PEP",
        "PG",
        "TSLA",
        "UNH",
        "V",
        "WMT",
        "XOM",
    }
)

INDIAN_EXCHANGES = frozenset({"NSE", "BSE"})
US_EXCHANGES = frozenset({"US", "NYSE", "NASDAQ"})
UK_EXCHANGES = frozenset({"LSE", "LON"})


def _suspicious(row) -> str | None:
    ex = (row.exchange or "").upper()
    cur = (row.currency or "").upper()
    country = (row.country or "").strip()

    if ex in INDIAN_EXCHANGES and cur in {"USD", "GBP"}:
        return "Indian exchange but non-INR currency"
    if ex in US_EXCHANGES | UK_EXCHANGES and cur == "INR":
        return "US/UK exchange but INR currency"
    if ex in INDIAN_EXCHANGES and country and country not in {"India", "IN"}:
        return "Indian exchange but non-India country"
    return None


def main() -> int:
    os.environ.setdefault("APP_ENV", "script")
    parser = argparse.ArgumentParser(description="Audit stock exchange/currency consistency")
    parser.add_argument(
        "--fix-known-us",
        action="store_true",
        help="Set US mega-cap symbols wrongly stored as NSE/BSE to exchange=US, currency=USD",
    )
    args = parser.parse_args()

    try:
        from sqlalchemy.orm import Session

        from app.database import engine
        from app.models import Stock
    except ImportError as e:
        print("Import error — run from repo root with PYTHONPATH set:", e, file=sys.stderr)
        return 1

    with Session(engine) as db:
        rows = db.query(Stock).filter(Stock.is_active.is_(True)).all()
        flagged: list[tuple[Stock, str]] = []
        for s in rows:
            reason = _suspicious(s)
            if reason:
                flagged.append((s, reason))

        print(f"Active stocks: {len(rows)}")
        print(f"Suspicious rows: {len(flagged)}")
        for s, reason in flagged[:200]:
            print(
                f"  {s.symbol:8} ex={s.exchange!s:4} cur={s.currency!s:4} country={s.country!s:20} — {reason}"
            )
        if len(flagged) > 200:
            print(f"  ... and {len(flagged) - 200} more")

        if args.fix_known_us:
            fixed = 0
            for s in rows:
                ex = (s.exchange or "").upper()
                sym = (s.symbol or "").upper()
                if ex in INDIAN_EXCHANGES and sym in KNOWN_US_MEGA_CAPS:
                    print(f"FIX: {sym} {ex} -> US / USD / United States")
                    s.exchange = "US"
                    s.currency = "USD"
                    s.country = "United States"
                    fixed += 1
            if fixed:
                db.commit()
                print(f"Committed fixes: {fixed}")
            else:
                print("No KNOWN_US_MEGA_CAPS rows under NSE/BSE to fix.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
