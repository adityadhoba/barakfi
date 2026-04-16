from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Stock, StockCorporateEvent

UTC = timezone.utc

EVENT_LABELS: dict[str, str] = {
    "merge": "Merged",
    "demerge": "Demerger",
    "delisted": "Delisted",
    "renamed": "Renamed",
    "acquired": "Acquired",
}

DISABLING_EVENTS = {"merge", "acquired", "delisted", "renamed"}


def _clean_symbol(value: str | None) -> str | None:
    if value is None:
        return None
    clean = value.strip().upper()
    return clean or None


def summarize_latest_events_by_symbols(db: Session, symbols: list[str]) -> dict[str, dict]:
    lookup = sorted({_clean_symbol(s) for s in symbols if _clean_symbol(s)})
    if not lookup:
        return {}

    events = (
        db.query(StockCorporateEvent)
        .filter(
            StockCorporateEvent.status == "active",
            or_(
                StockCorporateEvent.symbol.in_(lookup),
                StockCorporateEvent.successor_symbol.in_(lookup),
                StockCorporateEvent.canonical_symbol.in_(lookup),
            ),
        )
        .order_by(StockCorporateEvent.effective_date.desc(), StockCorporateEvent.id.desc())
        .all()
    )

    out: dict[str, dict] = {}
    for event in events:
        related = {
            _clean_symbol(event.symbol),
            _clean_symbol(event.successor_symbol),
            _clean_symbol(event.canonical_symbol),
        }
        for sym in related:
            if not sym or sym not in lookup or sym in out:
                continue
            out[sym] = {
                "event_type": event.event_type,
                "label": EVENT_LABELS.get(event.event_type, event.event_type.title()),
                "effective_date": event.effective_date,
                "symbol": _clean_symbol(event.symbol) or sym,
                "successor_symbol": _clean_symbol(event.successor_symbol),
                "source": event.source,
            }
    return out


def apply_corporate_action_events(db: Session, *, create_missing_parents: bool = True) -> dict:
    events = (
        db.query(StockCorporateEvent)
        .filter(StockCorporateEvent.status == "active")
        .order_by(StockCorporateEvent.effective_date.asc(), StockCorporateEvent.id.asc())
        .all()
    )

    updated = 0
    disabled = 0
    created = 0
    unresolved = 0
    remapped = 0

    by_symbol: defaultdict[str, list[Stock]] = defaultdict(list)
    for row in db.query(Stock).filter(Stock.exchange == "NSE").all():
        by_symbol[row.symbol.upper()].append(row)

    for event in events:
        old = _clean_symbol(event.symbol)
        successor = _clean_symbol(event.successor_symbol) or _clean_symbol(event.canonical_symbol)
        if not old:
            continue

        old_rows = by_symbol.get(old, [])
        old_row = old_rows[0] if old_rows else None

        if old_row:
            old_row.canonical_symbol = successor
            old_row.successor_symbol = successor
            if event.event_type in {"merge", "acquired"}:
                old_row.symbol_status = "merged"
            elif event.event_type == "delisted":
                old_row.symbol_status = "delisted"
            elif event.event_type == "renamed":
                old_row.symbol_status = "deprecated"
            else:
                old_row.symbol_status = old_row.symbol_status or "active"
            if event.event_type in DISABLING_EVENTS:
                if old_row.is_active:
                    disabled += 1
                old_row.is_active = False
                old_row.screening_blocked_reason = f"corporate_action_{event.event_type}"
            updated += 1

        target_row = None
        if successor:
            target_rows = by_symbol.get(successor, [])
            target_row = target_rows[0] if target_rows else None
            if target_row is None and create_missing_parents:
                target_row = Stock(
                    symbol=successor,
                    name=f"{successor} (Pending sync)",
                    sector=old_row.sector if old_row else "Unknown",
                    exchange="NSE",
                    market_cap=0.0,
                    average_market_cap_36m=0.0,
                    debt=0.0,
                    revenue=0.0,
                    total_business_income=0.0,
                    interest_income=0.0,
                    non_permissible_income=0.0,
                    accounts_receivable=0.0,
                    cash_and_equivalents=0.0,
                    short_term_investments=0.0,
                    fixed_assets=0.0,
                    total_assets=0.0,
                    price=0.0,
                    currency="INR",
                    country="India",
                    data_source="corporate_action_seed",
                    is_active=True,
                    symbol_status="active",
                    canonical_symbol=successor,
                )
                db.add(target_row)
                db.flush()
                by_symbol[successor].append(target_row)
                created += 1
            if target_row is not None:
                target_row.symbol_status = "active"
                target_row.canonical_symbol = successor
                target_row.successor_symbol = None
                target_row.is_active = True
                if target_row.screening_blocked_reason and target_row.screening_blocked_reason.startswith("corporate_action_"):
                    target_row.screening_blocked_reason = None
                remapped += 1
        elif event.event_type in DISABLING_EVENTS:
            unresolved += 1

    return {
        "events_processed": len(events),
        "rows_updated": updated,
        "rows_disabled": disabled,
        "rows_created": created,
        "rows_remapped": remapped,
        "unresolved_actions": unresolved,
        "run_at": datetime.now(UTC),
    }

