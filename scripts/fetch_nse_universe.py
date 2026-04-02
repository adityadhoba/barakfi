#!/usr/bin/env python3
"""
Fetch NSE index constituents and add new stocks to the database.

Usage:
    python scripts/fetch_nse_universe.py                   # Fetch Nifty 50
    python scripts/fetch_nse_universe.py --index NIFTY100  # Fetch Nifty 100
    python scripts/fetch_nse_universe.py --list-only        # Print symbols without DB changes

Fetches constituent lists from NSE India's public API and adds
any missing stocks to the database with placeholder financials.
Stocks with placeholder financials will show as REQUIRES_REVIEW
until real balance sheet data is loaded.
"""

import argparse
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from app.database import SessionLocal
from app.models import Stock

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
}

INDEX_URLS = {
    "NIFTY50": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
    "NIFTY100": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100",
    "NIFTY200": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20200",
    "NIFTY500": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500",
    "NIFTYMIDCAP100": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20MIDCAP%20100",
    "NIFTYSMALLCAP100": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20SMALLCAP%20100",
}

# Sector mapping from NSE industry to our sector taxonomy
INDUSTRY_TO_SECTOR = {
    "INFORMATION TECHNOLOGY": "Information Technology",
    "IT - SOFTWARE": "Information Technology",
    "IT CONSULTING & SOFTWARE": "Information Technology",
    "COMPUTERS - SOFTWARE & CONSULTING": "Information Technology",
    "PHARMACEUTICALS": "Pharmaceuticals",
    "PHARMACEUTICALS & DRUGS": "Pharmaceuticals",
    "HEALTHCARE": "Healthcare",
    "HOSPITALS & DIAGNOSTIC CENTRES": "Healthcare",
    "AUTOMOBILE": "Automobile",
    "AUTOMOBILES": "Automobile",
    "AUTO COMPONENTS": "Automobile",
    "CONSUMER GOODS": "Consumer Goods",
    "FMCG": "Consumer Goods",
    "FOOD PRODUCTS": "Consumer Goods",
    "PERSONAL PRODUCTS": "Consumer Goods",
    "HOUSEHOLD PRODUCTS": "Consumer Goods",
    "TEXTILES": "Consumer Goods",
    "OIL & GAS": "Energy",
    "OIL EXPLORATION": "Energy",
    "POWER": "Energy",
    "ENERGY": "Energy",
    "RENEWABLE ENERGY": "Energy",
    "BANKING": "Banking and Financial Services",
    "FINANCIAL SERVICES": "Financial Services",
    "INSURANCE": "Insurance",
    "NBFC": "Financial Services",
    "METALS": "Metals & Mining",
    "METALS & MINING": "Metals & Mining",
    "MINING & MINERAL PRODUCTS": "Metals & Mining",
    "STEEL": "Metals & Mining",
    "ALUMINIUM": "Metals & Mining",
    "CEMENT": "Cement",
    "CEMENT & CEMENT PRODUCTS": "Cement",
    "CONSTRUCTION": "Infrastructure",
    "INFRASTRUCTURE": "Infrastructure",
    "ENGINEERING": "Infrastructure",
    "CAPITAL GOODS": "Infrastructure",
    "TELECOM": "Telecom",
    "TELECOMMUNICATION": "Telecom",
    "CHEMICALS": "Chemicals",
    "SPECIALTY CHEMICALS": "Chemicals",
    "PAINTS": "Chemicals",
    "REAL ESTATE": "Real Estate",
    "REALTY": "Real Estate",
    "DEFENCE": "Defence",
    "AEROSPACE & DEFENCE": "Defence",
    "MEDIA": "Media and Entertainment",
    "ENTERTAINMENT": "Media and Entertainment",
    "TOBACCO": "Tobacco",
    "ALCOHOL": "Alcohol",
    "AVIATION": "Aviation",
    "AIRLINES": "Aviation",
    "SERVICES": "Consumer Services",
    "HOSPITALITY": "Consumer Services",
    "RETAIL": "Consumer Goods",
}


