#!/usr/bin/env python3
"""Optional: write yfinance facts into warehouse for symbols listed in env."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.connectors.yfinance_fallback import write_yfinance_facts_for_symbol


def main() -> None:
    raw = os.getenv("YFINANCE_WAREHOUSE_SYMBOLS", "").strip()
    if not raw:
        print("YFINANCE_WAREHOUSE_SYMBOLS empty; nothing to do")
        return
    symbols = [s.strip().upper() for s in raw.split(",") if s.strip()]
    db = SessionLocal()
    try:
        for sym in symbols:
            out = write_yfinance_facts_for_symbol(db, sym, exchange=os.getenv("YFINANCE_WAREHOUSE_EXCHANGE", "NSE"))
            print(sym, out)
    finally:
        db.close()


if __name__ == "__main__":
    main()
