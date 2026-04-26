"""
Pluggable cache for screening payloads.

In-memory (default) — fast, single-process, lost on restart.
Redis (production)   — survives restarts, shared across workers, persistent.

Set REDIS_URL env var to activate Redis automatically. If the env var is
absent or redis-py is not installed, falls back to InMemoryCacheService
with no code changes required anywhere else.
"""

from __future__ import annotations

import logging
import os
import pickle
import threading
import time
from abc import ABC, abstractmethod
from typing import Any

log = logging.getLogger(__name__)


class CacheService(ABC):
    """Abstract cache interface — swap implementations without touching call sites."""

    @abstractmethod
    def get(self, key: str) -> Any | None:
        """Return cached value if still valid, else None."""

    @abstractmethod
    def set(self, key: str, data: Any, ttl_seconds: float) -> None:
        """Store data with TTL from now."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Invalidate one key."""

    def get_many(self, keys: list[str]) -> list[Any | None]:
        """Best-effort bulk get; default falls back to per-key get."""
        return [self.get(key) for key in keys]


class InMemoryCacheService(CacheService):
    """Thread-safe TTL cache (single-process, lost on restart)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: dict[str, dict[str, Any]] = {}

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            if now > float(entry["expires_at"]):
                del self._store[key]
                return None
            return entry.get("data")

    def set(self, key: str, data: Any, ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._store[key] = {
                "data": data,
                "expires_at": now + ttl_seconds,
                "timestamp": now,
            }

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)


class RedisCacheService(CacheService):
    """Redis-backed cache — survives restarts, shared across workers.

    Requires redis-py: pip install redis
    Connection is lazy — errors during get/set are logged and treated as cache
    misses so the application degrades gracefully if Redis goes down.
    """

    def __init__(self, url: str) -> None:
        import redis  # type: ignore[import-untyped]

        self._r = redis.from_url(url, decode_responses=False, socket_timeout=2)
        log.info("[RedisCacheService] connected to %s", url.split("@")[-1])

    def get(self, key: str) -> Any | None:
        try:
            raw = self._r.get(key)
            if raw is None:
                return None
            return pickle.loads(raw)  # noqa: S301 — internal data only
        except Exception as exc:
            log.warning("[RedisCacheService] get(%s) failed: %s", key, exc)
            return None

    def set(self, key: str, data: Any, ttl_seconds: float) -> None:
        try:
            self._r.setex(key, max(1, int(ttl_seconds)), pickle.dumps(data))
        except Exception as exc:
            log.warning("[RedisCacheService] set(%s) failed: %s", key, exc)

    def delete(self, key: str) -> None:
        try:
            self._r.delete(key)
        except Exception as exc:
            log.warning("[RedisCacheService] delete(%s) failed: %s", key, exc)

    def get_many(self, keys: list[str]) -> list[Any | None]:
        if not keys:
            return []
        try:
            raw_values = self._r.mget(keys)
            out: list[Any | None] = []
            for raw in raw_values:
                if raw is None:
                    out.append(None)
                    continue
                try:
                    out.append(pickle.loads(raw))  # noqa: S301 — internal data only
                except Exception:
                    out.append(None)
            return out
        except Exception as exc:
            log.warning("[RedisCacheService] get_many(%d keys) failed: %s", len(keys), exc)
            return [None] * len(keys)


# ---------------------------------------------------------------------------
# Process-wide singleton — auto-selects Redis when REDIS_URL is set
# ---------------------------------------------------------------------------
_redis_url = os.getenv("REDIS_URL")

if _redis_url:
    try:
        screening_cache: CacheService = RedisCacheService(_redis_url)
        log.info("[cache_service] Using Redis cache")
    except Exception as _exc:
        log.warning("[cache_service] Redis init failed (%s), falling back to in-memory", _exc)
        screening_cache = InMemoryCacheService()
else:
    screening_cache = InMemoryCacheService()
    log.info("[cache_service] REDIS_URL not set — using in-memory cache")

SCREENING_CACHE_TTL_SECONDS = 3600.0  # 1 hour — screening data changes rarely


def screening_cache_key(symbol: str, exchange: str | None) -> str:
    ex = (exchange or "").strip().upper() or "_"
    return f"screen:{symbol.strip().upper()}:{ex}"


def screening_cache_keys_for_symbol(symbol: str, exchange: str | None = None) -> list[str]:
    """
    All screening-related cache keys for a listing (must match routes.py patterns).

    Call invalidate_screening_for_stock after Stock fundamentals change so public
    GET /screen/{symbol} and /screen/{symbol}/multi recompute from the DB row.
    """
    sym = symbol.strip().upper()
    ex = (exchange or "NSE").strip().upper() or "_"
    return [
        screening_cache_key(sym, ex),
        f"multi:{sym}:{ex}",
        f"check:{sym}:{ex}",
    ]


def invalidate_screening_for_stock(symbol: str, exchange: str | None = None) -> None:
    """Drop cached screening payloads for this symbol so the next request recomputes."""
    for key in screening_cache_keys_for_symbol(symbol, exchange):
        screening_cache.delete(key)
