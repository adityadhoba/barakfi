#!/usr/bin/env python3
"""Recompute methodology explainability snapshots for warehouse listings (batch)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Stock
from app.models_data_warehouse import DataListing
from app.services.methodology_screening_engine import build_explainability, persist_snapshot_for_listing


def main() -> None:
    db = SessionLocal()
    try:
        listings = db.query(DataListing).filter(DataListing.exchange_code == "NSE").limit(500).all()
        for li in listings:
            stock = db.query(Stock).filter(Stock.exchange == "NSE", Stock.symbol == li.native_symbol).one_or_none()
            if not stock:
                continue
            full = {
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "exchange": stock.exchange,
                "market_cap": stock.market_cap,
                "average_market_cap_36m": stock.average_market_cap_36m,
                "debt": stock.debt,
                "revenue": stock.revenue,
                "total_business_income": stock.total_business_income,
                "interest_income": stock.interest_income,
                "non_permissible_income": stock.non_permissible_income,
                "accounts_receivable": stock.accounts_receivable,
                "cash_and_equivalents": stock.cash_and_equivalents,
                "short_term_investments": stock.short_term_investments,
                "fixed_assets": stock.fixed_assets,
                "total_assets": stock.total_assets,
                "price": stock.price,
                "currency": stock.currency,
                "country": stock.country,
                "data_source": stock.data_source,
                "data_quality": getattr(stock, "data_quality", None),
                "fundamentals_fields_missing": getattr(stock, "fundamentals_fields_missing", None) or [],
            }
            expl = build_explainability(full, db)
            persist_snapshot_for_listing(db, li.id, expl)
            print(li.native_symbol, expl.get("overall_status"))
    finally:
        db.close()


if __name__ == "__main__":
    main()
