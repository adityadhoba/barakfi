"""Halal ETF service — returns curated list of Shariah-compliant ETFs."""

from __future__ import annotations
from app.data.etfs import HALAL_ETFS


def get_etfs(exchange: str | None = None) -> list[dict]:
    etfs = HALAL_ETFS
    if exchange:
        ex = exchange.upper()
        etfs = [e for e in etfs if e.get("exchange", "").upper() == ex]
    return etfs
