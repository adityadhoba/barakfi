#!/usr/bin/env python3
"""Cron: NSE bhavcopy → data_price_daily."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SessionLocal, engine
import app.models_data_warehouse  # noqa: F401
Base.metadata.create_all(bind=engine)

from app.connectors.nse_prices import sync_nse_bhavcopy


def main() -> None:
    db = SessionLocal()
    try:
        r = sync_nse_bhavcopy(db)
        print("Bhavcopy:", r)
    finally:
        db.close()


if __name__ == "__main__":
    main()
