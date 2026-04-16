from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Stock, SymbolResolutionIssue


UTC = timezone.utc
ISIN_GRACE_DAYS = 14
TRANSITION_GRACE_DAYS = 10


@dataclass
class SymbolIntegritySummary:
    symbol_isin_conflicts: int = 0
    isin_multi_symbol_conflicts: int = 0
    missing_isin_overdue: int = 0
    auto_disabled_count: int = 0
    blocked_from_screening_count: int = 0
    impacted_symbols: list[str] | None = None
    last_run_at: datetime | None = None

    def to_dict(self) -> dict:
        return {
            "last_run_at": self.last_run_at,
            "symbol_isin_conflicts": self.symbol_isin_conflicts,
            "isin_multi_symbol_conflicts": self.isin_multi_symbol_conflicts,
            "missing_isin_overdue": self.missing_isin_overdue,
            "auto_disabled_count": self.auto_disabled_count,
            "blocked_from_screening_count": self.blocked_from_screening_count,
            "impacted_symbols": sorted(set(self.impacted_symbols or [])),
        }


def _record_issue(
    db: Session,
    *,
    symbol: str,
    reason: str,
    severity: str = "warning",
    isin: str | None = None,
    candidate_symbol: str | None = None,
    candidate_isin: str | None = None,
) -> None:
    row = SymbolResolutionIssue(
        symbol=symbol,
        candidate_symbol=candidate_symbol,
        isin=isin,
        candidate_isin=candidate_isin,
        reason=reason,
        severity=severity,
        attempted_tickers="",
    )
    db.add(row)


def run_nse_symbol_integrity_checks(db: Session, *, now_utc: datetime | None = None) -> SymbolIntegritySummary:
    """
    NSE-only integrity checks:
    - same symbol with conflicting ISIN -> block screening (critical)
    - same ISIN on multiple active symbols -> transition grace, then disable old symbols
    - missing ISIN beyond grace window -> block and disable from screening
    """
    now = now_utc or datetime.now(UTC)
    summary = SymbolIntegritySummary(impacted_symbols=[], last_run_at=now)

    nse_rows = (
        db.query(Stock)
        .filter(Stock.exchange == "NSE")
        .order_by(Stock.created_at.asc(), Stock.id.asc())
        .all()
    )

    by_symbol: dict[str, list[Stock]] = {}
    by_isin: dict[str, list[Stock]] = {}
    for row in nse_rows:
        by_symbol.setdefault((row.symbol or "").upper(), []).append(row)
        isin = (row.isin or "").strip().upper()
        if isin:
            by_isin.setdefault(isin, []).append(row)

    # A) Same symbol, different ISIN -> critical conflict
    for symbol, rows in by_symbol.items():
        active_rows = [r for r in rows if r.is_active]
        if len(active_rows) < 2:
            continue
        isins = {(r.isin or "").strip().upper() for r in active_rows if (r.isin or "").strip()}
        if len(isins) > 1:
            summary.symbol_isin_conflicts += 1
            summary.impacted_symbols.append(symbol)
            for r in active_rows:
                r.screening_blocked_reason = "symbol_isin_conflict"
            _record_issue(
                db,
                symbol=symbol,
                reason="Same NSE symbol mapped to multiple ISINs",
                severity="error",
            )

    # B) Same ISIN, multiple active symbols -> transition grace then disable older
    for isin, rows in by_isin.items():
        active_rows = [r for r in rows if r.is_active]
        symbols = sorted({(r.symbol or "").upper() for r in active_rows if r.symbol})
        if len(symbols) <= 1:
            continue
        summary.isin_multi_symbol_conflicts += 1
        newest = sorted(active_rows, key=lambda r: (r.created_at or now, r.id), reverse=True)[0]
        for row in active_rows:
            symbol = (row.symbol or "").upper()
            summary.impacted_symbols.append(symbol)
            age_days = (now - (row.created_at or now)).days
            if row.id == newest.id:
                row.screening_blocked_reason = None
                continue
            if age_days > TRANSITION_GRACE_DAYS:
                row.is_active = False
                row.screening_blocked_reason = "deprecated_symbol_same_isin"
                summary.auto_disabled_count += 1
                _record_issue(
                    db,
                    symbol=symbol,
                    isin=isin,
                    candidate_symbol=(newest.symbol or "").upper(),
                    candidate_isin=(newest.isin or "").upper() or None,
                    reason="Deprecated NSE symbol auto-disabled after ISIN transition window",
                    severity="warning",
                )
            else:
                row.screening_blocked_reason = "symbol_transition_window"

    # C) Missing ISIN beyond grace window
    for row in nse_rows:
        if not row.is_active:
            continue
        symbol = (row.symbol or "").upper()
        has_isin = bool((row.isin or "").strip())
        if has_isin:
            continue
        age = now - (row.created_at or now)
        if age > timedelta(days=ISIN_GRACE_DAYS):
            row.screening_blocked_reason = "missing_isin_overdue"
            row.is_active = False
            summary.missing_isin_overdue += 1
            summary.auto_disabled_count += 1
            summary.impacted_symbols.append(symbol)
            _record_issue(
                db,
                symbol=symbol,
                reason="Active NSE symbol missing ISIN beyond grace window",
                severity="warning",
            )

    summary.blocked_from_screening_count = (
        db.query(Stock)
        .filter(
            Stock.exchange == "NSE",
            Stock.screening_blocked_reason.isnot(None),
            Stock.is_active.is_(True),
        )
        .count()
    )
    return summary


def symbol_health_summary(db: Session) -> dict:
    now = datetime.now(UTC)
    fourteen_days_ago = now - timedelta(days=14)
    latest = (
        db.query(SymbolResolutionIssue)
        .order_by(SymbolResolutionIssue.detected_at.desc(), SymbolResolutionIssue.id.desc())
        .first()
    )
    unresolved = db.query(SymbolResolutionIssue).filter(SymbolResolutionIssue.resolved.is_(False))
    symbol_isin_conflicts = unresolved.filter(SymbolResolutionIssue.reason.ilike("%multiple ISIN%")).count()
    isin_multi_symbol_conflicts = unresolved.filter(SymbolResolutionIssue.reason.ilike("%same ISIN%")).count()
    missing_isin_overdue = unresolved.filter(SymbolResolutionIssue.reason.ilike("%missing ISIN%")).count()
    auto_disabled_count = (
        db.query(Stock)
        .filter(Stock.exchange == "NSE", Stock.is_active.is_(False), Stock.screening_blocked_reason.isnot(None))
        .count()
    )
    blocked_from_screening_count = (
        db.query(Stock)
        .filter(Stock.exchange == "NSE", Stock.is_active.is_(True), Stock.screening_blocked_reason.isnot(None))
        .count()
    )
    impacted_symbols = sorted(
        {
            (r.symbol or "").upper()
            for r in unresolved.filter(SymbolResolutionIssue.detected_at >= fourteen_days_ago).all()
            if r.symbol
        }
    )
    return {
        "last_run_at": latest.detected_at if latest else None,
        "symbol_isin_conflicts": symbol_isin_conflicts,
        "isin_multi_symbol_conflicts": isin_multi_symbol_conflicts,
        "missing_isin_overdue": missing_isin_overdue,
        "auto_disabled_count": auto_disabled_count,
        "blocked_from_screening_count": blocked_from_screening_count,
        "impacted_symbols": impacted_symbols,
    }
