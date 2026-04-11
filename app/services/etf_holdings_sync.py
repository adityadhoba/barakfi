"""
Fetch ETF constituent holdings via yfinance, with optional FMP fallback.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import EtfHolding, Stock
from app.services.market_data_client import fetch_etf_holdings_fmp

logger = logging.getLogger("barakfi")


def _yahoo_ticker(stock: Stock) -> str:
    ex = (stock.exchange_code or stock.exchange or "NSE").upper()
    sym = stock.symbol.upper()
    if ex in ("US", "NYSE", "NASDAQ"):
        return sym
    if ex == "LSE":
        return f"{sym}.L" if not sym.endswith(".L") else sym
    if ex in ("NSE", "BSE"):
        return f"{sym}.NS" if ex == "NSE" and not sym.endswith(".NS") else sym
    return sym


def fetch_holdings_yfinance(yahoo_ticker: str) -> tuple[list[dict[str, Any]], datetime | None, str]:
    """
    Returns (holdings, as_of_utc, source) where each holding is
    {symbol, name, weight_pct, shares_held}.
    """
    try:
        import yfinance as yf
    except ImportError:
        return [], None, "yfinance_missing"

    t = yf.Ticker(yahoo_ticker)
    rows: list[dict[str, Any]] = []
    as_of: datetime | None = None
    source = "yfinance"

    # yfinance 0.2.x: funds_data.asset_holdings (DataFrame)
    try:
        fd = getattr(t, "funds_data", None)
        if fd is not None:
            ah = getattr(fd, "asset_holdings", None)
            if ah is not None and hasattr(ah, "empty") and not ah.empty:
                df = ah
                # columns often: symbol/name + weight or percentage
                for idx, r in df.iterrows():
                    sym = str(r.get("Symbol") or r.get("symbol") or r.get("holdingSymbol") or idx or "").strip()
                    if not sym or sym.upper() == "N/A":
                        continue
                    name = str(r.get("Name") or r.get("name") or "")
                    w = r.get("Holding Percent") or r.get("weight") or r.get("% of net assets")
                    sh = r.get("Shares") or r.get("shares")
                    try:
                        weight = float(w) * 100 if w is not None and float(w) <= 1.0001 else float(w) if w is not None else None
                    except (TypeError, ValueError):
                        weight = None
                    try:
                        shares = float(sh) if sh is not None else None
                    except (TypeError, ValueError):
                        shares = None
                    rows.append(
                        {
                            "symbol": sym.upper().replace(".NS", "").replace(".L", ""),
                            "name": name,
                            "weight_pct": weight,
                            "shares_held": shares,
                        }
                    )
                if rows:
                    return rows, as_of, source
    except Exception as exc:
        logger.debug("yfinance funds_data path failed for %s: %s", yahoo_ticker, exc)

    # Older: fund_holdings property (dict of DataFrames per period)
    try:
        fh = getattr(t, "fund_holdings", None)
        if fh and isinstance(fh, dict):
            for _k, df in fh.items():
                if df is None or getattr(df, "empty", True):
                    continue
                for _, r in df.iterrows():
                    sym = str(r.get("Symbol") or r.get("symbol") or "").strip()
                    if not sym:
                        continue
                    name = str(r.get("Name") or r.get("name") or "")
                    w = r.get("Holding Percent") or r.get("% of net assets")
                    try:
                        weight = float(w) if w is not None else None
                    except (TypeError, ValueError):
                        weight = None
                    rows.append(
                        {
                            "symbol": sym.upper().replace(".NS", "").replace(".L", ""),
                            "name": name,
                            "weight_pct": weight,
                            "shares_held": None,
                        }
                    )
                if rows:
                    return rows, as_of, source
    except Exception as exc:
        logger.debug("yfinance fund_holdings failed for %s: %s", yahoo_ticker, exc)

    return [], None, source


def sync_etf_holdings_for_stock(db: Session, etf: Stock) -> int:
    """
    Replace etf_holdings rows for this ETF. Returns number of rows stored.
    """
    if not etf.is_etf:
        return 0

    ytick = _yahoo_ticker(etf)
    holdings, as_of, source = fetch_holdings_yfinance(ytick)

    if not holdings:
        fmp = fetch_etf_holdings_fmp(etf.symbol)
        if fmp:
            as_of = datetime.now(timezone.utc)
            holdings = [
                {
                    "symbol": h["symbol"],
                    "name": h.get("name") or "",
                    "weight_pct": h.get("weight"),
                    "shares_held": None,
                }
                for h in fmp
            ]
            source = "fmp"

    db.query(EtfHolding).filter(EtfHolding.etf_stock_id == etf.id).delete(synchronize_session=False)

    if not holdings:
        db.commit()
        return 0

    if as_of is None:
        as_of = datetime.now(timezone.utc)

    n = 0
    for h in holdings:
        db.add(
            EtfHolding(
                etf_stock_id=etf.id,
                holding_symbol=h["symbol"][:32],
                holding_name=(h.get("name") or "")[:256],
                weight_pct=h.get("weight_pct"),
                shares_held=h.get("shares_held"),
                as_of=as_of,
                source=source,
            )
        )
        n += 1
    db.commit()
    return n
