"""
ETF screening from stored holdings (synced via etf_holdings_sync).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.api import helpers
from app.models import EtfHolding, Stock
from app.services.halal_service import evaluate_stock
from app.services.stock_lookup import resolve_stock


def _underlying_stock(db: Session, holding_symbol: str, etf: Stock) -> Stock | None:
    ex = (etf.exchange or "NSE").upper()
    hs = holding_symbol.upper().replace(".NS", "").replace(".L", "")
    if ex in ("US", "NYSE", "NASDAQ"):
        return resolve_stock(db, hs, "US", active_only=True, is_etf=False)
    s = resolve_stock(db, hs, "NSE", active_only=True, is_etf=False)
    if s:
        return s
    return resolve_stock(db, hs, "US", active_only=True, is_etf=False)


def screen_etf(db: Session, etf_symbol: str, exchange: str | None = None) -> dict | None:
    etf = resolve_stock(db, etf_symbol, exchange, is_etf=True, active_only=True)
    if not etf:
        return None

    holdings = (
        db.query(EtfHolding)
        .filter(EtfHolding.etf_stock_id == etf.id)
        .order_by(EtfHolding.weight_pct.desc())
        .all()
    )

    if not holdings:
        return {
            "symbol": etf.symbol,
            "name": etf.name,
            "exchange": etf.exchange,
            "halal_pct": None,
            "cautious_pct": None,
            "non_compliant_pct": None,
            "unknown_pct": 100.0,
            "total_holdings_checked": 0,
            "halal_count": 0,
            "non_compliant_count": 0,
            "cautious_count": 0,
            "unknown_count": 0,
            "status": "UNKNOWN",
            "holdings": [],
            "holdings_as_of": None,
            "data_note": "No holdings loaded. Run: python -m app.scripts.sync_etf_holdings",
        }

    weights: list[float] = []
    for h in holdings:
        w = h.weight_pct
        if w is not None and w > 0:
            weights.append(float(w))
    use_equal = not weights or sum(weights) < 1.0
    n = len(holdings)
    eq_w = 100.0 / n if n else 0.0

    halal_w = cautious_w = non_w = unk_w = 0.0
    halal_c = cautious_c = non_c = unk_c = 0
    holdings_detail: list[dict] = []

    for h in holdings:
        w = eq_w if use_equal else (float(h.weight_pct) if h.weight_pct is not None else eq_w)
        u = _underlying_stock(db, h.holding_symbol, etf)
        if not u:
            unk_w += w
            unk_c += 1
            holdings_detail.append(
                {
                    "symbol": h.holding_symbol,
                    "name": h.holding_name,
                    "weight_pct": h.weight_pct,
                    "status": "UNKNOWN",
                    "rating": None,
                    "mapped": False,
                }
            )
            continue
        result = evaluate_stock(helpers.stock_to_dict(u))
        status = result["status"]
        rating = result.get("compliance_rating")
        if status == "HALAL":
            halal_w += w
            halal_c += 1
        elif status == "NON_COMPLIANT":
            non_w += w
            non_c += 1
        else:
            cautious_w += w
            cautious_c += 1
        holdings_detail.append(
            {
                "symbol": h.holding_symbol,
                "name": h.holding_name or u.name,
                "weight_pct": h.weight_pct,
                "status": status,
                "rating": rating,
                "mapped": True,
                "underlying_symbol": u.symbol,
                "underlying_exchange": u.exchange,
            }
        )

    tw = halal_w + cautious_w + non_w + unk_w
    if tw <= 0:
        tw = 1.0

    halal_pct = round(100.0 * halal_w / tw, 1)
    cautious_pct = round(100.0 * cautious_w / tw, 1)
    non_pct = round(100.0 * non_w / tw, 1)
    unk_pct = round(100.0 * unk_w / tw, 1)

    if non_pct >= 33:
        overall = "NON_COMPLIANT"
    elif cautious_pct + unk_pct >= 50:
        overall = "CAUTIOUS"
    elif halal_pct >= 70:
        overall = "HALAL"
    else:
        overall = "CAUTIOUS"

    as_of = holdings[0].as_of.isoformat() if holdings[0].as_of else None
    src = holdings[0].source if holdings else ""

    return {
        "symbol": etf.symbol,
        "name": etf.name,
        "exchange": etf.exchange,
        "halal_pct": halal_pct,
        "cautious_pct": cautious_pct,
        "non_compliant_pct": non_pct,
        "unknown_pct": unk_pct,
        "total_holdings_checked": n,
        "halal_count": halal_c,
        "non_compliant_count": non_c,
        "cautious_count": cautious_c,
        "unknown_count": unk_c,
        "status": overall,
        "holdings": holdings_detail,
        "holdings_as_of": as_of,
        "holdings_source": src,
    }


def list_etfs_with_compliance(db: Session) -> list[dict]:
    etfs = db.query(Stock).filter(Stock.is_etf.is_(True), Stock.is_active.is_(True)).order_by(Stock.symbol).all()
    results = []
    for e in etfs:
        snap = screen_etf(db, e.symbol, e.exchange)
        row = {
            "symbol": e.symbol,
            "name": e.name,
            "exchange": e.exchange,
            "country": e.country,
            "price": e.price,
            "market_cap": e.market_cap,
        }
        if snap:
            row["halal_pct"] = snap.get("halal_pct")
            row["status"] = snap.get("status")
            row["holdings_count"] = snap.get("total_holdings_checked")
        results.append(row)
    return results
