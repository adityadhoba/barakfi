"""
In-memory TTL cache for stock screening outputs (halal engine).

Reduces repeated CPU work for hot symbols. Review cases and compliance overrides
are applied after cache hits so governance data stays fresh.

Structure per symbol (conceptually):
    { "INFY": { "data": <serializable dict>, "timestamp": <unix time> } }
"""

from __future__ import annotations

import threading
import time
from typing import Any

TTL_SECONDS = 300.0  # 5 minutes

_LOCK = threading.Lock()

# Uppercase symbol -> {"data": Any, "timestamp": float}
_check_stock: dict[str, dict[str, Any]] = {}
# Raw evaluate_stock(stock, PRIMARY_PROFILE) before compliance override
_primary_eval: dict[str, dict[str, Any]] = {}
# Raw evaluate_stock_multi(stock) (methodologies, consensus, etc.)
_multi: dict[str, dict[str, Any]] = {}


def _now() -> float:
    return time.time()


def _get(store: dict[str, dict[str, Any]], symbol: str) -> Any | None:
    key = symbol.strip().upper()
    if not key:
        return None
    with _LOCK:
        row = store.get(key)
        if not row:
            return None
        if _now() - float(row["timestamp"]) > TTL_SECONDS:
            del store[key]
            return None
        return row["data"]


def _set(store: dict[str, dict[str, Any]], symbol: str, data: Any) -> None:
    key = symbol.strip().upper()
    if not key:
        return
    with _LOCK:
        store[key] = {"data": data, "timestamp": _now()}


def get_check_stock(symbol: str) -> dict | None:
    out = _get(_check_stock, symbol)
    return out if isinstance(out, dict) else None


def set_check_stock(symbol: str, payload: dict) -> None:
    _set(_check_stock, symbol, payload)


def get_primary_eval(symbol: str) -> dict | None:
    out = _get(_primary_eval, symbol)
    return out if isinstance(out, dict) else None


def set_primary_eval(symbol: str, result: dict) -> None:
    _set(_primary_eval, symbol, result)


def get_multi(symbol: str) -> dict | None:
    out = _get(_multi, symbol)
    return out if isinstance(out, dict) else None


def set_multi(symbol: str, multi: dict) -> None:
    _set(_multi, symbol, multi)


def clear_screening_cache(symbol: str | None = None) -> None:
    """Drop cache entries for one symbol or the entire cache (tests / admin hooks)."""
    if symbol is None:
        with _LOCK:
            _check_stock.clear()
            _primary_eval.clear()
            _multi.clear()
        return
    key = symbol.strip().upper()
    if not key:
        return
    with _LOCK:
        _check_stock.pop(key, None)
        _primary_eval.pop(key, None)
        _multi.pop(key, None)
