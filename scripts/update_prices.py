#!/usr/bin/env python3
"""
Batch update stock prices from Yahoo Finance.

Usage:
    python scripts/update_prices.py                   # Update all stocks
    python scripts/update_prices.py --symbols TCS,INFY  # Update specific
    python scripts/update_prices.py --provider nse_public  # Use NSE API

This script updates the `price` field of each stock in the database
using public market data endpoints (Yahoo Finance or NSE India).
"""

import argparse
import sys
import os
import time

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Stock
from app.services.indian_market_client import fetch_quote_by_provider


def main():
    parser = argparse.ArgumentParser(description="Update stock prices from market data")
    parser.add_argument("--symbols", type=str, default="", help="Comma-separated symbols (default: all)")
    parser.add_argument("--provider", type=str, default="auto_india", help="Data provider: auto_india, nse_public, yahoo_india")
    parser.add_argument("--throttle", type=float, default=0.5, help="Seconds between API calls")
    parser.add_argument("--dry-run", action="store_true", help="Print updates without saving")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.symbols:
            symbol_list = [s.strip().upper() for s in args.symbols.split(",")]
            stocks = db.query(Stock).filter(Stock.symbol.in_(symbol_list), Stock.is_active == True).all()
        else:
            stocks = db.query(Stock).filter(Stock.is_active == True).all()

        total = len(stocks)
        updated = 0
        failed = []

        print(f"\nUpdating {total} stocks using provider: {args.provider}")
        print(f"Throttle: {args.throttle}s between requests")
        print("-" * 60)

        for i, stock in enumerate(stocks, 1):
            try:
                quote = fetch_quote_by_provider(stock.symbol, stock.exchange, args.provider)
                if quote and quote.last_price:
                    old_price = stock.price
                    change_pct = ((quote.last_price - old_price) / old_price * 100) if old_price > 0 else 0

                    if args.dry_run:
                        print(f"  [{i}/{total}] {stock.symbol:12s} ₹{old_price:>10,.0f} → ₹{quote.last_price:>10,.0f} ({change_pct:+.2f}%) [DRY RUN]")
                    else:
                        stock.price = quote.last_price
                        stock.data_source = f"live_{quote.source}"
                        print(f"  [{i}/{total}] {stock.symbol:12s} ₹{old_price:>10,.0f} → ₹{quote.last_price:>10,.0f} ({change_pct:+.2f}%)")
                    updated += 1
                else:
                    print(f"  [{i}/{total}] {stock.symbol:12s} — no quote available")
                    failed.append(stock.symbol)
            except Exception as e:
                print(f"  [{i}/{total}] {stock.symbol:12s} — error: {e}")
                failed.append(stock.symbol)

            if i < total:
                time.sleep(args.throttle)

        if not args.dry_run:
            db.commit()

        print("-" * 60)
        print(f"Updated: {updated}/{total}")
        if failed:
            print(f"Failed:  {', '.join(failed)}")
        print()

    finally:
        db.close()


if __name__ == "__main__":
    main()
