#!/usr/bin/env python3
"""Cron: NSE + optional BSE master sync → data warehouse."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SessionLocal, engine
import app.models_data_warehouse  # noqa: F401
Base.metadata.create_all(bind=engine)

from app.connectors.bse_master import sync_bse_master
from app.connectors.nse_equity_master import sync_nse_master


def main() -> None:
    db = SessionLocal()
    try:
        r1 = sync_nse_master(db)
        print("NSE master:", r1)
        r2 = sync_bse_master(db)
        print("BSE master:", r2)
    finally:
        db.close()


if __name__ == "__main__":
    main()
