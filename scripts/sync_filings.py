#!/usr/bin/env python3
"""Cron: NSE corporate announcements catalog → data_raw_artifacts (warehouse)."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SessionLocal, engine
import app.models_data_warehouse  # noqa: F401
Base.metadata.create_all(bind=engine)

from app.connectors.nse_filings import sync_nse_filings_catalog


def main() -> int:
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL is required", file=sys.stderr)
        return 1
    db = SessionLocal()
    try:
        out = sync_nse_filings_catalog(db)
        print(out)
        return 0 if out.get("ok") else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
