from __future__ import annotations

import csv
import io
import os
from dataclasses import dataclass
from datetime import datetime, timezone

import requests
from sqlalchemy.orm import Session

from app.models import Stock, StockSymbolAlias, SymbolResolutionIssue

UTC = timezone.utc

# Seeded legacy candidates to monitor closely for rename/merge transitions.
LEGACY_CANDIDATES: tuple[str, ...] = ("TV18BRDCST", "TATAMOTORS", "PEL")

# Operational override map for confirmed successor transitions.
# Format: OLD:NEW,OLD2:NEW2
SUCCESSOR_MAP_ENV = "NSE_CONFIRMED_SUCCESSOR_MAP"

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/csv,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


@dataclass
class SymbolMasterSummary:
    active_count: int = 0
    deprecated_count: int = 0
    remapped_today: int = 0
    blocked_active: int = 0
    unresolved_actions: int = 0
    source_ok: bool = False
    source_detail: str = ""

    def to_dict(self) -> dict:
        return {
            "active_count": self.active_count,
            "deprecated_count": self.deprecated_count,
            "remapped_today": self.remapped_today,
            "blocked_active": self.blocked_active,
            "unresolved_actions": self.unresolved_actions,
            "source_ok": self.source_ok,
            "source_detail": self.source_detail,
        }


def _parse_successor_env() -> dict[str, str]:
    raw = (os.getenv(SUCCESSOR_MAP_ENV) or "").strip()
    out: dict[str, str] = {"TV18BRDCST": "NETWORK18"}
    if not raw:
        return out
    for token in raw.split(","):
        token = token.strip()
        if ":" not in token:
            continue
        old, new = token.split(":", 1)
        old = old.strip().upper()
        new = new.strip().upper()
        if old and new:
            out[old] = new
    return out


def _fetch_nse_equity_master_symbols() -> tuple[set[str], dict[str, str], str]:
    """
    Best-effort NSE equity symbol master pull.
    Returns (symbols, isin_by_symbol, source_detail).
    """
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    symbols: set[str] = set()
    isin_by_symbol: dict[str, str] = {}
    with requests.Session() as session:
        session.get("https://www.nseindia.com/", headers=NSE_HEADERS, timeout=15)
        response = session.get(url, headers=NSE_HEADERS, timeout=20)
        response.raise_for_status()
        content = response.content.decode("utf-8", errors="ignore")
        reader = csv.DictReader(io.StringIO(content))
        for row in reader:
            sym = str(row.get("SYMBOL") or "").strip().upper()
            isin = str(row.get("ISIN NUMBER") or "").strip().upper()
            if not sym:
                continue
            symbols.add(sym)
            if isin:
                isin_by_symbol[sym] = isin
    return symbols, isin_by_symbol, f"nse_equity_master:{url}"


def _record_resolution_issue(
    db: Session,
    *,
    symbol: str,
    reason: str,
    severity: str = "warning",
    candidate_symbol: str | None = None,
) -> None:
    db.add(
        SymbolResolutionIssue(
            symbol=symbol,
            candidate_symbol=candidate_symbol,
            reason=reason,
            severity=severity,
            attempted_tickers="",
            resolved=False,
        )
    )


def sync_nse_symbol_master(db: Session, *, now_utc: datetime | None = None) -> SymbolMasterSummary:
    """
    Update NSE symbol metadata/status with corporate-action-aware rules.
    - authoritative source is NSE symbol master when available
    - fallback to controlled successor map for known transitions
    """
    now = now_utc or datetime.now(UTC)
    summary = SymbolMasterSummary()
    successor_map = _parse_successor_env()

    master_symbols: set[str] = set()
    master_isin_map: dict[str, str] = {}
    try:
        master_symbols, master_isin_map, source_detail = _fetch_nse_equity_master_symbols()
        summary.source_ok = True
        summary.source_detail = source_detail
    except Exception as exc:
        summary.source_ok = False
        summary.source_detail = f"nse_master_unavailable:{type(exc).__name__}"

    rows = (
        db.query(Stock)
        .filter(Stock.exchange == "NSE")
        .order_by(Stock.symbol.asc(), Stock.id.asc())
        .all()
    )

    for row in rows:
        sym = (row.symbol or "").upper()
        if not row.symbol_status:
            row.symbol_status = "active"
        if row.canonical_symbol is None:
            row.canonical_symbol = sym
        if not row.isin and sym in master_isin_map:
            row.isin = master_isin_map[sym]

    for symbol in LEGACY_CANDIDATES:
        row = next((r for r in rows if (r.symbol or "").upper() == symbol), None)
        if not row:
            continue

        successor = successor_map.get(symbol)
        successor_row = (
            next((r for r in rows if (r.symbol or "").upper() == successor), None)
            if successor
            else None
        )

        successor_is_listed = bool(successor and successor in master_symbols) if master_symbols else bool(successor_row)

        if successor and successor_row and successor_is_listed:
            row.symbol_status = "deprecated"
            row.successor_symbol = successor
            row.canonical_symbol = successor
            row.symbol_effective_date = row.symbol_effective_date or now
            row.screening_blocked_reason = "deprecated_symbol_corporate_action"
            row.is_active = False
            summary.remapped_today += 1

            alias_exists = (
                db.query(StockSymbolAlias)
                .filter(
                    StockSymbolAlias.old_symbol == symbol,
                    StockSymbolAlias.new_symbol == successor,
                )
                .first()
            )
            if not alias_exists:
                db.add(
                    StockSymbolAlias(
                        old_symbol=symbol,
                        new_symbol=successor,
                        isin=row.isin,
                        source="symbol_master_sync",
                        status="active",
                        evidence_note="Confirmed successor via symbol master sync policy.",
                    )
                )
        else:
            row.symbol_status = "suspended"
            row.successor_symbol = successor
            row.canonical_symbol = successor or row.canonical_symbol or symbol
            row.screening_blocked_reason = "awaiting_corporate_action_resolution"
            row.is_active = True
            summary.unresolved_actions += 1
            _record_resolution_issue(
                db,
                symbol=symbol,
                candidate_symbol=successor,
                reason="Legacy NSE symbol requires corporate action resolution",
                severity="warning",
            )

    summary.active_count = (
        db.query(Stock)
        .filter(
            Stock.exchange == "NSE",
            Stock.is_active.is_(True),
            Stock.symbol_status == "active",
        )
        .count()
    )
    summary.deprecated_count = (
        db.query(Stock)
        .filter(
            Stock.exchange == "NSE",
            Stock.symbol_status == "deprecated",
        )
        .count()
    )
    summary.blocked_active = (
        db.query(Stock)
        .filter(
            Stock.exchange == "NSE",
            Stock.is_active.is_(True),
            Stock.screening_blocked_reason.isnot(None),
        )
        .count()
    )
    return summary