def fetch_index_constituents(index_name: str) -> list[dict]:
    """Fetch index constituents from NSE India API."""
    url = INDEX_URLS.get(index_name.upper())
    if not url:
        print(f"Unknown index: {index_name}")
        print(f"Available: {', '.join(INDEX_URLS.keys())}")
        return []

    print(f"Fetching {index_name} constituents from NSE...")
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            # First hit homepage for session cookie
            client.get("https://www.nseindia.com/", headers=NSE_HEADERS)
            time.sleep(0.5)
            r = client.get(url, headers=NSE_HEADERS)
    except httpx.HTTPError as e:
        print(f"Error fetching from NSE: {e}")
        return []

    if r.status_code != 200:
        print(f"NSE returned status {r.status_code}")
        return []

    try:
        data = r.json()
        return data.get("data", [])
    except Exception as e:
        print(f"Error parsing NSE response: {e}")
        return []


def map_sector(industry: str) -> str:
    """Map NSE industry classification to our sector taxonomy."""
    if not industry:
        return "Other"
    upper = industry.upper().strip()
    for key, sector in INDUSTRY_TO_SECTOR.items():
        if key in upper:
            return sector
    return industry.title()


def main():
    parser = argparse.ArgumentParser(description="Fetch NSE index constituents")
    parser.add_argument("--index", type=str, default="NIFTY50", help="Index name (NIFTY50, NIFTY100, NIFTY200, NIFTY500)")
    parser.add_argument("--list-only", action="store_true", help="Print symbols only, no DB changes")
    args = parser.parse_args()

    constituents = fetch_index_constituents(args.index)
    if not constituents:
        print("No constituents fetched. Try again later.")
        return

    # Filter out the index row itself (usually first)
    stocks_data = [c for c in constituents if c.get("symbol") and c["symbol"] != args.index]
    print(f"Found {len(stocks_data)} stocks in {args.index}\n")

    if args.list_only:
        for item in stocks_data:
            sym = item.get("symbol", "")
            name = item.get("meta", {}).get("companyName", item.get("symbol", ""))
            ltp = item.get("lastPrice", 0)
            industry = item.get("meta", {}).get("industry", "")
            sector = map_sector(industry)
            print(f"  {sym:15s} {name:40s} ₹{ltp:>10,.0f}  [{sector}]")
        return

    # Add to database
    db = SessionLocal()
    try:
        existing = {s.symbol for s in db.query(Stock.symbol).all()}
        added = 0
        skipped = 0

        for item in stocks_data:
            sym = item.get("symbol", "").strip()
            if not sym or sym in existing:
                skipped += 1
                continue

            meta = item.get("meta", {})
            name = meta.get("companyName", sym)
            industry = meta.get("industry", "")
            sector = map_sector(industry)
            ltp = float(item.get("lastPrice", 0) or 0)

            # Create with placeholder financials — will show as REQUIRES_REVIEW
            stock = Stock(
                symbol=sym,
                name=name,
                sector=sector,
                exchange="NSE",
                market_cap=0.0,
                average_market_cap_36m=0.0,
                debt=0.0,
                revenue=0.0,
                total_business_income=0.0,
                interest_income=0.0,
                non_permissible_income=0.0,
                accounts_receivable=0.0,
                fixed_assets=0.0,
                total_assets=0.0,
                price=ltp if ltp > 0 else 0.0,
                data_source="nse_index_fetch",
                is_active=True,
            )
            db.add(stock)
            existing.add(sym)
            added += 1
            print(f"  + {sym:15s} {name:40s} [{sector}]")

        db.commit()
        print(f"\nAdded: {added} new stocks")
        print(f"Skipped: {skipped} (already in DB)")
        print(f"Total in DB: {len(existing)}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
