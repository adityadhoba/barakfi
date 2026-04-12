#!/usr/bin/env python3
"""
One-time cleanup: delete Stock rows whose exchange is not NSE or BSE, after removing dependents.

Run from repo root with PYTHONPATH including the project (e.g. ``PYTHONPATH=.``).

  PYTHONPATH=. python3 scripts/purge_non_indian_stocks.py
  PYTHONPATH=. python3 scripts/purge_non_indian_stocks.py --execute

Back up the database first. Safe mode in the API should already hide these symbols; this script
aligns persistent storage once you are ready.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as `python scripts/purge_non_indian_stocks.py` from repo root
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import delete, select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    CollectionEntry,
    ComplianceHistory,
    ComplianceOverride,
    ComplianceReviewCase,
    ComplianceReviewEvent,
    EtfHolding,
    PortfolioHolding,
    ResearchNote,
    ScreeningLog,
    Stock,
    StockIndexMembership,
    SuperInvestorHolding,
    WatchlistEntry,
)

ALLOWED = frozenset({"NSE", "BSE"})


def _non_indian_stock_ids(session) -> list[int]:
    out: list[int] = []
    for sid, ex in session.execute(select(Stock.id, Stock.exchange)):
        if (ex or "").strip().upper() not in ALLOWED:
            out.append(int(sid))
    return out


def purge(session, *, execute: bool) -> int:
    ids = _non_indian_stock_ids(session)
    if not ids:
        print("No non-NSE/BSE stocks found.")
        return 0

    print(f"Found {len(ids)} stock id(s) to remove (exchanges outside NSE/BSE).")
    if not execute:
        print("Dry run only; pass --execute to delete.")
        return len(ids)

    case_ids = list(session.scalars(select(ComplianceReviewCase.id).where(ComplianceReviewCase.stock_id.in_(ids))))

    if case_ids:
        session.execute(delete(ComplianceReviewEvent).where(ComplianceReviewEvent.review_case_id.in_(case_ids)))
    session.execute(delete(ComplianceReviewCase).where(ComplianceReviewCase.stock_id.in_(ids)))

    session.execute(delete(EtfHolding).where(EtfHolding.etf_stock_id.in_(ids)))
    session.execute(delete(StockIndexMembership).where(StockIndexMembership.stock_id.in_(ids)))
    session.execute(delete(PortfolioHolding).where(PortfolioHolding.stock_id.in_(ids)))
    session.execute(delete(WatchlistEntry).where(WatchlistEntry.stock_id.in_(ids)))
    session.execute(delete(ResearchNote).where(ResearchNote.stock_id.in_(ids)))
    session.execute(delete(ComplianceOverride).where(ComplianceOverride.stock_id.in_(ids)))
    session.execute(delete(ScreeningLog).where(ScreeningLog.stock_id.in_(ids)))
    session.execute(delete(ComplianceHistory).where(ComplianceHistory.stock_id.in_(ids)))
    session.execute(delete(CollectionEntry).where(CollectionEntry.stock_id.in_(ids)))
    session.execute(delete(SuperInvestorHolding).where(SuperInvestorHolding.stock_id.in_(ids)))

    session.execute(delete(Stock).where(Stock.id.in_(ids)))
    session.commit()
    print(f"Deleted {len(ids)} stock row(s) and dependents.")
    return len(ids)


def main() -> None:
    p = argparse.ArgumentParser(description="Purge non-Indian-exchange stocks (FK-safe).")
    p.add_argument("--execute", action="store_true", help="Actually delete (default is dry-run).")
    args = p.parse_args()

    session = SessionLocal()
    try:
        purge(session, execute=args.execute)
    finally:
        session.close()


if __name__ == "__main__":
    main()
